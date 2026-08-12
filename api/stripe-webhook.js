const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || '');

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

  if (endpointSecret && sig) {
    try {
      const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
      console.warn('Advertencia firma Stripe (usando body):', err.message);
      event = req.body;
    }
  }

  if (typeof event === 'string') {
    try {
      event = JSON.parse(event);
    } catch (e) {
      return res.status(400).json({ error: 'Payload JSON inválido' });
    }
  }

  try {
    if (event && (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded')) {
      const session = event.data?.object || {};
      
      const customerEmail = session.customer_details?.email || session.receipt_email;
      const planType = session.metadata?.plan_type || 'individual';
      const maxSubscribers = planType === 'community' ? 50 : 2;

      if (!customerEmail) {
        console.warn('Pago recibido sin correo electrónico detectable.');
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

      if (error) {
        console.error('Error al registrar canal en Supabase:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`✅ Canal creado: ${channel.name} | Token: ${channel.webhook_token}`);

      // 2. Enviar Correo Transaccional con Resend
      if (process.env.RESEND_API_KEY) {
        const webhookUrl = `https://tradenotify-lac.vercel.app/api/webhook?token=${channel.webhook_token}`;
        
        try {
          await resend.emails.send({
            from: 'TradeNotify <onboarding@resend.dev>',
            to: customerEmail,
            subject: '⚡ Tus credenciales de acceso a TradeNotify',
            html: `
              <div style="background-color: #0b0e14; color: #e6edf3; font-family: sans-serif; padding: 30px; border-radius: 10px; max-width: 540px; margin: 0 auto; border: 1px solid #30363d;">
                <h2 style="color: #58a6ff; margin-top: 0;">¡Bienvenido a TradeNotify!</h2>
                <p style="color: #8b949e; font-size: 14px;">Tu suscripción está activa. Aquí tienes tus credenciales para conectar TradingView y recibir alertas instantáneas en tu dispositivo:</p>
                
                <div style="background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #8b949e; font-weight: bold;">Tu Token Privado:</p>
                  <code style="font-family: monospace; color: #3fb950; font-size: 15px; font-weight: bold;">${channel.webhook_token}</code>
                  
                  <div style="margin-top: 14px;">
                    <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #8b949e; font-weight: bold;">URL de Webhook (TradingView):</p>
                    <code style="font-family: monospace; color: #79c0ff; font-size: 12px; word-break: break-all;">${webhookUrl}</code>
                  </div>
                </div>

                <div style="text-align: center; margin-top: 26px;">
                  <a href="https://tradenotify-lac.vercel.app/app" style="background-color: #238636; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">Abrir mi Panel de Alertas</a>
                </div>

                <hr style="border: 0; border-top: 1px solid #30363d; margin: 30px 0 15px 0;">
                <p style="color: #484f58; font-size: 11px; text-align: center;">© 2026 TradeNotify. Soporte de alertas de alta velocidad.</p>
              </div>
            `
          });
          console.log(`✉️ Email de bienvenida enviado a: ${customerEmail}`);
        } catch (emailErr) {
          console.error('Error al enviar el correo con Resend:', emailErr);
        }
      }

      return res.status(200).json({ success: true, channel_id: channel.id });
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Error general en Stripe Webhook:', error);
    return res.status(500).json({ error: error.message });
  }
};