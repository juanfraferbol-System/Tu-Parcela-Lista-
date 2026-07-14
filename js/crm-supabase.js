import {hasValidSupabaseConfig,readSupabaseConfig} from './supabase-client.js';

let crmClient=null;

export function getCrmSupabaseClient(options={}){
 const config=readSupabaseConfig(options.config||{});
 if(!hasValidSupabaseConfig(config))return null;
 if(crmClient)return crmClient;
 const factory=options.createClient||globalThis.supabase?.createClient;
 if(typeof factory!=='function')return null;
 crmClient=factory(config.url,config.anonKey,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'},
  global:{headers:{'X-Client-Info':'tu-parcela-lista-crm-fase-1'}}
 });
 return crmClient;
}

export function resetCrmSupabaseClient(){crmClient=null;}
