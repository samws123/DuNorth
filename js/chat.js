const messages = document.getElementById('messages');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const refreshBtn = document.getElementById('refresh');
const emptyEl = document.getElementById('empty');

sendBtn.addEventListener('click', onSend);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } });

function bridgeCall(type, payload, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const reqId = Math.random().toString(36).slice(2);
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMsg);
      reject(new Error('Bridge timeout'));
    }, timeoutMs);
    function onMsg(e){
      const d = e.data && e.data.__SHX_RES;
      if (!d || d.reqId !== reqId) return;
      clearTimeout(timer);
      window.removeEventListener('message', onMsg);
      if (d.ok) resolve(d.data); else reject(new Error(d.error || 'Bridge error'));
    }
    window.addEventListener('message', onMsg);
    window.postMessage({ __SHX: { type, payload, reqId } }, '*');
  });
}

refreshBtn.addEventListener('click', async () => {
  const userId = localStorage.getItem('dunorth_user') || 'demo-user';
  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Syncing...';
  
  try {
    banner('🔄 Checking extension connection…');

    const EXTENSION_ID = 'elipinieeokobcniibdafjkbifbfencb';
    // Try direct message first
    let connected = false;
    if (window.chrome && window.chrome.runtime) {
      try {
        await new Promise((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('timeout')), 4000);
          chrome.runtime.sendMessage(EXTENSION_ID, { type: 'PING' }, (res) => {
            clearTimeout(t);
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            if (!res?.ok) return reject(new Error('no response'));
            resolve();
          });
        });
        connected = true;
      } catch {}
    }

    // Fallback to bridge
    if (!connected) {
      await bridgeCall('PING', {});
      connected = true;
    }

    banner('✅ Extension connected. Starting Canvas sync…');

    // Ask extension for a safe cookie fingerprint (proves it can read cookies)
    try {
      let fp;
      if (window.chrome && window.chrome.runtime) {
        fp = await new Promise((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('timeout')), 6000);
          chrome.runtime.sendMessage(EXTENSION_ID, { type: 'TEST_FINGERPRINT' }, (r) => {
            clearTimeout(t);
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            resolve(r);
          });
        });
      }
      if (!fp) {
        fp = await bridgeCall('TEST_FINGERPRINT', {});
      }
      if (fp?.ok) {
        banner(`🔐 Fingerprint: ${fp.name} (len ${fp.length}, sha256 ${fp.sha256_12})`);
      }
    } catch {}

    const tokenResponse = await fetch('/api/auth/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
    const { token } = await tokenResponse.json();

    let res;
    try {
      res = await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), 8000);
        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'SYNC_CANVAS', userToken: token, apiEndpoint: 'https://du-north.vercel.app/api' }, (r) => {
          clearTimeout(t);
          if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
          resolve(r);
        });
      });
    } catch {
      res = await bridgeCall('SYNC_CANVAS', { userToken: token, apiEndpoint: 'https://du-north.vercel.app/api' });
    }

    if (res?.ok) {
      try {
        const imp = await fetch('/api/sync/import-courses', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json());
        if (imp?.ok) banner(`📥 Imported ${imp.imported} courses from ${imp.baseUrl}`);
      } catch {}
      banner('✅ Canvas session stored. Server will sync your data.');
      refreshBtn.textContent = 'Synced!';
    } else {
      throw new Error(res?.error || 'Extension sync failed');
    }
  } catch (err) {
    banner(`❌ ${err.message || 'Sync failed'}`);
    refreshBtn.textContent = 'Sync Failed';
  }
  
  setTimeout(() => { refreshBtn.textContent = 'Refresh Canvas'; refreshBtn.disabled = false; }, 3000);
});

// No extension prompts in chat

function onSend() {
  const text = (input.value || '').trim();
  if (!text) return;
  addMsg('user', text);
  input.value = '';
  (async () => {
    try {
      const userId = localStorage.getItem('dunorth_user') || 'demo-user';
      const r = await fetch('/api/chat/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, message: text }) });
      const data = await r.json();
      if (data?.type === 'list') {
        const lines = (data.items || []).map(it => `• ${it.name} — ${new Date(it.due_at).toLocaleString()}`);
        addMsg('assistant', lines.length ? lines.join('\n') : 'No items found in that window.');
      } else {
        addMsg('assistant', data.text || '');
      }
    } catch (e) { addMsg('assistant', 'Server error.'); }
  })();
}

function addMsg(role, text) { const div = document.createElement('div'); div.className = `msg ${role}`; div.textContent = text; messages.appendChild(div); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); if (emptyEl) emptyEl.remove(); }
function banner(text) { addMsg('assistant', text); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }


