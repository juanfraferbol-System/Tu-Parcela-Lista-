import {extractCoordinates,isAllowedGoogleMapsUrl} from './logic.mjs';

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json; charset=utf-8'
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:corsHeaders});

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  try{
    const body=await request.json().catch(()=>({}));
    const originalUrl=String(body?.url||'').trim();
    if(!isAllowedGoogleMapsUrl(originalUrl))return json({ok:false,error:'invalid_google_maps_url'},400);

    const direct=extractCoordinates(originalUrl);
    if(direct)return json({ok:true,coordinates:direct,resolvedUrl:originalUrl});

    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),10000);
    let response:Response;
    try{
      response=await fetch(originalUrl,{
        method:'GET',redirect:'follow',signal:controller.signal,
        headers:{'user-agent':'Mozilla/5.0 (compatible; TuParcelaLista/1.0)','accept':'text/html,application/xhtml+xml'}
      });
    }finally{clearTimeout(timeout);}

    const resolvedUrl=response.url||originalUrl;
    const fromResolvedUrl=extractCoordinates(resolvedUrl);
    if(fromResolvedUrl)return json({ok:true,coordinates:fromResolvedUrl,resolvedUrl});

    const html=(await response.text()).slice(0,1500000);
    const fromHtml=extractCoordinates(html);
    if(fromHtml)return json({ok:true,coordinates:fromHtml,resolvedUrl});

    return json({ok:false,error:'coordinates_not_found',resolvedUrl},422);
  }catch(error){
    const message=error instanceof Error&&error.name==='AbortError'?'timeout':'resolver_failed';
    return json({ok:false,error:message},message==='timeout'?504:500);
  }
});
