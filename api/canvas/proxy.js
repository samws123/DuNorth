export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { canvasUrl, endpoint, sessionCookie } = req.body || {};
  
  if (!canvasUrl || !endpoint || !sessionCookie) {
    return res.status(400).json({ error: 'canvasUrl, endpoint, and sessionCookie required' });
  }
  
  try {
    // Proxy the request to Canvas with user's session cookie
    const fullUrl = `${canvasUrl}/api/v1/${endpoint}`;
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': sessionCookie, // Forward user's Canvas session
        'User-Agent': 'Mozilla/5.0 (compatible; StudyHackz/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Canvas API error: ${response.status}`);
    }
    
    const data = await response.json();
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Canvas proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}
