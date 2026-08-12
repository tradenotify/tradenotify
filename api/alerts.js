const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token no proporcionado' });
  }

  try {
    // 1. Obtener canal
    const { data: channel, error: chErr } = await supabase
      .from('channels')
      .select('id, name, plan_type, is_active')
      .eq('webhook_token', token.trim())
      .single();

    if (chErr || !channel) {
      return res.status(404).json({ error: 'Canal no válido o inactivo' });
    }

    // 2. Obtener las últimas 20 alertas registradas
    const { data: alerts, error: alErr } = await supabase
      .from('alert_logs')
      .select('id, payload, delivered_to, created_at')
      .eq('channel_id', channel.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (alErr) throw alErr;

    return res.status(200).json({
      channel: {
        name: channel.name,
        plan: channel.plan_type,
        isActive: channel.is_active
      },
      alerts: alerts || []
    });

  } catch (error) {
    console.error('Error al obtener alertas:', error);
    return res.status(500).json({ error: 'Error al consultar historial' });
  }
};