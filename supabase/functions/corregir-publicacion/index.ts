import {createClient} from 'npm:@supabase/supabase-js@2';
import {MAX_CORRECTION_PAYLOAD_BYTES,sha256Text,validateCorrectionRequest} from './correction-logic.mjs';

function allowedOrigins(){
 const configured=String(Deno.env.get('TPL_ALLOWED_ORIGINS')||'').split(',').map(value=>value.trim()).filter(Boolean);
 return new Set(['https://parcelalista.cl','https://www.parcelalista.cl','http://127.0.0.1:8765','http://localhost:8765',...configured]);
}
function corsHeaders(origin:string){return {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Max-Age':'86400','Vary':'Origin'};}
function jsonResponse(origin:string,status:number,body:Record<string,unknown>){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders(origin),'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});}
function serverKey(){
 const current=Deno.env.get('SUPABASE_SECRET_KEYS');if(current){try{const keys=JSON.parse(current);const key=keys?.default||Object.values(keys||{})[0];if(typeof key==='string'&&key)return key;}catch{/* Runtime fallback. */}}
 return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
}
function publicKeys(){
 const keys:string[]=[];const current=Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');if(current){try{for(const value of Object.values(JSON.parse(current)||{}))if(typeof value==='string'&&value)keys.push(value);}catch{/* Legacy fallback. */}}
 const legacy=Deno.env.get('SUPABASE_ANON_KEY');if(legacy)keys.push(legacy);return new Set(keys);
}

Deno.serve(async request=>{
 const origin=request.headers.get('origin')||'';
 if(!allowedOrigins().has(origin))return new Response(JSON.stringify({ok:false,error:'Origen no permitido.'}),{status:403,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(request.method==='OPTIONS')return new Response('ok',{headers:corsHeaders(origin)});
 if(request.method!=='POST')return jsonResponse(origin,405,{ok:false,error:'Método no permitido.'});
 const apiKey=request.headers.get('apikey')||'';if(!apiKey||!publicKeys().has(apiKey))return jsonResponse(origin,401,{ok:false,error:'Clave pública no válida.'});
 const declaredLength=Number(request.headers.get('content-length')||0);if(declaredLength>MAX_CORRECTION_PAYLOAD_BYTES)return jsonResponse(origin,413,{ok:false,error:'La corrección supera el límite permitido.'});
 const url=Deno.env.get('SUPABASE_URL')||'',secret=serverKey();if(!url||!secret)return jsonResponse(origin,503,{ok:false,error:'El servicio de correcciones no está configurado.'});
 try{
  const raw=await request.text();if(new TextEncoder().encode(raw).byteLength>MAX_CORRECTION_PAYLOAD_BYTES)throw new Error('correction_payload_too_large');
  const parsed=validateCorrectionRequest(JSON.parse(raw));const tokenHash=await sha256Text(parsed.token);
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const operation=parsed.action==='load'
   ?await admin.rpc('cargar_correccion_publicacion',{p_token_hash:tokenHash})
   :await admin.rpc('reenviar_correccion_publicacion',{p_token_hash:tokenHash,p_cambios:parsed.changes});
  if(operation.error){const message=String(operation.error.message||'');if(/INVALID|EXPIRED|NOT_ALLOWED|STATE/i.test(message))return jsonResponse(origin,403,{ok:false,error:'El acceso de corrección no es válido, expiró o ya fue utilizado.',code:'correction_access_denied'});throw new Error('correction_operation_failed');}
  return jsonResponse(origin,200,{ok:true,data:operation.data});
 }catch(error){
  const code=String((error as Error)?.message||'correction_internal_error');
  const clientError=/payload|action|token|changes/i.test(code);return jsonResponse(origin,clientError?400:502,{ok:false,error:clientError?'La solicitud de corrección no es válida.':'No fue posible procesar la corrección.',code});
 }
});
