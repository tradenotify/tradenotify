// 1. REGISTRAR CANAL (MENTOR O ALUMNO / TRIAL 14 DÍAS)
    if (pathname.includes('/register-channel') && method === 'POST') {
      const { name, role } = req.body;
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
          plan_type: channelRole, // <-- ¡Añadido para cumplir con la restricción de Supabase!
          is_trial: true 
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, token: data.webhook_token, role: channelRole });
    }