export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId, baseUrl, items = {} } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  
  // MVP: no DB, just return success with counts
  let counts = {};
  if (Array.isArray(items.courses)) counts.courses = items.courses.length;
  if (Array.isArray(items.assignments)) counts.assignments = items.assignments.length;
  if (Array.isArray(items.pages)) counts.pages = items.pages.length;
  if (Array.isArray(items.files)) counts.files = items.files.length;
  
  return res.status(200).json({ ok: true, counts });
}


