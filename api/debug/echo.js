export default async function handler(req, res) {
  try {
    const now = new Date().toISOString();
    const message = req.method === 'POST' ? (req.body?.message || 'hello') : (req.query?.message || 'hello');
    return res.status(200).json({ ok: true, now, message });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
