// Minimal in-memory catalog: extend over time or fetch from backend.
const catalog = [
  { name: 'Stanford University', lms: 'canvas', baseUrl: 'https://canvas.stanford.edu' },
  { name: 'Massachusetts Institute of Technology', lms: 'canvas', baseUrl: 'https://canvas.mit.edu' },
  { name: 'UC Berkeley (bCourses)', lms: 'canvas', baseUrl: 'https://bcourses.berkeley.edu' },
  { name: 'UCLA (Bruin Learn)', lms: 'canvas', baseUrl: 'https://bruinlearn.ucla.edu' },
  { name: 'University of Chicago', lms: 'canvas', baseUrl: 'https://canvas.uchicago.edu' },
  { name: 'Yale University', lms: 'canvas', baseUrl: 'https://canvas.yale.edu' },
  { name: 'Columbia University (CourseWorks)', lms: 'canvas', baseUrl: 'https://courseworks.columbia.edu' },
  { name: 'Princeton University', lms: 'canvas', baseUrl: 'https://canvas.princeton.edu' },
  { name: 'University of Pennsylvania', lms: 'canvas', baseUrl: 'https://canvas.upenn.edu' },
  { name: 'University of Michigan', lms: 'canvas', baseUrl: 'https://canvas.umich.edu' },
  { name: 'Penn State', lms: 'canvas', baseUrl: 'https://psu.instructure.com' },
  { name: 'University of Florida', lms: 'canvas', baseUrl: 'https://ufl.instructure.com' },
  { name: 'University of Utah', lms: 'canvas', baseUrl: 'https://utah.instructure.com' }
];

const qEl = document.getElementById('q');
const resEl = document.getElementById('results');
const contBtn = document.getElementById('continue');
const pickedEl = document.getElementById('picked');
let selected = null;

function score(item, query) {
  const q = query.toLowerCase();
  const n = item.name.toLowerCase();
  const idx = n.indexOf(q);
  if (idx === 0) return 3; // prefix match
  if (idx > 0) return 2;   // substring
  // loose tokens
  const tokens = q.split(/\s+/).filter(Boolean);
  let hits = 0; tokens.forEach(t => { if (n.includes(t)) hits++; });
  return hits ? 1 + hits * 0.1 : 0;
}

function search(query) {
  if (!query) return catalog.slice(0, 20);
  return catalog
    .map(it => ({ it, s: score(it, query) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map(x => x.it)
    .slice(0, 20);
}

function render(list) {
  resEl.innerHTML = '';
  list.forEach(item => {
    const div = document.createElement('div');
    div.className = 'item';
    div.setAttribute('role', 'option');
    div.innerHTML = `<div>${escapeHtml(item.name)}</div><span class="pill">${item.baseUrl.replace(/^https?:\/\//,'')}</span>`;
    div.addEventListener('click', () => {
      selected = item;
      pickedEl.textContent = `${item.name} — ${item.baseUrl}`;
      contBtn.disabled = false;
    });
    resEl.appendChild(div);
  });
}

qEl.addEventListener('input', () => {
  selected = null; pickedEl.textContent = ''; contBtn.disabled = true;
  render(search(qEl.value));
});

contBtn.addEventListener('click', async () => {
  if (!selected) return;
  // Persist locally (replace with backend call later)
  localStorage.setItem('dunorth_school', JSON.stringify({
    name: selected.name,
    lms: selected.lms,
    baseUrl: selected.baseUrl,
    updatedAt: Date.now()
  }));
  alert(`Saved ${selected.name}. Base URL: ${selected.baseUrl}`);
});

function escapeHtml(s) { return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }

// initial
render(search(''));


