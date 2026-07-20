/*
  Configuración pública del Publicador TPL.
  La anon key/publishable key de Supabase es una clave pública diseñada para el navegador.
  NUNCA pegues aquí la service_role ni una secret key.
*/
window.TPL_SUPABASE_CONFIG = {
  url: 'https://xhisituwpwnvqubtcvia.supabase.co',
  anonKey: '' // Pega aquí la ANON/PUBLISHABLE KEY pública de Supabase.
};

window.TPL_PUBLICADOR_CONFIG = {
  // Con Supabase configurado arriba, no es necesario definir submissionEndpoint.
};
