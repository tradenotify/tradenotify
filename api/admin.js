const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const adminSecret = req.headers['x-admin-secret'] || req.query.secret;
  if (!adminSecret || (adminSecret !== '1616' && adminSecret !== process.env.ADMIN_SECRET)) {
    return res.status(401).json({ error: 'Acceso no autorizado.' });
  }

  const { method } = req;

  try {
    // 1. GET: Listar todos los canales
    if (method === 'GET' && !req.query.details) {
      const { data: channels, error: chErr } = await supabase
        .from('channels')
        .select(`*, subscribers(id)`)
        .order('created_at', { ascending: false });

      if (chErr) throw chErr;

      const formatted = channels.map(ch => ({
        ...ch,
        current_subscribers: ch.subscribers ? ch.subscribers.length : 0
      }));
      return res.status(200).json({ channels: formatted });
    }

    // 1.5 GET Detalles: Ver pagos de un canal
    if (method === 'GET' && req.query.details === 'true') {
      const channelId = req.query.id;
      const { data: payments, error: pErr } = await supabase
        .from('payments')
        .select('*')
        .eq('channel_id', channelId)
        .order('payment_date', { ascending: false });

      return res.status(200).json({ payments: payments || [] });
    }

    // 2. POST, PATCH, DELETE (Igual que antes)
    if (method === 'POST') {
      const { name, plan_type, max_subscribers } = req.body;
      const { data, error } = await supabase.from('channels').insert({ name, plan_type, max_subscribers }).select().single();
      if (error) throw error;
      return res.status(201).json({ success: true, channel: data });
    }

    if (method === 'PATCH') {
      const { channel_id, is_active } = req.body;
      const { error } = await supabase.from('channels').update({ is_active }).eq('id', channel_id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    if (method === 'DELETE') {
      const { channel_id } = req.body;
      await supabase.from('subscribers').delete().eq('channel_id', channel_id);
      await supabase.from('payments').delete().eq('channel_id', channel_id);
      const { error } = await supabase.from('channels').delete().eq('id', channel_id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};