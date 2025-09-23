// Debug do JWT_SECRET no Vercel
import crypto from 'crypto';

export default async function handler(req, res) {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    res.status(500).json({ error: 'JWT_SECRET not found' });
    return;
  }

  res.status(200).json({
    length: secret.length,
    first10: secret.substring(0, 10),
    last10: secret.substring(secret.length - 10),
    type: typeof secret,
    // Hash do secret para comparar
    hash: crypto.createHash('sha256').update(secret).digest('hex').substring(0, 16)
  });
}