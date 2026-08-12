const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:soporte@tradenotify.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const token = req.query.token;
  if (!token) {
    return res.status(400).json({ error: 'Falta el token del canal (?token=...)' });
  }

  try {
    // 1. Validar el canal
    const { data: channel, error: chError } = await supabase
      .from('channels')
      .select('*')
      .eq('webhook_token', token)
      .single();

    if (chError || !channel) {
      return res.status(404).json({ error: 'Canal no encontrado o token inválido' });
    }

    if (!channel.is_active) {
      return res.status(403).json({ error: 'El canal está pausado' });
    }

    // 2. Comprobar si el periodo de prueba expiró
    if (channel.is_trial && channel.trial_ends_at) {
      const now = new Date();
      const expiresAt = new Date(channel.trial_ends_at);
      if (now > expiresAt) {
        return res.status(403).json({ error: 'Tu prueba gratuita de 14 días ha finalizado.' });
      }
    }

    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch (e) {}
    }

    const alertTitle = payload.title || '🚨 TradeNotify Alerta';
    const alertBody = payload.message || (typeof payload === 'object' ? JSON.stringify(payload) : String(payload));

    // 3. Registrar alerta en Supabase con verificación
    const { error: insertError } = await supabase.from('alerts').insert({
      channel_id: channel.id,
      payload: { title: alertTitle, message: alertBody }
    });

    if (insertError) {
      console.error('Error insertando en alerts:', insertError);
    }

    // 4. Obtener suscriptores
    const { data: subscribers, error: subError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('channel_id', channel.id);

    if (subError || !subscribers || subscribers.length === 0) {
      return res.status(200).json({ success: true, count: 0, message: 'Alerta guardada (Sin dispositivos vinculados)' });
    }

    // 5. Enviar Notificación Push
    const notificationPayload = JSON.stringify({
      title: alertTitle,
      body: alertBody,
      data: { url: '/app' }
    });

    const pushPromises = subscribers.map((sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          auth: sub.keys_auth,
          p256dh: sub.keys_p256dh
        }
      };

      return webpush.sendNotification(pushConfig, notificationPayload).catch((err) => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          return supabase.from('subscribers').delete().eq('id', sub.id);
        }
      });
    });

    await Promise.all(pushPromises);
    return res.status(200).json({ success: true, count: subscribers.length });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};