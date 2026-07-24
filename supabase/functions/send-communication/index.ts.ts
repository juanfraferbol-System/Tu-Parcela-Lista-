import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, email, name, data } = await req.json();

    if (!type || !email) {
      throw new Error('Faltan datos requeridos: type o email');
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const secretApiKey = Deno.env.get('TPL_SECRET_API_KEY') ?? 'dev-secret-key-tpl';

    if (!resendApiKey) {
      throw new Error('Faltan credenciales de entorno para Resend');
    }

    // Validar acceso seguro máquina a máquina
    const authHeader = req.headers.get('Authorization') || req.headers.get('x-api-key');
    if (authHeader !== `Bearer ${secretApiKey}` && authHeader !== secretApiKey) {
      return new Response(JSON.stringify({ error: 'Acceso no autorizado. Credencial inválida.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    let subject = '';
    let htmlEmail = '';

    if (type === 'landing_premium') {
      subject = '¡Tu Landing Exclusiva ya está pública!';
      htmlEmail = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h1 style="color: #034f40;">¡Tu propiedad ya tiene Landing Premium! 🚀</h1>
          <p>Hola ${name || 'Cliente'},</p>
          <p>Nos complace informarte que hemos terminado de construir tu Landing exclusiva para el proyecto <strong>${data?.projectName || ''}</strong>.</p>
          <p>Ya está lista para que la compartas en tus redes sociales o directamente por WhatsApp con tus interesados.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="https://www.parcelalista.cl/plataforma/tpl-business/" style="background-color: #034f40; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Ver Landing en Mi Proyecto</a>
          </div>
          <p style="font-size: 14px; color: #555;">Si necesitas ayuda, simplemente responde a este correo.</p>
        </div>
      `;
    } else if (type === 'resumen_mensual') {
      subject = 'Resumen Mensual de Mi Proyecto';
      htmlEmail = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h1 style="color: #034f40;">Tu Resumen Comercial Mensual 📊</h1>
          <p>Hola ${name || 'Cliente'},</p>
          <p>Aquí tienes el rendimiento de tu proyecto <strong>${data?.projectName || ''}</strong> durante el último mes.</p>
          <ul style="font-size: 14px; color: #555; background: #f4f4f4; padding: 15px; border-radius: 6px; list-style: none;">
            <li><strong>Visitas a tu Landing:</strong> ${data?.visitas || 0}</li>
            <li><strong>Interesados (Leads):</strong> ${data?.leads || 0}</li>
          </ul>
          <div style="margin: 30px 0; text-align: center;">
            <a href="https://www.parcelalista.cl/plataforma/tpl-business/" style="background-color: #034f40; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Ver detalle completo</a>
          </div>
        </div>
      `;
    } else {
      throw new Error('Tipo de comunicación no válido');
    }

    const resendReq = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'Tu Parcela Lista <hola@parcelalista.cl>',
        to: email,
        subject: subject,
        html: htmlEmail
      })
    });

    const resendRes = await resendReq.json();

    return new Response(JSON.stringify({ 
      success: true, 
      emailSent: resendRes.id ? true : false,
      resendId: resendRes.id
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
