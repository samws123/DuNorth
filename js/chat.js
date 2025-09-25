/**
 * DuNorth Chat Interface
 * Handles chat functionality and Canvas synchronization
 */

import { 
  getElementById, 
  appendMessage, 
  getUserId, 
  getUserToken,
  getSavedBaseUrl,
  handleError,
  createErrorHandler
} from './utils/index.js';

import { 
  testExtensionConnection, 
  getExtensionFingerprint, 
  syncCanvasData 
} from './extension-bridge.js';

import { performFullSync } from './canvas-sync.js';

// =============================================================================
// DOM ELEMENTS
// =============================================================================

const messages = getElementById('messages', true);
const input = getElementById('input', true);
const sendBtn = getElementById('send', true);
const refreshBtn = getElementById('refresh', true);
const emptyEl = getElementById('empty');

// =============================================================================
// EVENT LISTENERS
// =============================================================================

sendBtn.addEventListener('click', handleSendMessage);
input.addEventListener('keydown', handleInputKeydown);
refreshBtn.addEventListener('click', handleCanvasRefresh);

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Handle keydown events on input field
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleInputKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSendMessage();
  }
}

// =============================================================================
// CANVAS REFRESH HANDLER
// =============================================================================

/**
 * Handle Canvas refresh button click
 * Performs complete Canvas synchronization
 */
async function handleCanvasRefresh() {
  const userId = getUserId();
  
  // Update button state
  setRefreshButtonState(true, 'Syncing...');
  
  try {
    displayMessage('🔄 Checking extension connection…');
    
    // Test extension connection
    const connected = await testExtensionConnection();
    if (!connected) {
      throw new Error('Extension connection failed');
    }
    
    displayMessage('✅ Extension connected. Starting Canvas sync…');
    
    // Get extension fingerprint for verification
    const fingerprint = await getExtensionFingerprint();
    if (fingerprint?.ok) {
      displayMessage(`🔐 Fingerprint: ${fingerprint.name} (len ${fingerprint.length}, sha256 ${fingerprint.sha256_12})`);
    }
    
    // Get authentication token
    const token = await getUserToken(userId);
    if (!token) {
      throw new Error('Failed to get authentication token');
    }
    
    // Get user's Canvas base URL
    const baseUrl = await getSavedBaseUrl(userId);
    
    // Sync Canvas data via extension
    const syncResult = await syncCanvasData(token, baseUrl);
    if (!syncResult?.ok) {
      throw new Error(syncResult?.error || 'Extension sync failed');
    }
    
    // Perform full data synchronization
    await performFullSync(userId, token, displayMessage);
    
    setRefreshButtonState(false, 'Synced!');
    
  } catch (error) {
    const errorHandler = createErrorHandler('Canvas sync failed', displayMessage);
    errorHandler(error);
    setRefreshButtonState(false, 'Sync Failed');
  }
  
  // Reset button after delay
  setTimeout(() => {
    setRefreshButtonState(false, 'Refresh Canvas');
  }, 3000);
}

/**
 * Set refresh button state
 * @param {boolean} disabled - Whether button should be disabled
 * @param {string} text - Button text
 */
function setRefreshButtonState(disabled, text) {
  refreshBtn.disabled = disabled;
  refreshBtn.textContent = text;
}

// =============================================================================
// CHAT MESSAGE HANDLING
// =============================================================================

/**
 * Handle sending a chat message
 */
function handleSendMessage() {
  const text = (input.value || '').trim();
  if (!text) return;
  
  // Add user message to chat
  displayMessage('user', text);
  input.value = '';
  
  // Send message to API
  sendChatMessage(text);
}

/**
 * Send chat message to API and handle response
 * @param {string} message - Message text
 */
