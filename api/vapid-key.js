module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    publicKey: process.env.VAPID_PUBLIC_KEY || ''
  });
};