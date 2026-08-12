const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async (req, res) => {
  const token = req.query.token;
  
  try {
    // 1. Verificar mentor
    const { data: mentor, error } = await supabase
      .from('channels')
      .select('id, role')
      .eq('webhook_token', token)
      .single();

    if (error || mentor.role !== 'mentor') {
      return res.status(403).json({ error: 'Acceso denegado: Solo mentores pueden generar códigos' });
    }

    // 2. Generar código aleatorio (ej: MIG-8X2A)
    const randomCode = 'MIG-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    // 3. Guardar en DB
    const { data, error: insertError } = await supabase
      .from('invitation_codes')
      .insert({ code: randomCode, mentor_id: mentor.id })
      .select()
      .single();

    if (insertError) throw insertError;

    return res.status(200).json({ success: true, code: randomCode });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};