const crypto = require('crypto');

export default async function handler(req, res) {
  // Solo aceptar peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, email, subject, leadId } = req.body;

    // Credenciales Flow
    const apiKey = process.env.FLOW_API_KEY || '4977FF23-EB73-4813-8453-1L69DB7ACE17';
    const secretKey = process.env.FLOW_SECRET_KEY || '68b3b6e656ad70c27c9dbf830a1c27b84903d53f';
    const baseUrl = 'https://www.flow.cl/api'; // O sandbox: https://sandbox.flow.cl/api

    // Parámetros obligatorios
    const params = {
      apiKey: apiKey,
      commerceOrder: leadId || `TPL-${Date.now()}`,
      subject: subject || 'Reserva Tu Parcela Lista',
      currency: 'CLP',
      amount: Math.round(amount),
      email: email,
      paymentMethod: 9, // 9 es Todos los medios de pago
      urlConfirmation: `https://www.parcelalista.cl/api/flow-webhook`,
      urlReturn: req.body.returnUrl || `https://www.parcelalista.cl/index.html?flow=success&id=${leadId}`,
    };

    // Ordenar alfabéticamente por llave y concatenar llave=valor
    const sortedKeys = Object.keys(params).sort();
    let toSign = '';
    sortedKeys.forEach((key) => {
      toSign += key + params[key];
    });

    // Generar firma HMAC SHA256
    const signature = crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');
    params.s = signature;

    // Convertir a URLSearchParams
    const formBody = new URLSearchParams();
    for (const key in params) {
      formBody.append(key, params[key]);
    }

    // Hacer la petición a Flow
    const response = await fetch(`${baseUrl}/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error Flow:", data);
      return res.status(response.status).json({ error: data });
    }

    // Retornar la URL de redirección
    return res.status(200).json({ 
      success: true, 
      redirectUrl: `${data.url}?token=${data.token}`
    });

  } catch (error) {
    console.error("Error interno Flow Create:", error);
    return res.status(500).json({ error: error.message });
  }
}
