const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre del canal es obligatorio' });
  }

  try {
    // Generar un token único y seguro para el nuevo alumno
    const token = 'tn_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const { data, error } = await supabase
      .from('channels')
      .insert({
        name: name.trim(),
        webhook_token: token,
        role: 'student',
        is_trial: true
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ 
      success: true, 
      token: data.webhook_token, 
      message: 'Canal creado con éxito' 
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};