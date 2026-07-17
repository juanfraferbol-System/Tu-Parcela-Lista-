import {createClient} from 'npm:@supabase/supabase-js@2';
import {calculateValuation,materialInput,propertyIdentityInput,stableValue} from './engine.mjs';

const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEGAL_NOTICE='Tasador TPL entrega una estimación comercial referencial basada en los antecedentes disponibles. No corresponde a una tasación bancaria, judicial, tributaria, pericial ni garantiza un precio de venta.';

function allowedOrigins(){
 const configured=String(Deno.env.get('TPL_ALLOWED_ORIGINS')||'').split(',').map(value=>value.trim()).filter(Boolean);
 return new Set(['https://parcelalista.cl','https://www.parcelalista.cl','http://127.0.0.1:8765','http://localhost:8765',...configured]);
}

function corsHeaders(origin:string){return {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Max-Age':'86400','Vary':'Origin'};}
function json(origin:string,status:number,body:Record<string,unknown>){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders(origin),'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}

function serverKey(){
 const current=Deno.env.get('SUPABASE_SECRET_KEYS');
 if(current){try{const keys=JSON.parse(current);const key=keys?.default||Object.values(keys||{})[0];if(typeof key==='string'&&key)return key;}catch{}}
 return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
}

function publicKeys(){
 const values:string[]=[];
 const current=Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
 if(current){try{for(const value of Object.values(JSON.parse(current)||{}))if(typeof value==='string'&&value)values.push(value);}catch{}}
 const legacy=Deno.env.get('SUPABASE_ANON_KEY');if(legacy)values.push(legacy);
 return new Set(values);
}

async function hashHex(value:string){
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
 return [...bytes].map(item=>item.toString(16).padStart(2,'0')).join('');
}

function valuationResponse(row:any){
 return {id:row.id,status:row.estado==='rechazada_datos_insuficientes'?'insufficient':'generated',range:{minimum:row.valor_minimo,quick:row.venta_rapida,market:row.valor_mercado,maximum:row.valor_maximo},pricePerM2:row.precio_m2,difference:row.diferencia_porcentual,position:row.resumen_factores?.position||'sin_decision',confidence:row.confianza,confidenceScore:row.confianza_puntaje,coverage:row.cobertura,comparableCount:row.resumen_factores?.comparableCount||0,strengths:row.resumen_factores?.strengths||[],cautions:row.resumen_factores?.cautions||[],algorithmVersion:row.algoritmo_version,createdAt:row.creada_en,legalNotice:LEGAL_NOTICE,reused:true};
}

Deno.serve(async request=>{
 const origin=request.headers.get('origin')||'';
 if(!allowedOrigins().has(origin))return json(origin,403,{ok:false,error:'Origen no permitido.'});
 if(request.method==='OPTIONS')return new Response('ok',{headers:corsHeaders(origin)});
 if(request.method!=='POST')return json(origin,405,{ok:false,error:'Método no permitido.'});
 const apiKey=request.headers.get('apikey')||'';
 if(!apiKey||!publicKeys().has(apiKey))return json(origin,401,{ok:false,error:'Clave pública no válida.'});
 const url=Deno.env.get('SUPABASE_URL')||'',secret=serverKey();
 if(!url||!secret)return json(origin,503,{ok:false,error:'El Tasador TPL no está configurado en el servidor.'});

 let body:any;
 try{body=await request.json();}catch{return json(origin,400,{ok:false,error:'Solicitud no válida.'});}
 const accessToken=String(body?.accessToken||''),sessionId=String(body?.sessionId||''),idempotencyKey=String(body?.idempotencyKey||'');
 if(!UUID_PATTERN.test(accessToken)||!UUID_PATTERN.test(sessionId))return json(origin,400,{ok:false,error:'La sesión de tasación no es válida.'});
 const accessTokenHash=await hashHex(accessToken),admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});

 let userId:string|null=null;
 const authorization=request.headers.get('authorization')||'',jwt=authorization.replace(/^Bearer\s+/i,'');
 if(jwt&&jwt!==apiKey){const userResult=await admin.auth.getUser(jwt);if(!userResult.error)userId=userResult.data.user?.id||null;}

 const existingByAccess=await admin.from('tasaciones').select('*').eq('access_token_hash',accessTokenHash).maybeSingle();
 if(existingByAccess.data&&body?.action==='decision'){
  const decision=String(body?.decision||''),finalPrice=Number(body?.finalPrice);
  if(!['mantener_original','adoptar_mercado','otro'].includes(decision)||!Number.isFinite(finalPrice)||finalPrice<=0)return json(origin,400,{ok:false,error:'La decisión de precio no es válida.'});
  const updated=await admin.from('tasaciones').update({decision_usuario:decision,precio_final_elegido:Math.round(finalPrice),actualizada_en:new Date().toISOString()}).eq('id',existingByAccess.data.id);
  if(updated.error)return json(origin,502,{ok:false,error:'No fue posible registrar la decisión de precio.'});
  return json(origin,200,{ok:true,saved:true});
 }
 if(existingByAccess.data)return json(origin,200,{ok:true,result:valuationResponse(existingByAccess.data)});
 if(body?.action==='reopen')return json(origin,404,{ok:false,error:'No encontramos una tasación asociada a esta sesión.'});
 if(body?.level&&body.level!=='basica')return json(origin,403,{ok:false,error:'El informe Premium todavía no está habilitado.',code:'premium_not_enabled'});
 if(!UUID_PATTERN.test(idempotencyKey))return json(origin,400,{ok:false,error:'El identificador de la operación no es válido.'});

 const data=body?.data&&typeof body.data==='object'?body.data:{};
 const surface=Number(data.superficie_m2??data.superficie),enteredPrice=Number(data.precio_ingresado??data.precio);
 if(!Number.isFinite(surface)||surface<=0||!String(data.comuna||'').trim()||!Number.isFinite(enteredPrice)||enteredPrice<=0)return json(origin,400,{ok:false,error:'Comuna, superficie y precio son obligatorios para comprobar el valor.'});
 const propertyKey=await hashHex(JSON.stringify(propertyIdentityInput(data))),materialFingerprint=await hashHex(JSON.stringify(materialInput(data)));
 let propertyQuery=admin.from('tasaciones').select('id').eq('propiedad_key',propertyKey).eq('nivel','basica').neq('estado','rechazada_datos_insuficientes').limit(1);
 propertyQuery=userId?propertyQuery.eq('usuario_id',userId):propertyQuery.is('usuario_id',null);
 const propertyExisting=await propertyQuery;
 if(propertyExisting.data?.length)return json(origin,409,{ok:false,error:'Esta propiedad ya utilizó su tasación básica gratuita. Puedes reabrirla desde el mismo borrador o iniciar sesión para recuperar tu historial.',code:'free_valuation_used'});

 const abuseSalt=String(Deno.env.get('TASADOR_ABUSE_SALT')||''),forwarded=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'',userAgent=request.headers.get('user-agent')||'';
 const abuseSignalHash=abuseSalt?await hashHex(`${abuseSalt}:${forwarded}:${userAgent.slice(0,160)}`):null;
 if(abuseSignalHash){
  const since=new Date(Date.now()-3600000).toISOString();
  const recent=await admin.from('consumos_tasador').select('id',{count:'exact',head:true}).eq('abuse_signal_hash',abuseSignalHash).gte('creado_en',since);
  if((recent.count||0)>=8)return json(origin,429,{ok:false,error:'Se alcanzó el límite temporal de consultas. Intenta nuevamente más tarde.'});
 }

 const configuration=await admin.from('configuracion_tasador').select('*').eq('estado','activa').single();
 if(configuration.error||!configuration.data)return json(origin,503,{ok:false,error:'No existe una configuración activa del Tasador TPL.'});
 const publications=await admin.from('publicaciones').select('id,precio_publicacion,superficie_m2,region,comuna,sector,latitud_privada,longitud_privada,acceso,topografia,agua,luz,rol,actualizado_en,creado_en').eq('estado','aprobada').not('precio_publicacion','is',null).not('superficie_m2','is',null);
 if(publications.error)return json(origin,503,{ok:false,error:'No fue posible consultar los antecedentes internos.'});
 const sales=await admin.from('ventas_declaradas').select('id,precio_final,superficie_m2,region,comuna,sector,fecha_venta,nivel_verificacion').eq('permite_uso_agregado',true).in('nivel_verificacion',['declarada','documental','verificada']);
 const publicationRecords=(publications.data||[]).filter((row:any)=>row.id!==data.publicacion_id).map((row:any)=>({...row,precio:row.precio_publicacion,lat:row.latitud_privada,lng:row.longitud_privada,fuente_tipo:'precio_publicado_solicitado',fecha:row.actualizado_en||row.creado_en}));
 const saleRecords=(sales.data||[]).map((row:any)=>({...row,precio:row.precio_final,fuente_tipo:row.nivel_verificacion==='verificada'?'precio_final_verificado':'precio_final_declarado',fecha:row.fecha_venta}));
 const result=calculateValuation(data,[...publicationRecords,...saleRecords],configuration.data.parametros,new Date());
 const status=result.status==='insufficient'?'rechazada_datos_insuficientes':'generada_automaticamente';
 const comparables=result.comparables.map((row:any)=>({publicacion_comparable_id:row.sourceType==='precio_publicado_solicitado'?row.id:null,fuente_tipo:row.sourceType,fuente_id:String(row.id||''),datos_snapshot:{region:row.region,comuna:row.comuna,sector:row.sector,superficie_m2:row.surface,precio:row.price,fecha:row.date},precio_m2:row.priceM2,distancia_km:row.distance,antiguedad_dias:row.days,similitud:row.similarity,peso:row.weight,incluido:true}));
 const factors=result.factors.map((factor:any)=>({codigo:factor.code,valor_entrada:factor.value,peso:factor.weight,efecto:factor.effect,explicacion:factor.explanation,fuente:factor.source}));
 const summary={position:result.position,comparableCount:result.comparableCount,strengths:result.strengths,cautions:result.cautions,legalNotice:LEGAL_NOTICE};
 const payload={usuario_id:userId,publicacion_id:data.publicacion_id||null,sesion_anonima_id:sessionId,access_token_hash:accessTokenHash,propiedad_key:propertyKey,huella_material:materialFingerprint,nivel:'basica',estado:status,datos_entrada:stableValue({...materialInput(data),precio_ingresado:enteredPrice,consentimiento_ubicacion:Boolean(data.consentimiento_ubicacion)}),precio_ingresado:enteredPrice,valor_minimo:result.range.minimum,valor_mercado:result.range.market,valor_maximo:result.range.maximum,venta_rapida:result.range.quick,precio_m2:result.pricePerM2,diferencia_porcentual:result.difference,confianza:result.confidence,confianza_puntaje:result.confidenceScore,cobertura:result.coverage,resumen_factores:summary,algoritmo_version:configuration.data.version,configuracion_id:configuration.data.id};
 const consumption={usuario_id:userId,sesion_anonima_id:sessionId,tipo_uso:'gratuita_propiedad',consumio_unidad:result.status!=='insufficient',abuse_signal_hash:abuseSignalHash,idempotency_key:idempotencyKey};
 const saved=await admin.rpc('registrar_tasacion_mvp',{p_tasacion:payload,p_comparables:comparables,p_factores:factors,p_consumo:consumption});
 if(saved.error){
  if(/duplicate|unique/i.test(saved.error.message||''))return json(origin,409,{ok:false,error:'La tasación ya fue registrada. Reabre el resultado desde el borrador.',code:'valuation_already_exists'});
  return json(origin,502,{ok:false,error:'No fue posible guardar la tasación.'});
 }
 const savedRow=Array.isArray(saved.data)?saved.data[0]:saved.data;
 return json(origin,200,{ok:true,accessToken,result:{id:savedRow?.id,status:result.status,range:result.range,pricePerM2:result.pricePerM2,difference:result.difference,position:result.position,confidence:result.confidence,confidenceScore:result.confidenceScore,coverage:result.coverage,comparableCount:result.comparableCount,strengths:result.strengths,cautions:result.cautions,algorithmVersion:configuration.data.version,createdAt:savedRow?.creada_en,legalNotice:LEGAL_NOTICE,reused:false}});
});
