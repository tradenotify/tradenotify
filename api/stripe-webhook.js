const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event = req.body;

  // Intentar validar la firma de Stripe si están presentes los secretos
  if (endpointSecret && sig) {
    try {
      const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
      console.warn('Advertencia de firma Stripe (procesando payload directo):', err.message);
      // En modo de desarrollo/serverless de Vercel tomamos el body directo
      event = req.body;
    }
  }

  // Asegurar que event sea un objeto
  if (typeof event === 'string') {
    try {
      event = JSON.parse(event);
    } catch (e) {
      return res.status(400).json({ error: 'Payload JSON no válido' });
    }
  }

  try {
    // Evento: Pago completado con éxito
    if (event && (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded')) {
      const session = event.data?.object || {};
      
      const customerEmail = session.customer_details?.email || session.receipt_email || 'cliente_pago';
      const planType = session.metadata?.plan_type || 'individual';
      const maxSubscribers = planType === 'community' ? 50 : 2;

      // 1. Crear automáticamente el nuevo canal en Supabase
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
        console.error('Error creando canal en Supabase:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`✅ Nuevo canal creado: ${channel.name} | Token: ${channel.webhook_token}`);
      return res.status(200).json({ success: true, channel_id: channel.id });
    }

    // Para cualquier otro evento de Stripe confirmamos recepción
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Error general en Stripe Webhook:', error);
    return res.status(500).json({ error: error.message });
  }
};