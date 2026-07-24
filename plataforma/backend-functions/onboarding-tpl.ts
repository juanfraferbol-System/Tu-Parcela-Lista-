import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, name, projectName } = await req.json();

    if (!email || !password) {
      throw new Error('Faltan datos requeridos: email o password');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const secretApiKey = Deno.env.get('TPL_SECRET_API_KEY') ?? 'dev-secret-key-tpl';

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      throw new Error('Faltan credenciales de entorno para Supabase o Resend');
    }

    // Validar acceso seguro máquina a máquina
    const authHeader = req.headers.get('Authorization') || req.headers.get('x-api-key');
    if (authHeader !== `Bearer ${secretApiKey}` && authHeader !== secretApiKey) {
      return new Response(JSON.stringify({ error: 'Acceso no autorizado. Credencial inválida.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Inicializar cliente Supabase Admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Crear el usuario (o ignorar si ya existe)
    let userRecord = null;
    let isNewUser = false;
    
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userFound = existingUser?.users?.find(u => u.email === email);

    if (!userFound) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: name || 'Propietario' }
      });
      if (createError) throw createError;
      userRecord = newUser.user;
      isNewUser = true;
    } else {
      userRecord = userFound;
    }

    // 2. Generar Magic Link para acceso directo a TPL Business
    // Suponiendo que tu app está alojada o la URL base es configurada en Supabase
    // Esto generará un enlace usando la configuración de redirección de Site URL de Supabase Auth
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });
    
    if (linkError) throw linkError;

    // Redirigir siempre a TPL Business
    let magicLinkUrl = linkData.properties.action_link;
    // Forzamos que el Magic Link redirija a /plataforma/tpl-business/
    if (magicLinkUrl.includes('redirect_to=')) {
      magicLinkUrl = magicLinkUrl.replace(/redirect_to=[^&]*/, 'redirect_to=' + encodeURIComponent('https://www.parcelalista.cl/plataforma/tpl-business/'));
    } else {
      magicLinkUrl += `${magicLinkUrl.includes('?') ? '&' : '?'}redirect_to=${encodeURIComponent('https://www.parcelalista.cl/plataforma/tpl-business/')}`;
    }

    // 3. Enviar correo usando Resend
    const htmlEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h1 style="color: #034f40;">¡Felicitaciones por publicar! 🎉</h1>
        <p>Hola ${name || 'Propietario'},</p>
        <p>Tu proyecto <strong>${projectName || 'Inmobiliario'}</strong> ha sido publicado con éxito en Tu Parcela Lista.</p>
        <p>Hemos creado tu <strong>Centro de Negocios</strong> (Mi Proyecto), un espacio exclusivo donde podrás administrar tus interesados, ver reportes y potenciar tu publicación.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${magicLinkUrl}" style="background-color: #034f40; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Entrar a Mi Proyecto</a>
        </div>
        <p style="font-size: 14px; color: #555;">Si prefieres ingresar manualmente, estos son tus datos de acceso provisionales:</p>
        <ul style="font-size: 14px; color: #555; background: #f4f4f4; padding: 15px; border-radius: 6px; list-style: none;">
          <li><strong>Usuario:</strong> ${email}</li>
          <li><strong>Contraseña:</strong> ${isNewUser ? password : 'Ya tienes una contraseña registrada'}</li>
        </ul>
        <p style="font-size: 12px; color: #999; margin-top: 40px;">Tu Parcela Lista - No vendemos herramientas, vendemos tranquilidad.</p>
      </div>
    `;

    const resendReq = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'Tu Parcela Lista <hola@parcelalista.cl>', // Ajustar según dominio verificado en Resend
        to: email,
        subject: '¡Felicitaciones! Tu publicación está lista y tu Centro de Negocios te espera',
        html: htmlEmail
      })
    });

    const resendRes = await resendReq.json();

    return new Response(JSON.stringify({ 
      success: true, 
      user: userRecord.id, 
      isNewUser, 
      emailSent: resendRes.id ? true : false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
