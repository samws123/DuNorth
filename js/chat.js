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
    const EXTENSION_ID = 'elipinieeokobcniibdafjkbifbfencb'; // Clean extension ID
    const response = await new Promise((resolve, reject) => {
      console.log('[DuNorth] Attempting to contact extension:', EXTENSION_ID);
      
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, {
          type: 'SYNC_CANVAS',
          userToken: token,
          apiEndpoint: 'https://du-north.vercel.app/api'
        }, (response) => {
          console.log('[DuNorth] Extension response:', response);
          console.log('[DuNorth] Chrome runtime error:', chrome.runtime.lastError);
          
          if (chrome.runtime.lastError) {
            const errorMsg = `Extension communication failed: ${chrome.runtime.lastError.message}. Extension ID: ${EXTENSION_ID}. Make sure StudyHackz extension is installed and enabled.`;
            console.error('[DuNorth]', errorMsg);
            reject(new Error(errorMsg));
          } else if (!response) {
            const errorMsg = 'Extension returned no response. Check extension console for errors.';
            console.error('[DuNorth]', errorMsg);
            reject(new Error(errorMsg));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        const errorMsg = `Extension messaging error: ${error.message}. Make sure you're on HTTPS and extension is installed.`;
        console.error('[DuNorth]', errorMsg);
        reject(new Error(errorMsg));
      }
    });
    
    if (response?.ok) {
      banner(`✅ Sync complete! ${response.stats?.courses || 0} courses, ${response.stats?.assignments || 0} assignments`);
      refreshBtn.textContent = 'Synced!';
    } else {
      throw new Error(response?.error || 'Extension sync failed');
    }
    
  } catch (error) {
    console.error('[DuNorth] Detailed sync error:', error);
    console.error('[DuNorth] Error stack:', error.stack);
    
    // Show detailed error in chat
    let errorMessage = error.message;
    
    if (error.message.includes('Extension communication failed')) {
      errorMessage = `🔌 ${error.message}`;
    } else if (error.message.includes('Extension returned no response')) {
      errorMessage = `📵 ${error.message}`;
    } else if (error.message.includes('Canvas session')) {
      errorMessage = `🍪 ${error.message}`;
    } else if (error.message.includes('Canvas API')) {
      errorMessage = `🌐 ${error.message}`;
    } else if (error.message.includes('Backend ingest')) {
      errorMessage = `💾 ${error.message}`;
    } else {
      errorMessage = `❌ Sync failed: ${error.message}`;
    }
    
    banner(errorMessage);
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


