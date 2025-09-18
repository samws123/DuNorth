const form = document.getElementById('signup-form');
const submitBtn = document.getElementById('submit');
const linkSignin = document.getElementById('link-signin');
const googleBtn = document.getElementById('btn-google');

googleBtn.addEventListener('click', () => {
  const url = `/api/auth/google-start?callbackUrl=${encodeURIComponent('/schools/school.html')}`;
  window.location.href = url;
});

linkSignin.addEventListener('click', (e) => {
  e.preventDefault();
  alert('Sign in page coming soon.');
});

async function handleSubmit(e) {
  if (e) e.preventDefault();
  clearErrors();
  const name = value('name');
  const email = value('email');
  const password = value('password');
  let ok = true;
  if (!name) { setError('name', 'Please enter your name'); ok = false; }
  if (!validEmail(email)) { setError('email', 'Please enter a valid email'); ok = false; }
  if (!password || password.length < 8) { setError('password', 'Password must be at least 8 characters'); ok = false; }
  if (!ok) return;
  try {
    submitBtn.disabled = true; submitBtn.textContent = 'Creating account…';
    // Create the user in our backend
    const r = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await r.json();
    if (!r.ok) {
      if (data?.error === 'email_exists') { setError('email', 'That email is already registered'); return; }
      throw new Error(data?.error || 'signup_failed');
    }
    // Persist the real UUID for later API calls (chat/extension)
    if (data?.userId) localStorage.setItem('dunorth_user', data.userId);
    // Redirect to school search after signup
    window.location.href = 'schools/school.html';
  } catch (err) {
    alert('Something went wrong. Please try again.');
  } finally {
    submitBtn.disabled = false; submitBtn.textContent = 'Start for free';
  }
}

submitBtn.addEventListener('click', handleSubmit);
form.addEventListener('submit', handleSubmit);

function value(id) { return document.getElementById(id).value.trim(); }
function setError(id, msg) { const el = document.querySelector(`.error[data-for="${id}"]`); if (el) el.textContent = msg; }
function clearErrors() { document.querySelectorAll('.error').forEach(el => el.textContent = ''); }
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }


