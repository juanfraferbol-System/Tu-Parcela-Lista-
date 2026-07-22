import {hasValidSupabaseConfig,readSupabaseConfig} from './supabase-client.js';

let crmClient=globalThis.tplCrmSupabase||globalThis.tplSupabase||null;

export function getCrmSupabaseClient(options={}){
 const config=readSupabaseConfig(options.config||{});
 if(!hasValidSupabaseConfig(config))return null;
 if(globalThis.tplCrmSupabase||globalThis.tplSupabase){
  crmClient=globalThis.tplCrmSupabase||globalThis.tplSupabase;
  return crmClient;
 }
 if(crmClient)return crmClient;
 const factory=options.createClient||globalThis.supabase?.createClient;
 if(typeof factory!=='function')return null;
 crmClient=factory(config.url,config.anonKey,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:'sb-qxavbqhyqaqalpzbhwmh-auth-token'},
  global:{headers:{'X-Client-Info':'tu-parcela-lista-crm-fase-1'}}
 });
 globalThis.tplSupabase=crmClient;
 globalThis.tplCrmSupabase=crmClient;
 return crmClient;
}

export function resetCrmSupabaseClient(){crmClient=null;}
