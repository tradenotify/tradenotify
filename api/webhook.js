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

  const token = req.query.token;
  if (!token) {
    return res.status(400).json({ error: 'Falta el token del canal (?token=...)' });
  }

  try {
    const { data: channel, error: chError } = await supabase
      .from('channels')
      .select('*')
      .eq('webhook_token', token)
      .single();

    if (chError || !channel) {
      return res.status(404).json({ error: 'Canal no encontrado o token inválido' });
    }

    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch (e) {}
    }

    const alertTitle = payload.title || '🚨 TradeNotify Alerta';
    const alertBody = payload.message || (typeof payload === 'object' ? JSON.stringify(payload) : String(payload));

    await supabase.from('alerts').insert({
      channel_id: channel.id,
      payload: { title: alertTitle, message: alertBody }
    });

    const onesignalPayload = {
      app_id: "fbb3e9f0-75f8-49d5-bdad-296daa278ad0",
      included_segments: ["All"],
      headings: { en: alertTitle },
      contents: { en: alertBody },
      url: "https://tradenotify-lac.vercel.app/app"
    };

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": "Key nsjpxewfjuulu7rvygiyjmun6"
      },
      body: JSON.stringify(onesignalPayload)
    });

    const resultText = await response.text();

    return res.status(200).json({ 
      success: response.ok, 
      http_status: response.status,
      onesignal_response: resultText 
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};