const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({
        error: 'Faltan las variables SUPABASE_URL o SUPABASE_ANON_KEY en Vercel.'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: 'Formato de datos JSON inválido.' });
      }
    }

    const { channel_token, subscription, device_info } = body || {};

    if (!channel_token || !subscription) {
      return res.status(400).json({ error: 'Falta el token del canal o la suscripción push.' });
    }

    // 1. Validar canal
    const { data: channel, error: channelErr } = await supabase
      .from('channels')
      .select('id, max_subscribers')
      .eq('webhook_token', channel_token.trim())
      .eq('is_active', true)
      .single();

    if (channelErr || !channel) {
      return res.status(404).json({ error: 'Canal no encontrado o inactivo en Supabase.' });
    }

    // 2. Comprobar límite de dispositivos
    const { count, error: countErr } = await supabase
      .from('subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('channel_id', channel.id);

    if (countErr) throw countErr;

    if (count >= (channel.max_subscribers || 1)) {
      return res.status(403).json({ error: 'Límite de dispositivos alcanzado para este canal.' });
    }

    // 3. Registrar suscriptor
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
    return res.status(500).json({ error: error.message || 'Error interno en el servidor' });
  }
};