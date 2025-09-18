// StudyHackz Background Script
console.log('[StudyHackz] Extension loaded');

// 1x1 transparent PNG icon
const ICON_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAucB9Wm2yC8AAAAASUVORK5CYII=';

function showBadge(text) { if (chrome.action && chrome.action.setBadgeText) { try { chrome.action.setBadgeText({ text }); chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' }); } catch {} } }
function notify(title, message) { showBadge('1'); if (!chrome.notifications) return; try { chrome.notifications.create('', { type: 'basic', iconUrl: ICON_URL, title, message }); } catch (e) { console.log('[StudyHackz] Notification failed:', e.message); } }

async function sha256Hex(str){ const enc=new TextEncoder().encode(str); const buf=await crypto.subtle.digest('SHA-256', enc); const arr=Array.from(new Uint8Array(buf)); return arr.map(b=>b.toString(16).padStart(2,'0')).join(''); }

async function handleMessage(msg) {
  console.log('[StudyHackz] Handle message:', msg);
  if (msg?.type === 'PING') { notify('StudyHackz', 'Hello from extension (PING)'); return { ok: true, ext: 'StudyHackz', version: '1.0.2' }; }
  if (msg?.type === 'TEST_ECHO') {
    try {
      const apiEndpoint = msg.apiEndpoint || 'https://du-north.vercel.app/api';
      const r = await fetch(`${apiEndpoint}/debug/echo?message=from-extension-${Date.now()}`);
      const data = await r.json();
      notify('StudyHackz', 'Echo ok');
      return { ok: true, echo: data };
    } catch (e) {
      notify('StudyHackz', 'Echo failed');
      return { ok: false, error: String(e.message || e) };
    }
  }
  if (msg?.type === 'TEST_FINGERPRINT') {
    const cookies = await chrome.cookies.getAll({ domain: '.instructure.com' });
    const session = cookies.find(c => c.name === '_legacy_normandy_session') || cookies.find(c => c.name === 'canvas_session');
    if (!session) return { ok: false, error: 'No Canvas session cookie found' };
    const hex = await sha256Hex(session.value);
    const fp = hex.slice(0, 12);
    notify('StudyHackz', 'Fingerprint ok');
    return { ok: true, name: session.name, length: session.value.length, sha256_12: fp };
  }
  if (msg?.type === 'SYNC_CANVAS') {
    notify('StudyHackz', 'Starting cookie handoff…');
    const apiEndpoint = msg.apiEndpoint || 'https://du-north.vercel.app/api';
    const token = msg.userToken || (await fetch(`${apiEndpoint}/auth/token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: 'cookie-test' }) }).then(r => r.json()).then(x => x.token).catch(() => null));
    if (!token) { notify('StudyHackz', 'Auth token failed'); return { ok: false, error: 'Could not obtain auth token' }; }
    try { const result = await handoffCanvasCookieToBackend(apiEndpoint, token, msg.baseUrl); notify('StudyHackz', 'Cookie stored successfully'); return { ok: true, ...result }; } catch (e) { notify('StudyHackz', 'Cookie handoff failed'); return { ok: false, error: String(e.message || e) }; }
  }
  return { ok: false, error: 'Unknown message' };
}

chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => { console.log('[StudyHackz] External message:', msg); handleMessage(msg).then(sendResponse).catch(err => sendResponse({ ok: false, error: String(err.message || err) })); return true; });
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => { console.log('[StudyHackz] Internal message:', msg); handleMessage(msg).then(sendResponse).catch(err => sendResponse({ ok: false, error: String(err.message || err) })); return true; });

async function detectCanvasHostFromCookies() {
  const all = await chrome.cookies.getAll({}).catch(() => []);
  const candidates = all.filter(c => (c.domain || '').endsWith('.instructure.com') || (c.domain || '').endsWith('.canvas.edu'));
  const session = candidates.find(c => c.name === 'canvas_session') || candidates.find(c => c.name === '_legacy_normandy_session');
  return session ? (session.domain || '').replace(/^\./, '') : null;
}

async function handoffCanvasCookieToBackend(apiEndpoint, jwtToken, forcedBaseUrl) {
  console.log('[StudyHackz] Handoff start');
  let baseUrl = forcedBaseUrl && /^https?:\/\//.test(forcedBaseUrl) ? forcedBaseUrl : null;
  let baseHost = baseUrl ? new URL(baseUrl).host : null;
  if (!baseHost) {
    baseHost = await detectCanvasHostFromCookies();
  }
  if (!baseHost) throw new Error('No Canvas host provided or detected. Please open your Canvas site and try again.');
  // Gather cookies only for the target host
  let cookies = await chrome.cookies.getAll({ domain: baseHost }).catch(() => []);
  if (!cookies || cookies.length === 0) {
    cookies = await chrome.cookies.getAll({ url: `https://${baseHost}/` }).catch(() => []);
  }
  console.log('[StudyHackz] Cookies for host:', baseHost, cookies.map(c => `${c.name}@${c.domain}`));
  const byName = (n) => cookies.find(c => c.name === n && (c.domain?.replace(/^\./,'') === baseHost));
  const session = byName('canvas_session') || byName('_legacy_normandy_session');
  if (!session) throw new Error(`No Canvas session cookie found for ${baseHost}. Please log into Canvas then try again.`);
  if (!baseUrl) baseUrl = `https://${baseHost}`;
  const resp = await fetch(`${apiEndpoint}/store-session`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` }, body: JSON.stringify({ baseUrl, sessionCookie: session.value, cookieName: session.name, cookieDomain: session.domain?.replace(/^\./,'') || baseHost }) });
  console.log('[StudyHackz] store-session status:', resp.status);
  if (!resp.ok) { const text = await resp.text().catch(() => ''); throw new Error(`store-session ${resp.status}: ${text.slice(0, 200)}`); }
  const data = await resp.json().catch(() => ({}));
  return { message: 'Canvas session stored', baseUrl, detail: data?.message || '' };
}
