const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || '');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY // IMPORTANTE: Usa la Service Role Key para tener permisos de escritura
);

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_WEBHOOK_SECRET;

  let event = req.body;

  if (endpointSecret && sig) {
    try {
      const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
      console.warn('Advertencia firma Stripe:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  try {
    if (event && (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded')) {
      const session = event.data?.object || {};
      
      const customerEmail = session.customer_details?.email || session.receipt_email;
      const planType = session.metadata?.plan_type || 'individual';
      const maxSubscribers = planType === 'community' ? 50 : 2;
      const amount = session.amount_total / 100; // Stripe devuelve centavos

      if (!customerEmail) {
        return res.status(200).json({ received: true });
      }

      const emailPrefix = customerEmail.split('@')[0];

      // 1. Crear el canal en Supabase
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name: `Canal de ${emailPrefix}`,
          plan_type: planType,
          max_subscribers: maxSubscribers,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // 2. REGISTRO DEL PAGO (Lo que une este webhook con tu panel de Admin)
      await supabase.from('payments').insert({
        channel_id: channel.id,
        amount: amount,
        stripe_session_id: session.id
      });

      console.log(`✅ Canal creado: ${channel.name} | Pago: ${amount}€`);

      // 3. Enviar Correo Transaccional
      if (process.env.RESEND_API_KEY) {
        const webhookUrl = `https://tradenotify-lac.vercel.app/api/webhook?token=${channel.webhook_token}`;
        
        await resend.emails.send({
          from: 'TradeNotify <onboarding@resend.dev>',
          to: customerEmail,
          subject: '⚡ Tus credenciales de acceso a TradeNotify',
          html: `
            <div style="background-color: #0b0e14; color: #e6edf3; padding: 30px; border-radius: 10px;">
              <h2>¡Bienvenido a TradeNotify!</h2>
              <p>Tu suscripción está activa.</p>
              <div style="background: #161b22; padding: 15px; border-radius: 8px;">
                <p>Token: <b>${channel.webhook_token}</b></p>
                <p>URL Webhook: <code>${webhookUrl}</code></p>
              </div>
            </div>
          `
        });
      }

      return res.status(200).json({ success: true, channel_id: channel.id });
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Error general en Stripe Webhook:', error);
    return res.status(500).json({ error: error.message });
  }
};