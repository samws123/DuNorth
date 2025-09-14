import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  
  // Generate token for extension authentication
  const token = jwt.sign({ userId, type: 'extension' }, JWT_SECRET, { expiresIn: '30d' });
  
  return res.status(200).json({ token });
}
