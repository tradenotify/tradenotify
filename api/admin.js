const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const adminSecret = req.headers['x-admin-secret'] || req.query.secret;
  if (!adminSecret || (adminSecret !== '1616' && adminSecret !== process.env.ADMIN_SECRET)) {
    return res.status(401).json({ error: 'Acceso no autorizado. Clave incorrecta.' });
  }

  const { method } = req;

  try {
    // 1.5 GET Detalles: Ver pagos de un canal específico
    if (method === 'GET' && req.query.details === 'true') {
      const channelId = req.query.id;
      const { data: payments, error: pErr } = await supabase
        .from('payments')
        .select('*')
        .eq('channel_id', channelId)
        .order('payment_date', { ascending: false });

      if (pErr) throw pErr;
      return res.status(200).json({ payments: payments || [] });
    }

    // 1. GET: Listar todos los canales con conteo de suscriptores
    if (method === 'GET') {
      const { data: channels, error: chErr } = await supabase
        .from('channels')
        .select(`
          id,
          name,
          webhook_token,
          plan_type,
          max_subscribers,
          is_active,
          created_at,
          subscribers (id)
        `)
        .order('created_at', { ascending: false });

      if (chErr) throw chErr;

      const formatted = channels.map(ch => ({
        id: ch.id,
        name: ch.name,
        webhook_token: ch.webhook_token,
        plan_type: ch.plan_type,
        max_subscribers: ch.max_subscribers,
        is_active: ch.is_active,
        created_at: ch.created_at,
        current_subscribers: ch.subscribers ? ch.subscribers.length : 0
      }));

      return res.status(200).json({ channels: formatted });
    }

    // 2. POST: Crear un nuevo canal
    if (method === 'POST') {
      const { name, plan_type, max_subscribers } = req.body || {};

      if (!name) {
        return res.status(400).json({ error: 'El nombre del canal es obligatorio.' });
      }

      const { data, error } = await supabase
        .from('channels')
        .insert({
          name: name.trim(),
          plan_type: plan_type || 'individual',
          max_subscribers: parseInt(max_subscribers) || 1
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ success: true, channel: data });
    }

    // 3. PATCH: Activar / Pausar un canal
    if (method === 'PATCH') {
      const { channel_id, is_active } = req.body || {};

      const { error } = await supabase
        .from('channels')
        .update({ is_active })
        .eq('id', channel_id);

      if (error) throw error;

      return res.status(200).json({ success: true, message: 'Estado actualizado' });
    }

    // 4. DELETE: Eliminar un canal, suscriptores y pagos asociados
    if (method === 'DELETE') {
      const { channel_id } = req.body || {};

      await supabase.from('subscribers').delete().eq('channel_id', channel_id);
      await supabase.from('payments').delete().eq('channel_id', channel_id);
      await supabase.from('alert_logs').delete().eq('channel_id', channel_id);
      const { error } = await supabase.from('channels').delete().eq('id', channel_id);

      if (error) throw error;

      return res.status(200).json({ success: true, message: 'Canal eliminado' });
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (error) {
    console.error('Error Admin API:', error);
    return res.status(500).json({ error: error.message || 'Error en el servidor' });
  }
};