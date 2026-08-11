import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Configurar WebPush con tus claves
webpush.setVapidDetails(
  process.env.VAPID_MAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Conectar con Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Solo permitimos peticiones POST (como las de TradingView)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const { token } = req.query; // URL: /api/webhook?token=xyz...

  if (!token) {
    return res.status(400).json({ error: 'Falta el token del canal' });
  }

  try {
    // 1. Buscar el canal activo asociado a ese token
    const { data: channel, error: channelErr } = await supabase
      .from('channels')
      .select('id, name, is_active')
      .eq('webhook_token', token)
      .single();

    if (channelErr || !channel || !channel.is_active) {
      return res.status(404).json({ error: 'Canal no encontrado o inactivo' });
    }

    const payload = req.body; // El JSON enviado por TradingView

    // 2. Obtener todos los dispositivos suscritos a este canal
    const { data: subscribers, error: subsErr } = await supabase
      .from('subscribers')
      .select('push_subscription')
      .eq('channel_id', channel.id);

    if (subsErr) throw subsErr;

    // 3. Preparar el mensaje que saldrá en la pantalla del móvil
    const notificationPayload = JSON.stringify({
      title: payload.title || `🚨 Alerta: ${channel.name}`,
      body: payload.message || JSON.stringify(payload),
      icon: '/icon.png',
      badge: '/badge.png',
      data: { url: '/' }
    });

    // 4. Enviar notificación push a todos los suscriptores en paralelo
    let sentCount = 0;
    if (subscribers && subscribers.length > 0) {
      const sendPromises = subscribers.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.push_subscription, notificationPayload);
          sentCount++;
        } catch (err) {
          // Si el dispositivo ya no es válido, se ignora
          console.error('Error al enviar a un dispositivo:', err.message);
        }
      });
      await Promise.all(sendPromises);
    }

    // 5. Guardar el registro en alert_logs (Trading Journal)
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
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}