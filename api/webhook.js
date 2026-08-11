const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_MAIL || 'mailto:tradenotify@proton.me',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Falta el token del canal' });
  }

  try {
    const { data: channel, error: channelErr } = await supabase
      .from('channels')
      .select('id, name, is_active')
      .eq('webhook_token', token)
      .single();

    if (channelErr || !channel || !channel.is_active) {
      return res.status(404).json({ error: 'Canal no encontrado o inactivo' });
    }

    const payload = req.body || {};

    const { data: subscribers, error: subsErr } = await supabase
      .from('subscribers')
      .select('push_subscription')
      .eq('channel_id', channel.id);

    if (subsErr) throw subsErr;

    const notificationPayload = JSON.stringify({
      title: payload.title || `🚨 Alerta: ${channel.name}`,
      body: payload.message || (typeof payload === 'string' ? payload : JSON.stringify(payload)),
      icon: '/icon.png',
      badge: '/badge.png',
      data: { url: '/' }
    });

    let sentCount = 0;
    if (subscribers && subscribers.length > 0) {
      const sendPromises = subscribers.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.push_subscription, notificationPayload);
          sentCount++;
        } catch (err) {
          console.error('Error al enviar a un dispositivo:', err.message);
        }
      });
      await Promise.all(sendPromises);
    }

    await supabase.from('alert_logs').insert({
      channel_id: channel.id,
      payload: payload,
      delivered_to: sentCount
    });

    return res.status(200).json({
      success: true,
      delivered_to: sentCount,
      message: 'Alerta procesada correctamente'
    });

  } catch (error) {
    console.error('Error en el servidor:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};