const crypto = require('crypto');

export default async function handler(req, res) {
  // Solo aceptar peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, email, subject, leadId } = req.body;

    const apiKey = process.env.FLOW_API_KEY;
    const secretKey = process.env.FLOW_SECRET_KEY;
    const baseUrl = process.env.FLOW_API_BASE_URL || 'https://www.flow.cl/api';
    const confirmationUrl = process.env.FLOW_CONFIRMATION_URL;
    if (!apiKey || !secretKey || !confirmationUrl) {
      return res.status(503).json({ error: 'La integración de pagos no está habilitada.' });
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || !String(email || '').includes('@') || !String(leadId || '').trim()) {
      return res.status(400).json({ error: 'Los datos del pago no son válidos.' });
    }
    const requestedReturn = String(req.body.returnUrl || '');
    const allowedReturn = /^https:\/\/(www\.)?parcelalista\.cl\//i.test(requestedReturn);
    const returnUrl = allowedReturn ? requestedReturn : 'https://www.parcelalista.cl/';

    // Parámetros obligatorios
    const params = {
      apiKey: apiKey,
      commerceOrder: leadId || `TPL-${Date.now()}`,
      subject: subject || 'Reserva Tu Parcela Lista',
      currency: 'CLP',
      amount: Math.round(amount),
      email: email,
      paymentMethod: 9, // 9 es Todos los medios de pago
      urlConfirmation: confirmationUrl,
      urlReturn: returnUrl,
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
