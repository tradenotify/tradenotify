const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Si tienes configurado el secreto de webhook, verifica la firma
    if (endpointSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = req.body;
    }
  } catch (err) {
    console.error('Error validando webhook de Stripe:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Evento: Pago completado con éxito en Stripe Checkout
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerEmail = session.customer_details?.email || 'Cliente Sin Email';
      const planType = session.metadata?.plan_type || 'individual';
      const maxSubscribers = planType === 'community' ? 50 : 2;

      // 1. Crear automáticamente el canal en Supabase
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name: `Canal de ${customerEmail.split('@')[0]}`,
          plan_type: planType,
          max_subscribers: maxSubscribers,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error creando canal tras pago:', error);
        throw error;
      }

      console.log(`✅ Canal creado con éxito para ${customerEmail}. Token: ${channel.webhook_token}`);
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Error procesando evento Stripe:', error);
    return res.status(500).json({ error: error.message });
  }
};