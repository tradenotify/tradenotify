const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { session_id } = req.query;
  if (!session_id) {
    return res.status(400).json({ error: 'Falta el parámetro session_id' });
  }

  try {
    // 1. Obtener los detalles del pago desde Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada en Stripe' });
    }

    const email = session.customer_details?.email || 'cliente';
    const emailPrefix = email.split('@')[0];

    // 2. Buscar el canal creado en Supabase
    let { data: channel, error } = await supabase
      .from('channels')
      .select('id, name, webhook_token, plan_type, max_subscribers')
      .ilike('name', `%${emailPrefix}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Fallback: Si el webhook de Stripe tardó unos milisegundos y aún no existía, se crea aquí
    if (!channel) {
      const planType = session.metadata?.plan_type || 'individual';
      const maxSubscribers = planType === 'community' ? 50 : 2;

      const { data: newCh, error: createErr } = await supabase
        .from('channels')
        .insert({
          name: `Canal de ${emailPrefix}`,
          plan_type: planType,
          max_subscribers: maxSubscribers,
          is_active: true
        })
        .select()
        .single();

      if (createErr) throw createErr;
      channel = newCh;
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;

    return res.status(200).json({
      customer_email: email,
      channel_name: channel.name,
      webhook_token: channel.webhook_token,
      webhook_url: `${protocol}://${host}/api/webhook?token=${channel.webhook_token}`
    });

  } catch (err) {
    console.error('Error en get-session:', err);
    return res.status(500).json({ error: err.message || 'Error al procesar sesión' });
  }
};