const messages = document.getElementById('messages');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const refreshBtn = document.getElementById('refresh');
const emptyEl = document.getElementById('empty');

sendBtn.addEventListener('click', onSend);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } });

refreshBtn.addEventListener('click', async () => {
  const userId = localStorage.getItem('dunorth_user') || 'demo-user';
  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Syncing...';
  
  try {
    // Get user token for extension authentication
    const tokenResponse = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const { token } = await tokenResponse.json();
    
    banner('🔄 Starting Canvas sync...');
    
    // Send message to extension (need to get actual extension ID after loading)
    const EXTENSION_ID = 'your-extension-id-here'; // Will be updated after loading extension
    const response = await new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, {
          type: 'SYNC_CANVAS',
          userToken: token,
          apiEndpoint: 'https://du-north.vercel.app/api'
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error('Extension not found. Please install the StudyHackz extension first.'));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        reject(new Error('Extension not available. Please install the StudyHackz extension.'));
      }
    });
    
    if (response?.ok) {
      banner(`✅ Sync complete! ${response.stats?.courses || 0} courses, ${response.stats?.assignments || 0} assignments`);
      refreshBtn.textContent = 'Synced!';
    } else {
      throw new Error(response?.error || 'Extension sync failed');
    }
    
  } catch (error) {
    console.error('Sync error:', error);
    if (error.message.includes('Extension')) {
      banner('❌ Extension not installed. Please install the StudyHackz extension first and make sure you have a Canvas tab open.');
    } else {
      banner(`❌ Sync failed: ${error.message}`);
    }
    refreshBtn.textContent = 'Sync Failed';
  }
  
  setTimeout(() => {
    refreshBtn.textContent = 'Refresh Canvas';
    refreshBtn.disabled = false;
  }, 3000);
});

// No extension prompts in chat

function onSend() {
  const text = (input.value || '').trim();
  if (!text) return;
  addMsg('user', text);
  input.value = '';
  // Demo assistant reply; replace with backend LLM call.
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
    } catch (e) {
      addMsg('assistant', 'Server error.');
    }
  })();
}

function addMsg(role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  messages.appendChild(div);
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  if (emptyEl) emptyEl.remove();
}

function banner(text) {
  addMsg('assistant', text);
}

// local rule fallback removed; handled by backend

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

// (extension detection removed from chat)


