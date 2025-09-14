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
    // Check if chrome.runtime is available
    if (!window.chrome || !window.chrome.runtime) {
      throw new Error('🚫 Chrome extension APIs not available. Are you on HTTPS? Is this a Chrome browser?');
    }

    const response = await new Promise((resolve, reject) => {
      console.log('[DuNorth] Chrome runtime available:', !!window.chrome.runtime);
      console.log('[DuNorth] Attempting to contact extension:', EXTENSION_ID);
      
      // Set a timeout in case extension doesn't respond at all
      const timeout = setTimeout(() => {
        reject(new Error(`🕐 Extension timeout: No response from extension ${EXTENSION_ID} after 10 seconds. Extension may not be installed or enabled.`));
      }, 10000);
      
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, {
          type: 'SYNC_CANVAS',
          userToken: token,
          apiEndpoint: 'https://du-north.vercel.app/api'
        }, (response) => {
          clearTimeout(timeout);
          console.log('[DuNorth] Extension response:', response);
          console.log('[DuNorth] Chrome runtime error:', chrome.runtime.lastError);
          
          if (chrome.runtime.lastError) {
            const error = chrome.runtime.lastError;
            let errorMsg = `🔌 Extension communication failed: ${error.message}`;
            
            if (error.message.includes('Could not establish connection')) {
              errorMsg += `\n\n🔍 Extension ID: ${EXTENSION_ID}\n📋 Possible fixes:\n• Extension not installed\n• Extension disabled\n• Wrong extension ID\n• Extension crashed`;
            } else if (error.message.includes('Extension context invalidated')) {
              errorMsg += `\n\n🔄 Extension was reloaded. Please refresh this page and try again.`;
            }
            
            console.error('[DuNorth]', errorMsg);
            reject(new Error(errorMsg));
          } else if (!response) {
            const errorMsg = `📵 Extension returned no response. Extension ID: ${EXTENSION_ID}.\n\nCheck extension console:\n1. Go to chrome://extensions/\n2. Find StudyHackz extension\n3. Click "Inspect views: service worker"\n4. Look for errors`;
            console.error('[DuNorth]', errorMsg);
            reject(new Error(errorMsg));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        const errorMsg = `🚨 Extension messaging error: ${error.message}\n\nTroubleshooting:\n• Make sure you're on HTTPS\n• Extension must be installed and enabled\n• Try reloading the extension`;
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


