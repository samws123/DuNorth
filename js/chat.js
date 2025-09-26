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

// Sidebar elements
const sidebar = getElementById('sidebar');
const sidebarToggle = getElementById('sidebar-toggle');
const mobileSidebarToggle = getElementById('mobile-sidebar-toggle');
const composer = document.querySelector('.composer');

// =============================================================================
// EVENT LISTENERS
// =============================================================================

sendBtn.addEventListener('click', handleSendMessage);
input.addEventListener('keydown', handleInputKeydown);
refreshBtn.addEventListener('click', handleCanvasRefresh);

// Sidebar event listeners
if (sidebarToggle) {
  sidebarToggle.addEventListener('click', toggleSidebar);
}
if (mobileSidebarToggle) {
  mobileSidebarToggle.addEventListener('click', toggleSidebar);
}

// Desktop sidebar toggle in header
const desktopSidebarToggle = getElementById('desktop-sidebar-toggle');
if (desktopSidebarToggle) {
  desktopSidebarToggle.addEventListener('click', toggleSidebar);
}

// Initialize sidebar functionality
initializeSidebar();

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

// =============================================================================
// SIDEBAR FUNCTIONALITY
// =============================================================================

/**
 * Initialize sidebar functionality
 */
function initializeSidebar() {
  // Initialize section toggles
  initializeSectionToggles();
  
  // Initialize navigation items
  initializeNavigation();
  
  // Handle window resize for responsive behavior
  window.addEventListener('resize', handleWindowResize);
  
  // Initialize mobile overlay
  initializeMobileOverlay();
  
  // Set initial header toggle visibility
  updateHeaderToggleVisibility();
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar() {
  if (!sidebar) return;
  
  const isCollapsed = sidebar.classList.contains('collapsed');
  const isMobile = window.innerWidth <= 768;
  
  if (isMobile) {
    // Mobile behavior - use 'open' class
    sidebar.classList.toggle('open');
    toggleMobileOverlay();
  } else {
    // Desktop behavior - use 'collapsed' class
    sidebar.classList.toggle('collapsed');
    
    // Update composer position
    if (composer) {
      composer.classList.toggle('sidebar-collapsed', !isCollapsed);
    }
    
    // Update header toggle button visibility
    updateHeaderToggleVisibility();
  }
}

/**
 * Update header toggle button visibility based on sidebar state
 */
function updateHeaderToggleVisibility() {
  const desktopToggle = document.getElementById('desktop-sidebar-toggle');
  const mainContent = document.querySelector('.main-content');
  const isMobile = window.innerWidth <= 768;
  
  if (desktopToggle && sidebar) {
    const isCollapsed = sidebar.classList.contains('collapsed');
    
    // On desktop: show toggle button only when sidebar is collapsed
    // On mobile: always hide this button (mobile uses different toggle)
    if (!isMobile && isCollapsed) {
      desktopToggle.style.display = 'inline-flex';
    } else {
      desktopToggle.style.display = 'none';
    }
    
    // Update main content class for styling
    if (mainContent) {
      if (isCollapsed) {
        mainContent.classList.remove('sidebar-visible');
      } else {
        mainContent.classList.add('sidebar-visible');
      }
    }
  }
}

/**
 * Initialize section toggle functionality
 */
function initializeSectionToggles() {
  const sectionHeaders = document.querySelectorAll('.section-header');
  
  sectionHeaders.forEach(header => {
    header.addEventListener('click', (e) => {
      // Don't toggle if clicking on add button
      if (e.target.closest('.section-add-btn')) {
        return;
      }
      
      const chevron = header.querySelector('.chevron-right');
      const sectionContent = header.nextElementSibling;
      
      if (chevron && sectionContent) {
        const isExpanded = chevron.classList.contains('expanded');
        
        // Toggle chevron rotation
        chevron.classList.toggle('expanded', !isExpanded);
        
        // Toggle content visibility
        if (isExpanded) {
          sectionContent.style.display = 'none';
        } else {
          sectionContent.style.display = 'block';
        }
      }
    });
  });
}

/**
 * Initialize navigation functionality
 */
function initializeNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // Remove active class from all nav items
      navItems.forEach(nav => nav.classList.remove('active'));
      
      // Add active class to clicked item
      item.classList.add('active');
      
      // Handle navigation based on the item
      const text = item.querySelector('span')?.textContent;
      handleNavigation(text);
    });
  });
  
  // Initialize bottom actions
  const bottomActions = document.querySelectorAll('.bottom-action');
  bottomActions.forEach(action => {
    action.addEventListener('click', () => {
      const text = action.querySelector('span')?.textContent;
      handleBottomAction(text);
    });
  });
}

/**
 * Handle navigation item clicks
 * @param {string} navItem - Navigation item text
 */
function handleNavigation(navItem) {
  switch (navItem) {
    case 'Home':
      displayMessage('assistant', 'Welcome to DuNorth! How can I help you today?');
      break;
    case 'Library':
      displayMessage('assistant', 'Library feature coming soon. You\'ll be able to browse your saved content here.');
      break;
    case 'Search':
      displayMessage('assistant', 'Search feature coming soon. You\'ll be able to search through your chats and documents.');
      break;
    default:
      console.log('Navigation:', navItem);
  }
}

/**
 * Handle bottom action clicks
 * @param {string} action - Action text
 */
function handleBottomAction(action) {
  switch (action) {
    case 'Invite and earn':
      displayMessage('assistant', 'Invite friends to DuNorth and earn rewards! Feature coming soon.');
      break;
    case 'Feedback':
      displayMessage('assistant', 'We\'d love to hear your feedback! Please share your thoughts about DuNorth.');
      break;
    case 'Support':
      displayMessage('assistant', 'Need help? Contact our support team or check our documentation.');
      break;
    default:
      console.log('Bottom action:', action);
  }
}

/**
 * Initialize mobile overlay functionality
 */
function initializeMobileOverlay() {
  // Create overlay element if it doesn't exist
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }
  
  // Close sidebar when clicking overlay
  overlay.addEventListener('click', () => {
    if (sidebar) {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    }
  });
}

/**
 * Toggle mobile overlay
 */
function toggleMobileOverlay() {
  const overlay = document.querySelector('.sidebar-overlay');
  const isOpen = sidebar?.classList.contains('open');
  
  if (overlay) {
    overlay.classList.toggle('active', isOpen);
  }
}

/**
 * Handle window resize for responsive behavior
 */
function handleWindowResize() {
  const isMobile = window.innerWidth <= 768;
  
  if (!isMobile && sidebar) {
    // Remove mobile classes on desktop
    sidebar.classList.remove('open');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }
  
  // Update header toggle visibility on resize
  updateHeaderToggleVisibility();
}

/**
 * Initialize section add button functionality
 */
function initializeSectionAddButtons() {
  const addButtons = document.querySelectorAll('.section-add-btn');
  
  addButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent section toggle
      
      const section = button.closest('.sidebar-section');
      const sectionName = section?.querySelector('.section-header span')?.textContent;
      
      handleSectionAdd(sectionName);
    });
  });
}

/**
 * Handle section add button clicks
 * @param {string} sectionName - Section name
 */
function handleSectionAdd(sectionName) {
  switch (sectionName) {
    case 'Chats':
      displayMessage('assistant', 'Creating a new chat... Feature coming soon!');
      break;
    case 'Folders':
      displayMessage('assistant', 'Creating a new folder... Feature coming soon!');
      break;
    default:
      console.log('Add to section:', sectionName);
  }
}

// Initialize section add buttons
document.addEventListener('DOMContentLoaded', () => {
  initializeSectionAddButtons();
  initializeModernComposer();
  initializeCenteredComposer();
  loadCurrentUser();
  initializeRefreshButton();
});

// =============================================================================
// MODERN COMPOSER FUNCTIONALITY
// =============================================================================

/**
 * Initialize modern composer functionality
 */
function initializeModernComposer() {
  // Initialize dropdown menus
  initializeDropdowns();
  
  // Initialize action buttons
  initializeActionButtons();
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-container')) {
      closeAllDropdowns();
    }
  });
}

/**
 * Initialize dropdown functionality
 */
function initializeDropdowns() {
  // Model dropdown
  const modelDropdown = document.getElementById('model-dropdown');
  const modelMenu = document.getElementById('model-menu');
  const selectedModel = document.getElementById('selected-model');
  
  if (modelDropdown && modelMenu) {
    modelDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown(modelMenu);
    });
    
    // Model selection
    const modelItems = modelMenu.querySelectorAll('.dropdown-item');
    modelItems.forEach(item => {
      item.addEventListener('click', () => {
        const model = item.dataset.model;
        if (selectedModel) {
          selectedModel.textContent = model;
        }
        closeAllDropdowns();
        displayMessage('assistant', `Model changed to: ${model}`);
      });
    });
  }
  
  // Words dropdown
  const wordsDropdown = document.getElementById('words-dropdown');
  const wordsMenu = document.getElementById('words-menu');
  const selectedWords = document.getElementById('selected-words');
  
  if (wordsDropdown && wordsMenu) {
    wordsDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown(wordsMenu);
    });
    
    // Words selection
    const wordsItems = wordsMenu.querySelectorAll('.dropdown-item');
    wordsItems.forEach(item => {
      item.addEventListener('click', () => {
        const words = item.dataset.words;
        if (selectedWords) {
          selectedWords.textContent = words;
        }
        closeAllDropdowns();
        displayMessage('assistant', `Word limit set to: ${words}`);
      });
    });
  }
}

/**
 * Toggle dropdown menu
 * @param {HTMLElement} menu - Dropdown menu element
 */
function toggleDropdown(menu) {
  // Close other dropdowns first
  const allMenus = document.querySelectorAll('.dropdown-menu');
  allMenus.forEach(m => {
    if (m !== menu) {
      m.classList.remove('active');
    }
  });
  
  // Toggle current menu
  menu.classList.toggle('active');
}

/**
 * Close all dropdown menus
 */
