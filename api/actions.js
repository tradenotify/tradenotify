// 1. REGISTRAR CANAL (MENTOR O ALUMNO / TRIAL 14 DÍAS)
    if (pathname.includes('/register-channel') && method === 'POST') {
      const { name, role } = body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'El nombre del canal es obligatorio' });
      }
      
      // Forzar explícitamente el rol según lo que elija el usuario
      const channelRole = (role === 'mentor') ? 'mentor' : 'student';
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