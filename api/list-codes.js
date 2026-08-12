const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');

module.exports = async (req, res) => {
  const token = req.query.token;
  try {
    const { data: mentor } = await supabase.from('channels').select('id').eq('webhook_token', token).single();
    if (!mentor) return res.status(403).json({ error: 'No autorizado' });

    const { data: codes } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('mentor_id', mentor.id)
      .order('created_at', { ascending: false });

    return res.status(200).json({ codes });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};