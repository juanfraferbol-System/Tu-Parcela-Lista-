const crypto = require('crypto');

export default async function handler(req, res) {
  // Flow.cl webhook envía un POST con "token" codificado
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;
    if (!token) return res.status(400).send('Token missing');

    const apiKey = process.env.FLOW_API_KEY;
    const secretKey = process.env.FLOW_SECRET_KEY;
    const baseUrl = process.env.FLOW_API_BASE_URL || 'https://www.flow.cl/api';
    if (!apiKey || !secretKey) return res.status(503).send('Payment integration disabled');

    // Para confirmar el pago, debemos consultar el status en Flow usando el token
    const toSign = 'apiKey' + apiKey + 'token' + token;
    const signature = crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');

    const formBody = new URLSearchParams();
    formBody.append('apiKey', apiKey);
    formBody.append('token', token);
    formBody.append('s', signature);

    const statusRes = await fetch(`${baseUrl}/payment/getStatus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString()
    });

    const statusData = await statusRes.json();
    
    if (statusData.status === 2) {
      console.log(`Pago confirmado sin beneficios automáticos para la orden: ${statusData.commerceOrder}`);
    }

    return res.status(200).send('OK');

  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).send('Webhook error');
  }
}
