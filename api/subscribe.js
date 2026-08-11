import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { channel_token, subscription, device_info } = req.body;

  if (!channel_token || !subscription) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    // 1. Validar que el canal existe y está activo
    const { data: channel, error: channelErr } = await supabase
      .from('channels')
      .select('id, max_subscribers')
      .eq('webhook_token', channel_token)
      .eq('is_active', true)
      .single();

    if (channelErr || !channel) {
      return res.status(404).json({ error: 'Canal no encontrado o inactivo' });
    }

    // 2. Comprobar límite de suscriptores según el plan (1 para individual, 100 para comunidad)
    const { count, error: countErr } = await supabase
      .from('subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('channel_id', channel.id);

    if (countErr) throw countErr;

    if (count >= channel.max_subscribers) {
      return res.status(403).json({ error: 'Límite de dispositivos alcanzado para este plan.' });
    }

    // 3. Guardar el dispositivo
    const { error: insertErr } = await supabase
      .from('subscribers')
      .insert({
        channel_id: channel.id,
        device_info: device_info || 'Dispositivo Web',
        push_subscription: subscription
      });

    if (insertErr) throw insertErr;

    return res.status(200).json({ success: true, message: 'Dispositivo vinculado con éxito' });

  } catch (error) {
    console.error('Error al suscribir:', error);
    return res.status(500).json({ error: 'Error al registrar suscripción' });
  }
}