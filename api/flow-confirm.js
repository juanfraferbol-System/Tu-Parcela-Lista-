const { config, flowRequest } = require('../lib/flow');
const supabase = require('../lib/supabase-admin');

function tokenFrom(req) {
  if (req.body && typeof req.body === 'object') return req.body.token || '';
  return '';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Método no permitido');
  try {
    const token = tokenFrom(req);
    if (!token) return res.status(400).send('Token requerido');
    const cfg = config();
    const status = await flowRequest('/payment/getStatus', 'GET', { apiKey: cfg.apiKey, token });
    await supabase.request('/rest/v1/rpc/tpl_partner_confirmar_pago_flow', {
      method: 'POST',
      body: JSON.stringify({
        p_commerce_order: status.commerceOrder,
        p_flow_order: status.flowOrder || null,
        p_flow_token: token,
        p_estado_flow: Number(status.status || 0),
        p_respuesta: status
      })
    });
    return res.status(200).send('OK');
  } catch (error) {
    console.error('flow-confirm', error);
    return res.status(500).send('ERROR');
  }
};
