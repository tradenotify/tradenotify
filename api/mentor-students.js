const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const token = req.query.token || req.body.token;

  if (!token) {
    return res.status(400).json({ error: 'Token de mentor requerido' });
  }

  try {
    // 1. Validar que el token pertenece a un mentor
    const { data: mentor, error: mError } = await supabase
      .from('channels')
      .select('id, role')
      .eq('webhook_token', token)
      .single();

    if (mError || !mentor || mentor.role !== 'mentor') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // 2. LISTAR alumnos (GET)
    if (req.method === 'GET') {
      const { data: relations, error: rError } = await supabase
        .from('mentorships')
        .select('id, created_at, channels:student_id (id, name, webhook_token)')
        .eq('mentor_id', mentor.id);

      if (rError) throw rError;
      return res.status(200).json({ success: true, students: relations });
    }

    // 3. REVOCAR acceso a un alumno (DELETE)
    if (req.method === 'DELETE') {
      const { mentorship_id } = req.body;

      const { error: dError } = await supabase
        .from('mentorships')
        .delete()
        .eq('id', mentorship_id)
        .eq('mentor_id', mentor.id);

      if (dError) throw dError;
      return res.status(200).json({ success: true, message: 'Acceso revocado correctamente' });
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};