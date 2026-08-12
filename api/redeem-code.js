const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async (req, res) => {
  const { student_token, code } = req.body;

  try {
    // 1. Obtener datos del alumno
    const { data: student, error: studentError } = await supabase
      .from('channels')
      .select('id')
      .eq('webhook_token', student_token)
      .single();

    if (studentError) return res.status(404).json({ error: 'Alumno no encontrado' });

    // 2. Buscar código válido
    const { data: invite, error: inviteError } = await supabase
      .from('invitation_codes')
      .select('id, mentor_id, is_used')
      .eq('code', code.trim().toUpperCase()) // Añadido trim() y toUpperCase()
      .eq('is_used', false)
      .single();

    if (inviteError || !invite) {
      return res.status(400).json({ error: 'Código inválido o ya utilizado' });
    }

    // 3. Crear relación mentor-alumno
    await supabase.from('mentorships').insert({
      mentor_id: invite.mentor_id,
      student_id: student.id
    });

    // 4. Marcar código como usado
    await supabase.from('invitation_codes')
      .update({ is_used: true })
      .eq('id', invite.id);

    return res.status(200).json({ success: true, message: 'Vinculación exitosa' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};