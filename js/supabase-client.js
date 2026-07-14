const CONFIG_GLOBALS=['TPL_SUPABASE_CONFIG','__TPL_SUPABASE__'];

function readMeta(name){
 if(typeof document==='undefined')return '';
 return document.querySelector(`meta[name="${name}"]`)?.content?.trim()||'';
}

function readProcessEnv(name){
 try{return typeof process!=='undefined'&&process.env?String(process.env[name]||'').trim():'';}catch{return '';}
}

function decodeJwtPayload(key){
 try{
  const part=String(key).split('.')[1];if(!part)return null;
  const normalized=part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'=');
  const raw=typeof atob==='function'?atob(normalized):Buffer.from(normalized,'base64').toString('binary');
  return JSON.parse(decodeURIComponent([...raw].map(char=>`%${char.charCodeAt(0).toString(16).padStart(2,'0')}`).join('')));
 }catch{return null;}
}

export function isServiceRoleKey(key=''){
 const value=String(key).trim();
 if(/service[_-]?role/i.test(value))return true;
 return decodeJwtPayload(value)?.role==='service_role';
}

export function readSupabaseConfig(overrides={}){
 let globalConfig={};
 for(const name of CONFIG_GLOBALS){
  const candidate=globalThis?.[name];
  if(candidate&&typeof candidate==='object'){globalConfig=candidate;break;}
 }
 const env=typeof import.meta!=='undefined'&&import.meta.env?import.meta.env:{};
 return {
  url:String(overrides.url||globalConfig.url||globalConfig.supabaseUrl||env.VITE_SUPABASE_URL||readProcessEnv('TPL_SUPABASE_URL')||readProcessEnv('VITE_SUPABASE_URL')||readMeta('tpl-supabase-url')||'').trim(),
  anonKey:String(overrides.anonKey||globalConfig.anonKey||globalConfig.key||env.VITE_SUPABASE_ANON_KEY||readProcessEnv('TPL_SUPABASE_ANON_KEY')||readProcessEnv('VITE_SUPABASE_ANON_KEY')||readMeta('tpl-supabase-anon-key')||'').trim()
 };
}

export function hasValidSupabaseConfig(config=readSupabaseConfig()){
 if(!config.url||!config.anonKey||isServiceRoleKey(config.anonKey))return false;
 try{
  const url=new URL(config.url);
  return ['http:','https:'].includes(url.protocol)&&config.anonKey.length>=20&&!/^(TU_|YOUR_|REEMPLAZAR|CHANGE_ME)/i.test(config.anonKey);
 }catch{return false;}
}

let cachedClient=null,cachedSignature='';

export function resetSupabaseClient(){cachedClient=null;cachedSignature='';}

export function getSupabaseClient(options={}){
 const config=readSupabaseConfig(options.config||{});
 if(!hasValidSupabaseConfig(config))return null;
 const signature=`${config.url}|${config.anonKey}`;
 if(cachedClient&&cachedSignature===signature)return cachedClient;
 const factory=options.createClient||globalThis?.supabase?.createClient;
 if(typeof factory!=='function')return null;
 cachedClient=factory(config.url,config.anonKey,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  global:{headers:{'X-Client-Info':'tu-parcela-lista-publicar-fase-1'}}
 });
 cachedSignature=signature;
 return cachedClient;
}