function closeAllDropdowns() {
  const allMenus = document.querySelectorAll('.dropdown-menu');
  allMenus.forEach(menu => {
    menu.classList.remove('active');
  });
}

/**
 * Initialize action buttons
 */
function initializeActionButtons() {
  const actionButtons = document.querySelectorAll('.action-btn.icon-btn');
  
  actionButtons.forEach(button => {
    button.addEventListener('click', () => {
      const title = button.getAttribute('title');
      handleActionButton(title);
    });
  });
}

/**
 * Handle action button clicks
 * @param {string} action - Action title
 */
function handleActionButton(action) {
  switch (action) {
    case 'Sort':
      displayMessage('assistant', 'Sort functionality coming soon! This will help organize your content.');
      break;
    case 'Add':
      displayMessage('assistant', 'Add functionality coming soon! This will let you add attachments or references.');
      break;
    case 'Archive':
      displayMessage('assistant', 'Archive functionality coming soon! This will help you save important conversations.');
      break;
    default:
      console.log('Action button:', action);
  }
}

// =============================================================================
// REFRESH CANVAS FUNCTIONALITY
// =============================================================================

/**
 * Initialize refresh canvas button functionality
 */
function initializeRefreshButton() {
  const refreshButton = document.getElementById('refresh');
  
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      moveComposerToBottom();
      // You can add additional refresh functionality here
      console.log('Canvas refreshed - composer moved to bottom');
    });
  }
}

/**
 * Move composer from centered position to bottom
 */
function moveComposerToBottom() {
  const composer = document.querySelector('.modern-composer');
  const mainContent = document.querySelector('.main-content');
  
  if (composer && mainContent) {
    // Add bottom positioning classes
    composer.classList.add('bottom');
    mainContent.classList.add('composer-bottom');
    
    console.log('Composer moved to bottom position');
  }
}

// =============================================================================
// USER MANAGEMENT
// =============================================================================

/**
 * Load and display current user information
 */
async function loadCurrentUser() {
  const userId = getUserId();
  try {
    const response = await fetch('/api/user/current?userId=' + userId);
    if (response.ok) {
      const userData = await response.json();
      updateUserDisplay(userData);
      // Store user data for future use
      sessionStorage.setItem('currentUser', JSON.stringify(userData));
      return;
    }
  } catch (error) {
    console.log('Could not load user data from API:', error);
  }

  // Fallback mechanisms
  try {
    // Try session storage first
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      updateUserDisplay(userData);
      return;
    }

    // Try to get user info from any existing DOM elements or meta tags
    const metaUser = document.querySelector('meta[name="user-name"]');
    if (metaUser) {
      updateUserDisplay({ displayName: metaUser.content });
      return;
    }

    // Last resort: try to extract from current display
    const currentDisplay = document.querySelector('.user-name')?.textContent;
    if (currentDisplay && currentDisplay !== 'User') {
      // Keep the existing display - it might be correct
      console.log('Keeping existing user display:', currentDisplay);
      return;
    }

  } catch (fallbackError) {
    console.log('Fallback user loading failed:', fallbackError);
  }

  // If all else fails, show a generic user
  updateUserDisplay({ displayName: 'User' });
}

/**
 * Update user display in the sidebar
 * @param {Object} userData - User data object
 */
function updateUserDisplay(userData) {
  const userNameElement = document.querySelector('.user-name');
  if (userNameElement && userData) {
    // Display name priority: displayName > name > email > username
    const displayName = userData.displayName || 
                       userData.name || 
                       userData.email || 
                       userData.username || 
                       'User';
    
    userNameElement.textContent = displayName;
  }
}

// =============================================================================
// CENTERED COMPOSER FUNCTIONALITY
// =============================================================================

/**
 * Initialize centered composer for first-time users
 */
function initializeCenteredComposer() {
  const composer = document.querySelector('.modern-composer');
  const mainContent = document.querySelector('.main-content');
  const messagesContainer = document.getElementById('messages');
  const emptyState = document.getElementById('empty');
  
  // Check if there are existing messages, if so, move to bottom immediately
  const existingMessages = messagesContainer.querySelectorAll('.msg');
  if (existingMessages.length > 0) {
    composer.classList.add('bottom');
    mainContent.classList.add('composer-bottom');
    return;
  }
  
  // Listen for the first message send
  const sendButton = document.getElementById('send');
  const inputField = document.getElementById('input');
  
  if (sendButton && inputField) {
    const handleFirstSend = () => {
      // Move composer to bottom after first message
      setTimeout(() => {
        composer.classList.add('bottom');
        mainContent.classList.add('composer-bottom');
      }, 100);
      
      // Remove event listeners after first use
      sendButton.removeEventListener('click', handleFirstSend);
      inputField.removeEventListener('keydown', handleFirstSendKeydown);
    };
    
    const handleFirstSendKeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        handleFirstSend();
      }
    };
    
    sendButton.addEventListener('click', handleFirstSend);
    inputField.addEventListener('keydown', handleFirstSendKeydown);
  }
}
