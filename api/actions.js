const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url || '/', `http://${host}`);
    const pathname = url.pathname;
    const method = req.method;

    // Parseo seguro del body (por si llega como string o indefinido)
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    // 1. REGISTRAR CANAL (MENTOR O ALUMNO / TRIAL 14 DÍAS)
    if (pathname.includes('/register-channel') && method === 'POST') {
      const { name, role } = body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'El nombre del canal es obligatorio' });
      }
      
      const channelRole = role === 'mentor' ? 'mentor' : 'student';
      const token = 'tn_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const { data, error } = await supabase
        .from('channels')
        .insert({ 
          name: name.trim(), 
          webhook_token: token, 
          role: channelRole, 
          plan_type: channelRole, 
          is_trial: true 
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(200).json({ success: true, token: data.webhook_token, role: channelRole });
    }

    const token = url.searchParams.get('token') || body?.token;

    // 2. GENERAR CÓDIGO DE INVITACIÓN
    if (pathname.includes('/generate-code')) {
      const { data: mentor, error } = await supabase
        .from('channels')
        .select('id, role')
        .eq('webhook_token', token)
        .single();

      if (error || mentor?.role !== 'mentor') {
        return res.status(403).json({ error: 'Acceso denegado: Solo mentores' });
      }

      const randomCode = 'MIG-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const { error: insertError } = await supabase
        .from('invitation_codes')
        .insert({ code: randomCode, mentor_id: mentor.id });

      if (insertError) {
        return res.status(400).json({ error: insertError.message });
      }
      return res.status(200).json({ success: true, code: randomCode });
    }

    // 3. LISTAR CÓDIGOS DE MENTOR
    if (pathname.includes('/list-codes')) {
      const { data: mentor } = await supabase
        .from('channels')
        .select('id')
        .eq('webhook_token', token)
        .single();

      if (!mentor) return res.status(403).json({ error: 'No autorizado' });

      const { data: codes, error: cError } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('mentor_id', mentor.id)
        .order('created_at', { ascending: false });

      if (cError) {
        return res.status(400).json({ error: cError.message });
      }

      return res.status(200).json({ codes: codes || [] });
    }

    // 4. CANJEAR CÓDIGO DE INVITACIÓN
    if (pathname.includes('/redeem-code') && method === 'POST') {
      const { student_token, code } = body;
      if (!student_token || !code) {
        return res.status(400).json({ error: 'Faltan datos de token o código' });
      }

      const { data: student, error: studentError } = await supabase
        .from('channels')
        .select('id')
        .eq('webhook_token', student_token)
        .single();

      if (studentError || !student) {
        return res.status(404).json({ error: 'Token de alumno no encontrado' });
      }

      const { data: invite, error: inviteError } = await supabase
        .from('invitation_codes')
        .select('id, mentor_id, is_used')
        .eq('code', code.trim().toUpperCase())
        .single();

      if (inviteError || !invite || invite.is_used) {
        return res.status(400).json({ error: 'Código de invitación inválido o ya utilizado' });
      }

      const { error: relError } = await supabase.from('mentorships').insert({
        mentor_id: invite.mentor_id,
        student_id: student.id
      });

      if (relError) {
        return res.status(400).json({ error: relError.message });
      }

      await supabase.from('invitation_codes')
        .update({ is_used: true })
        .eq('id', invite.id);

      return res.status(200).json({ success: true, message: 'Vinculación completada' });
    }

    // 5. GESTIÓN DE ALUMNOS (GET / DELETE)
    if (pathname.includes('/mentor-students')) {
      const { data: mentor, error: mError } = await supabase
        .from('channels')
        .select('id, role')
        .eq('webhook_token', token)
        .single();

      if (mError || !mentor || mentor.role !== 'mentor') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      if (method === 'GET') {
        const { data: relations, error: rError } = await supabase
          .from('mentorships')
          .select('id, created_at, channels:student_id (id, name, webhook_token)')
          .eq('mentor_id', mentor.id);

        if (rError) {
          return res.status(400).json({ error: rError.message });
        }
        return res.status(200).json({ success: true, students: relations || [] });
      }

      if (method === 'DELETE') {
        const { mentorship_id } = body;
        const { error: dError } = await supabase
          .from('mentorships')
          .delete()
          .eq('id', mentorship_id)
          .eq('mentor_id', mentor.id);

        if (dError) {
          return res.status(400).json({ error: dError.message });
        }
        return res.status(200).json({ success: true, message: 'Acceso revocado' });
      }
    }

    return res.status(404).json({ error: 'Endpoint no encontrado' });

  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error interno del servidor' });
  }
};