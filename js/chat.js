const messages = document.getElementById('messages');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const refreshBtn = document.getElementById('refresh');
const emptyEl = document.getElementById('empty');

sendBtn.addEventListener('click', onSend);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } });

refreshBtn.addEventListener('click', async () => {
  // Placeholder: this will trigger extension sync later.
  banner('Refreshing Canvas (demo)…');
  await sleep(600);
  banner('Canvas sync complete.');
});

// No extension prompts in chat

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

// (extension detection removed from chat)


