const crypto = require('node:crypto');
const { config, flowRequest } = require('../lib/flow');
const supabase = require('../lib/supabase-admin');

const PLANES = Object.freeze({ ideal: 29990, empresa: 69990, premium: 120000 });

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  try {
    const { amount, email, subject, leadId, returnUrl } = req.body || {};
    const plan = String(subject || '').trim().split(' ').pop()?.toLowerCase();
    const expected = PLANES[plan];
    if (!expected || Number(amount) !== expected) return res.status(400).json({ error: 'Plan o monto inválido' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''))) return res.status(400).json({ error: 'Correo inválido' });
    if (!/^[0-9a-f-]{36}$/i.test(String(leadId || ''))) return res.status(400).json({ error: 'Postulación inválida' });

    const baseUrl = process.env.PUBLIC_BASE_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const safeReturn = String(returnUrl || '').startsWith(baseUrl) ? returnUrl : `${baseUrl}/pago-exitoso.html?origen=partner`;
    const commerceOrder = `PARTNER-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    await supabase.request('/rest/v1/partner_pagos', {
      method: 'POST',
      body: JSON.stringify({ postulacion_id: leadId, commerce_order: commerceOrder, plan_codigo: plan, monto: expected, correo: String(email).toLowerCase(), estado: 'creado' })
    });

    const cfg = config();
    const flow = await flowRequest('/payment/create', 'POST', {
      apiKey: cfg.apiKey,
      commerceOrder,
      subject: `Plan Partner TPL ${plan}`,
      currency: 'CLP',
      amount: expected,
      email: String(email).toLowerCase(),
      urlConfirmation: `${baseUrl}/api/flow-confirm`,
      urlReturn: safeReturn
    });

    await supabase.request(`/rest/v1/partner_pagos?commerce_order=eq.${encodeURIComponent(commerceOrder)}`, {
      method: 'PATCH',
      body: JSON.stringify({ flow_order: flow.flowOrder || null, flow_token: flow.token, estado: 'pendiente', actualizado_en: new Date().toISOString() })
    });

    return res.status(200).json({ redirectUrl: `${flow.url}?token=${encodeURIComponent(flow.token)}` });
  } catch (error) {
    console.error('flow-create', error);
    return res.status(500).json({ error: error.message || 'No fue posible crear el pago' });
  }
};
