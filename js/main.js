/**
 * DuNorth Main Page
 * Handles user registration and authentication
 */

import {
  getElementById,
  getInputValue,
  setFieldError,
  clearAllErrors,
  isValidEmail,
  isValidPassword,
  setUserId,
  handleError,
  createErrorHandler
} from './utils/index.js';

// =============================================================================
// DOM ELEMENTS
// =============================================================================

const form = getElementById('signup-form', true);
const submitBtn = getElementById('submit', true);
const linkSignin = getElementById('link-signin');
const googleBtn = getElementById('btn-google');

// =============================================================================
// EVENT LISTENERS
// =============================================================================

// Initialize event listeners
function initializeEventListeners() {
  if (googleBtn) {
    googleBtn.addEventListener('click', handleGoogleSignIn);
  }
  
  if (linkSignin) {
    linkSignin.addEventListener('click', handleSignInLink);
  }
  
  submitBtn.addEventListener('click', handleFormSubmit);
  form.addEventListener('submit', handleFormSubmit);
}

// =============================================================================
// AUTHENTICATION HANDLERS
// =============================================================================

/**
 * Handle Google sign-in button click
 */
function handleGoogleSignIn() {
  const callbackUrl = encodeURIComponent('/schools/school.html');
  const url = `/api/auth/google-start?callbackUrl=${callbackUrl}`;
  window.location.href = url;
}

/**
 * Handle sign-in link click
 * @param {Event} event - Click event
 */
function handleSignInLink(event) {
  event.preventDefault();
  alert('Sign in page coming soon.');
}

// =============================================================================
// FORM HANDLING
// =============================================================================

/**
 * Handle form submission
 * @param {Event} event - Submit event
 */
async function handleFormSubmit(event) {
  if (event) event.preventDefault();
  
  // Validate form data
  const formData = validateFormData();
  if (!formData) return;
  
  // Set loading state
  setSubmitButtonState(true, 'Creating account…');
  
  try {
    // Register user
    const result = await registerUser(formData);
    
    // Store user ID and redirect
    if (result?.userId) {
      setUserId(result.userId);
      window.location.href = 'schools/school.html';
    }
  } catch (error) {
    handleRegistrationError(error);
  } finally {
    setSubmitButtonState(false, 'Start for free');
  }
}

/**
 * Validate form data
 * @returns {Object|null} Form data if valid, null otherwise
 */
function validateFormData() {
  clearAllErrors();
  
  const name = getInputValue('name');
  const email = getInputValue('email');
  const password = getInputValue('password');
  
  let isValid = true;
  
  // Validate name
  if (!name) {
    setFieldError('name', 'Please enter your name');
    isValid = false;
  }
  
  // Validate email
  if (!isValidEmail(email)) {
    setFieldError('email', 'Please enter a valid email');
    isValid = false;
  }
  
  // Validate password
  if (!isValidPassword(password)) {
    setFieldError('password', 'Password must be at least 8 characters');
    isValid = false;
  }
  
  return isValid ? { name, email, password } : null;
}

/**
 * Register user with backend
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Registration result
 */
async function registerUser(userData) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    if (data?.error === 'email_exists') {
      setFieldError('email', 'That email is already registered');
      return null;
    }
    throw new Error(data?.error || 'Registration failed');
  }
  
  return data;
}

/**
 * Handle registration errors
 * @param {Error} error - Registration error
 */
function handleRegistrationError(error) {
  console.error('Registration failed:', error);
  alert('Something went wrong. Please try again.');
}

/**
 * Set submit button state
 * @param {boolean} disabled - Whether button should be disabled
 * @param {string} text - Button text
 */
function setSubmitButtonState(disabled, text) {
  submitBtn.disabled = disabled;
  submitBtn.textContent = text;
}

// =============================================================================
// UPGRADE MODAL FUNCTIONALITY
// =============================================================================

// Modal elements
const upgradeBtn = getElementById('upgrade-btn');
const modalOverlay = getElementById('upgrade-modal-overlay');
const modalClose = getElementById('modal-close');
const continueCheckout = getElementById('continue-checkout');

/**
 * Initialize upgrade modal functionality
 */
function initializeUpgradeModal() {
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', showUpgradeModal);
  }
  
  if (modalClose) {
    modalClose.addEventListener('click', hideUpgradeModal);
  }
  
  if (modalOverlay) {
    modalOverlay.addEventListener('click', handleModalOverlayClick);
  }
  
  if (continueCheckout) {
    continueCheckout.addEventListener('click', handleUpgradeCheckout);
  }
}

/**
 * Show upgrade modal
 */
function showUpgradeModal() {
  if (modalOverlay) {
    modalOverlay.classList.add('active');
  }
}

/**
 * Hide upgrade modal
 */
function hideUpgradeModal() {
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
  }
}

/**
 * Handle modal overlay click
 * @param {Event} event - Click event
 */
function handleModalOverlayClick(event) {
  if (event.target === modalOverlay) {
    hideUpgradeModal();
  }
}

/**
 * Handle upgrade checkout process
 */
async function handleUpgradeCheckout() {
  try {
    setCheckoutButtonState(true, 'Processing...');
    
    // Get stored token (note: different from chat.js which gets fresh token)
    const token = localStorage.getItem('dunorth_token');
    if (!token) {
      alert('Please sign in to upgrade your account.');
      return;
    }
    
    // Create checkout session
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      alert(`Checkout failed: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    const errorHandler = createErrorHandler('Checkout error');
    errorHandler(error);
    alert(`Checkout error: ${error.message}`);
  } finally {
    setCheckoutButtonState(false, 'Continue to checkout');
  }
}

/**
 * Set checkout button state
 * @param {boolean} disabled - Whether button should be disabled
 * @param {string} text - Button text
 */
function setCheckoutButtonState(disabled, text) {
  if (continueCheckout) {
    continueCheckout.disabled = disabled;
    continueCheckout.textContent = text;
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  initializeUpgradeModal();
});
