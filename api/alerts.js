const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const token = req.query.token;

  if (!token) {
    return res.status(400).json({ error: 'Token requerido' });
  }

  try {
    // 1. Buscar el canal y seleccionar explícitamente 'role'
    const { data: channel, error: cError } = await supabase
      .from('channels')
      .select('id, name, webhook_token, role, plan_type, is_trial, created_at')
      .eq('webhook_token', token)
      .single();

    if (cError || !channel) {
      return res.status(404).json({ error: 'Canal no encontrado' });
    }

    // 2. Comprobar expiración del trial de 14 días
    let isExpired = false;
    let daysLeft = 0;
    if (channel.is_trial && channel.created_at) {
      const createdAt = new Date(channel.created_at);
      const now = new Date();
      const diffTime = now - createdAt;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      daysLeft = Math.max(0, Math.ceil(14 - diffDays));
      if (diffDays > 14) {
        isExpired = true;
      }
    }

    // 3. Obtener el historial de alertas del canal
    const { data: alerts } = await supabase
      .from('alerts')
      .select('*')
      .eq('channel_id', channel.id)
      .order('created_at', { ascending: false })
      .limit(20);

    return res.status(200).json({
      success: true,
      channel: {
        ...channel,
        is_expired: isExpired,
        days_left: daysLeft
      },
      alerts: alerts || []
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};