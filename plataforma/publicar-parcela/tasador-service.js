import {SUPABASE_ANON_KEY,VALUATION_FUNCTION_URL} from './supabase-config.js';

const uuid=()=>globalThis.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,character=>{const random=Math.random()*16|0,value=character==='x'?random:(random&3|8);return value.toString(16);});

export function createValuationSession(previous={}){
 return {sessionId:previous.sessionId||uuid(),accessToken:previous.accessToken||uuid(),idempotencyKey:previous.idempotencyKey||uuid(),result:previous.result||null,decision:previous.decision||'sin_decision',originalPrice:Number(previous.originalPrice)||null,finalPrice:Number(previous.finalPrice)||null};
}

async function authToken(){
 try{return (await window.tplSupabase?.auth?.getSession?.())?.data?.session?.access_token||SUPABASE_ANON_KEY;}catch{return SUPABASE_ANON_KEY;}
}

export async function runBasicValuation(data,previous={}){
 const session=createValuationSession(previous);
 const response=await fetch(VALUATION_FUNCTION_URL,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${await authToken()}`,'Content-Type':'application/json'},body:JSON.stringify({action:session.result?'reopen':'calculate',level:'basica',sessionId:session.sessionId,accessToken:session.accessToken,idempotencyKey:session.idempotencyKey,data})});
 let payload={};
 try{payload=await response.json();}catch{}
 if(!response.ok||!payload.ok){const error=new Error(payload.error||'No fue posible consultar el Tasador TPL.');error.code=payload.code||'valuation_request_failed';throw error;}
 return {...session,result:payload.result};
}

export async function saveValuationDecision(session,decision,finalPrice){
 if(!session?.sessionId||!session?.accessToken)return false;
 const response=await fetch(VALUATION_FUNCTION_URL,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${await authToken()}`,'Content-Type':'application/json'},body:JSON.stringify({action:'decision',sessionId:session.sessionId,accessToken:session.accessToken,decision,finalPrice})});
 return response.ok;
}

export function valuationPositionLabel(position){
 return {aparentemente_bajo:'El precio ingresado parece bajo frente a los antecedentes disponibles.',competitivo:'El precio ingresado se ve competitivo.',dentro_del_rango:'El precio ingresado se encuentra dentro del rango estimado.',sobre_el_rango:'El precio ingresado está sobre el rango estimado.',informacion_insuficiente:'Todavía no existe información suficiente para una estimación confiable.',sin_precio:'Ingresa un precio para compararlo con el rango.'}[position]||'Resultado referencial disponible.';
}