async function sendChatMessage(message) {
  try {
    const userId = getUserId();
    const response = await fetch('/api/chat/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message })
    });
    
    const data = await response.json();
    
    if (data?.type === 'list') {
      // Handle list response (assignments, etc.)
      const lines = (data.items || []).map(item => 
        `• ${item.name} — ${new Date(item.due_at).toLocaleString()}`
      );
      const responseText = lines.length ? lines.join('\n') : 'No items found in that window.';
      displayMessage('assistant', responseText);
    } else {
      // Handle regular text response
      displayMessage('assistant', data.text || '');
    }
  } catch (error) {
    handleError(error, 'Chat message failed');
    displayMessage('assistant', 'Server error.');
  }
}

/**
 * Display message in chat interface
 * Supports two signatures:
 *  - displayMessage(role, text)
 *  - displayMessage(text) // defaults to assistant
 * @param {string} roleOrText - Role or text depending on signature
 * @param {string} [maybeText] - Message text when role is provided
 */
function displayMessage(roleOrText, maybeText) {
  const isSingleArg = typeof maybeText === 'undefined';
  const role = isSingleArg ? 'assistant' : roleOrText;
  const text = isSingleArg ? roleOrText : maybeText;

  appendMessage(messages, role, text);
  
  // Remove empty state if it exists
  if (emptyEl) {
    emptyEl.remove();
  }
}

// Legacy function for backward compatibility
function addMsg(role, text) {
  displayMessage(role, text);
}

// Legacy function for backward compatibility
function banner(text) {
  displayMessage('assistant', text);
}

// =============================================================================
// UPGRADE MODAL FUNCTIONALITY
// =============================================================================

// Modal elements
const upgradeBtn = getElementById('upgrade-btn');
const modalOverlay = getElementById('upgrade-modal-overlay');
const modalClose = getElementById('modal-close');
const continueCheckout = getElementById('continue-checkout');

// Plan selection state
let selectedPlan = 'yearly'; // Default to yearly plan

/**
 * Initialize upgrade modal functionality
 */
function initializeUpgradeModal() {
  // Show modal
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', showUpgradeModal);
  }
  
  // Hide modal
  if (modalClose) {
    modalClose.addEventListener('click', hideUpgradeModal);
  }
  
  // Hide modal on overlay click
  if (modalOverlay) {
    modalOverlay.addEventListener('click', handleOverlayClick);
  }
  
  // Handle checkout
  if (continueCheckout) {
    continueCheckout.addEventListener('click', handleCheckout);
  }
  
  // Initialize plan selection
  initializePlanSelection();
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
 * Handle overlay click to close modal
 * @param {Event} event - Click event
 */
function handleOverlayClick(event) {
  if (event.target === modalOverlay) {
    hideUpgradeModal();
  }
}

/**
 * Initialize plan selection functionality
 */
function initializePlanSelection() {
  document.addEventListener('DOMContentLoaded', () => {
    const planCards = document.querySelectorAll('.plan-card');
    
    planCards.forEach(card => {
      card.addEventListener('click', () => {
        // Remove active class from all cards
        planCards.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked card
        card.classList.add('active');
        
        // Update selected plan
        selectedPlan = card.dataset.plan;
        
        console.log('Selected plan:', selectedPlan);
      });
    });
  });
}

/**
 * Handle checkout process
 */
async function handleCheckout() {
  try {
    displayMessage('assistant', 'Creating checkout session...');
    setCheckoutButtonState(true, 'Processing...');
    
    const userId = getUserId();
    const token = await getUserToken(userId);
    
    if (!token) {
      displayMessage('assistant', 'Please sign in to upgrade your account.');
      return;
    }
    
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan: selectedPlan
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.checkoutUrl) {
      displayMessage('assistant', 'Redirecting to Stripe checkout...');
      window.location.href = data.checkoutUrl;
    } else {
      displayMessage('assistant', `Checkout failed: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    const errorHandler = createErrorHandler('Checkout error', displayMessage);
    errorHandler(error);
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

// Initialize modal functionality
initializeUpgradeModal();
