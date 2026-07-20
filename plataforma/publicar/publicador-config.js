/*
  Configuración pública del Publicador TPL.
  La anon key/publishable key de Supabase es una clave pública diseñada para el navegador.
  NUNCA pegues aquí la service_role ni una secret key.
*/
window.TPL_SUPABASE_CONFIG = {
  url: 'https://qxavbqhyqaqalpzbhwmh.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YXZicWh5cWFxYWxwemJod21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Nzc4MTIsImV4cCI6MjA5OTU1MzgxMn0.7-z6nCdXzurbVbkWQrL7hylblqj7SFPK8oyndLOeZEA' // Pega aquí la ANON/PUBLISHABLE KEY pública de Supabase.
};

window.TPL_PUBLICADOR_CONFIG = {
  // Con Supabase configurado arriba, no es necesario definir submissionEndpoint.
};
