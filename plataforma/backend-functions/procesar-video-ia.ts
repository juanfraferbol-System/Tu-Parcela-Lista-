import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Esta función se ejecuta cuando MercadoPago confirma un pago.
// Su trabajo es:
// 1. Leer el pago y buscar la Orden en la base de datos (Supabase)
// 2. Tomar el "Prompt Dinámico" y la Foto
// 3. Enviar la petición a la API de la IA (Ej. Replicate o Luma)
// 4. Guardar la URL del video resultante en la Base de Datos

const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN') // Debes configurar este secreto en Supabase
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    const body = await req.json()
    console.log("Recibido evento de pago:", body)

    // Simularemos la llamada a Replicate (Stable Video Diffusion o similar)
    const prompt = body.prompt || "Cinematic video of a house..."
    const imageUrl = body.image_url

    // 1. Llamar a la IA (Ejemplo usando Replicate)
    /*
    const aiResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "3f0457e4619daefa13056beb7105d2f026db97f1f0a2ba89cbbcc0c2ce0c0e77", // Ejemplo modelo SVD
        input: { image: imageUrl, prompt: prompt }
      })
    });
    const aiData = await aiResponse.json();
    */
    
    const mockVideoUrl = "https://tu-parcela-lista.com/video-demo.mp4"

    // 2. Actualizar la base de datos con la URL del video para que aparezca en el CRM
    const dbUpdate = await fetch(`${SUPABASE_URL}/rest/v1/cotizaciones_proyectos?id=eq.${body.cotizacion_id}`, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        video_url: mockVideoUrl,
        video_status: "Completado"
      })
    });

    return new Response(
      JSON.stringify({ success: true, message: "Video en proceso", url: mockVideoUrl }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(String(err?.message ?? err), { status: 500 })
  }
})
