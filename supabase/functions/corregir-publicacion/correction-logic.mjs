export const CORRECTION_TOKEN_PATTERN=/^[0-9a-f]{64}$/;
export const MAX_CORRECTION_PAYLOAD_BYTES=64*1024;

export async function sha256Text(value){
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value))));
 return [...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

export function validateCorrectionRequest(value){
 if(!value||Array.isArray(value)||typeof value!=='object')throw new Error('correction_payload_invalid');
 const action=String(value.action||'');
 const token=String(value.token||'');
 if(!['load','submit'].includes(action))throw new Error('correction_action_invalid');
 if(!CORRECTION_TOKEN_PATTERN.test(token))throw new Error('correction_token_invalid');
 if(action==='submit'&&(!value.changes||Array.isArray(value.changes)||typeof value.changes!=='object'))throw new Error('correction_changes_invalid');
 return {action,token,changes:action==='submit'?value.changes:null};
}
