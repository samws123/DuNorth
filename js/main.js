const form = document.getElementById('signup-form');
const submitBtn = document.getElementById('submit');
const linkSignin = document.getElementById('link-signin');
const googleBtn = document.getElementById('btn-google');

googleBtn.addEventListener('click', () => {
  alert('Google SSO coming soon.');
});

linkSignin.addEventListener('click', (e) => {
  e.preventDefault();
  alert('Sign in page coming soon.');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
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
    // Demo only: we just log to console. Replace with POST to your backend.
    console.log('Signup payload', { name, email });
    await new Promise(r => setTimeout(r, 600));
    alert('Account created. Welcome to DuNorth!');
    form.reset();
  } catch (err) {
    alert('Something went wrong. Please try again.');
  } finally {
    submitBtn.disabled = false; submitBtn.textContent = 'Start for free';
  }
});

function value(id) { return document.getElementById(id).value.trim(); }
function setError(id, msg) { const el = document.querySelector(`.error[data-for="${id}"]`); if (el) el.textContent = msg; }
function clearErrors() { document.querySelectorAll('.error').forEach(el => el.textContent = ''); }
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }


