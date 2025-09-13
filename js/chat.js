const messages = document.getElementById('messages');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const refreshBtn = document.getElementById('refresh');
const bannerEl = document.getElementById('connect');
const emptyEl = document.getElementById('empty');
const installBtn = document.getElementById('install');
const installedBtn = document.getElementById('installed');
const modal = document.getElementById('installModal');
const openListing = document.getElementById('openListing');
const closeModal = document.getElementById('closeModal');

sendBtn.addEventListener('click', onSend);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } });

refreshBtn.addEventListener('click', async () => {
  // Placeholder: this will trigger extension sync later.
  banner('Refreshing Canvas (demo)…');
  await sleep(600);
  banner('Canvas sync complete.');
});

// On load: detect extension handshake and show banner if missing
window.addEventListener('DOMContentLoaded', async () => {
  const hasExt = await detectExtension();
  bannerEl.style.display = hasExt ? 'none' : 'flex';
});

installBtn?.addEventListener('click', () => {
  showModal(true);
});

installedBtn?.addEventListener('click', async () => {
  const hasExt = await detectExtension(800);
  bannerEl.style.display = hasExt ? 'none' : 'flex';
});

openListing?.setAttribute('href', 'https://chrome.google.com/webstore');
closeModal?.addEventListener('click', () => showModal(false));

function onSend() {
  const text = (input.value || '').trim();
  if (!text) return;
  addMsg('user', text);
  input.value = '';
  // Demo assistant reply; replace with backend LLM call.
  setTimeout(async () => {
    const school = JSON.parse(localStorage.getItem('dunorth_school') || '{}');
    const reply = planAnswer(text, school);
    addMsg('assistant', reply);
  }, 200);
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

function planAnswer(q, school) {
  const lower = q.toLowerCase();
  if (lower.includes('what') && lower.includes('due') && (lower.includes('week') || lower.includes('today'))) {
    return 'I will check your Canvas assignments for the requested window and list due dates. (Demo)';
  }
  if (lower.includes('refresh')) {
    return `I will sync from ${school.baseUrl || 'your Canvas'} and update my index. (Demo)`;
  }
  if (lower.includes('paper')) {
    return 'I can help outline and draft—share the prompt and sources. (Demo)';
  }
  return 'Got it. Let me look through your synced pages and files. (Demo)';
}

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function showModal(show){ if (!modal) return; modal.style.display = show ? 'flex' : 'none'; }

// Simple extension detection via postMessage handshake
function detectExtension(timeout = 400) {
  return new Promise((resolve) => {
    let done = false;
    function onMsg(ev){
      if (ev && ev.data && ev.data.dunorth_ext === 'pong') { done = true; cleanup(); resolve(true); }
    }
    function cleanup(){ window.removeEventListener('message', onMsg); }
    window.addEventListener('message', onMsg);
    window.postMessage({ dunorth_page: 'ping' }, '*');
    setTimeout(() => { if (!done) { cleanup(); resolve(false); } }, timeout);
  });
}


