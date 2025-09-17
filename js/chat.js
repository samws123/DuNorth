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
        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'SYNC_CANVAS', userToken: token, apiEndpoint: 'https://du-north.vercel.app/api', baseUrl: 'https://princeton.instructure.com' }, (r) => {
          clearTimeout(t);
          if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
          resolve(r);
        });
      });
    } catch {
      res = await bridgeCall('SYNC_CANVAS', { userToken: token, apiEndpoint: 'https://du-north.vercel.app/api', baseUrl: 'https://princeton.instructure.com' });
    }

    if (res?.ok) {
      // Skip noisy server-auth bubble; course import below proves cookie works
      try {
        const resp = await fetch('/api/sync/import-courses', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        const imp = await resp.json();
        if (resp.ok && imp?.ok) {
          banner(`📥 Imported ${imp.imported} courses from ${imp.baseUrl}`);
          // Auto-sync and extract for all courses
          try {
            const listR = await fetch(`/api/debug/courses-db?userId=${encodeURIComponent(userId)}`);
            const list = await listR.json();
            const courses = Array.isArray(list?.courses) ? list.courses : [];
            for (const c of courses) {
              banner(`⏳ Syncing course ${c.id}…`);
              try {
                const sR = await fetch('/api/sync/course', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ courseId: c.id }) });
                const sJ = await sR.json();
                if (sR.ok && sJ?.ok) {
                  banner(`✅ Synced ${c.id}: ${sJ.counts?.pages || 0} pages, ${sJ.counts?.files || 0} files`);
                } else {
                  banner(`❌ Sync ${c.id} failed: ${sJ?.error || sR.status}`);
                }
              } catch(e) { banner(`❌ Sync ${c.id} error: ${e.message}`); }
              // Extract text for the course files (multi-format)
              try {
                const eR = await fetch('/api/sync/extract-all', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ courseId: c.id, limit: 200, force: false }) });
                const eJ = await eR.json();
                if (eR.ok && eJ?.ok) {
                  banner(`🧠 Extracted ${eJ.stored} texts in course ${c.id} (processed ${eJ.processed}).`);
                } else {
                  banner(`❌ Extract ${c.id} failed: ${eJ?.error || eR.status}`);
                }
              } catch(e) { banner(`❌ Extract ${c.id} error: ${e.message}`); }
            }
          } catch (e) {
            banner(`⚠️ Could not auto-extract for all courses: ${e.message}`);
          }
        } else {
          banner(`❌ Import failed: ${imp?.error || resp.status}`);
        }
      } catch (e) {
        banner(`❌ Import failed: ${e.message || 'network error'}`);
      }
      // Hardcoded test: sync a specific course and report counts
      try {
        const testCourseId = 20031; // HIS400-S03_F2025 (Princeton)
        const syncR = await fetch('/api/sync/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ courseId: testCourseId })
        });
        const syncJ = await syncR.json();
        if (syncR.ok && syncJ?.ok) {
          const c = syncJ.counts || {};
          banner(`✅ Synced course ${testCourseId}: ${c.pages || 0} pages, ${c.files || 0} files, ${c.announcements || 0} announcements.`);
        } else {
          banner(`❌ Course sync failed: ${syncJ?.error || syncR.status}`);
        }
      } catch (e) {
        banner(`❌ Course sync failed: ${e.message || 'network error'}`);
      }
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


