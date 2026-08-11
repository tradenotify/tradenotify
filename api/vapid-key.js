export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  return res.status(200).json({
    publicKey: process.env.VAPID_PUBLIC_KEY
  });
}