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

  const token = req.query.token;
  if (!token) {
    return res.status(400).json({ error: 'Falta el token del canal' });
  }

  try {
    const { data: channel, error: chError } = await supabase
      .from('channels')
      .select('*')
      .eq('webhook_token', token)
      .single();

    if (chError || !channel) {
      return res.status(404).json({ error: 'Canal no encontrado' });
    }

    let isExpired = false;
    let daysLeft = null;

    if (channel.is_trial && channel.trial_ends_at) {
      const diffMs = new Date(channel.trial_ends_at) - new Date();
      daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      isExpired = diffMs <= 0;
    }

    const { data: alerts, error: alError } = await supabase
      .from('alerts')
      .select('*')
      .eq('channel_id', channel.id)
      .order('created_at', { ascending: false })
      .limit(30);

    return res.status(200).json({
      channel: {
        id: channel.id,
        name: channel.name,
        is_trial: !!channel.is_trial,
        trial_ends_at: channel.trial_ends_at,
        is_expired: isExpired,
        days_left: daysLeft
      },
      alerts: alerts || []
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};