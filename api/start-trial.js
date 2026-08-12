const { createClient } = require('@supabase/supabase-js');
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

  const { email } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Por favor, introduce un correo electrónico válido.' });
  }

  try {
    const emailPrefix = email.split('@')[0];
    // 14 días a partir de ahora
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    // Crear canal de prueba
    const { data: channel, error } = await supabase
      .from('channels')
      .insert({
        name: `Prueba de ${emailPrefix}`,
        plan_type: 'individual',
        max_subscribers: 2,
        is_active: true,
        is_trial: true,
        trial_ends_at: trialEndsAt
      })
      .select()
      .single();

    if (error) {
      console.error('Error al crear canal de prueba:', error);
      return res.status(500).json({ error: error.message });
    }

    const webhookUrl = `https://tradenotify-lac.vercel.app/api/webhook?token=${channel.webhook_token}`;

    // Enviar email de bienvenida al trial
    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: 'TradeNotify <onboarding@resend.dev>',
          to: email,
          subject: '⚡ Tus 14 días de prueba en TradeNotify han comenzado',
          html: `
            <div style="background-color: #070913; color: #f8fafc; font-family: sans-serif; padding: 30px; border-radius: 12px; max-width: 520px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
              <h2 style="color: #818cf8; margin-top: 0;">¡Bienvenido a tu prueba de 14 días!</h2>
              <p style="color: #94a3b8; font-size: 14px;">Ya puedes disfrutar de alertas con latencia cero en tu iPhone y PC sin restricciones.</p>
              
              <div style="background-color: #121826; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: bold;">Tu Token Privado:</p>
                <code style="font-family: monospace; color: #34d399; font-size: 15px; font-weight: bold;">${channel.webhook_token}</code>
                
                <div style="margin-top: 14px;">
                  <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: bold;">URL de Webhook (TradingView):</p>
                  <code style="font-family: monospace; color: #93c5fd; font-size: 12px; word-break: break-all;">${webhookUrl}</code>
                </div>
              </div>

              <div style="text-align: center; margin-top: 26px;">
                <a href="https://tradenotify-lac.vercel.app/app" style="background: linear-gradient(135deg, #6366f1, #a855f7); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">Abrir mi Panel de Alertas</a>
              </div>
            </div>
          `
        });
      } catch (mailErr) {
        console.error('Error al enviar email trial:', mailErr);
      }
    }

    return res.status(200).json({
      success: true,
      token: channel.webhook_token,
      trial_ends_at: trialEndsAt
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};