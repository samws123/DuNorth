/**
 * DOM Utility Functions
 * Helper functions for DOM manipulation and interaction
 */

/**
 * Safely get element by ID with optional error handling
 * @param {string} id - Element ID
 * @param {boolean} required - Whether element is required (throws if not found)
 * @returns {HTMLElement|null} The element or null
 */
export function getElementById(id, required = false) {
  const element = document.getElementById(id);
  if (required && !element) {
    throw new Error(`Required element with ID '${id}' not found`);
  }
  return element;
}

/**
 * Get trimmed value from input element
 * @param {string} id - Input element ID
 * @returns {string} Trimmed value
 */
export function getInputValue(id) {
  const element = getElementById(id);
  return element ? element.value.trim() : '';
}

/**
 * Set error message for form field
 * @param {string} fieldId - Field ID
 * @param {string} message - Error message
 */
export function setFieldError(fieldId, message) {
  const errorElement = document.querySelector(`.error[data-for="${fieldId}"]`);
  if (errorElement) {
    errorElement.textContent = message;
  }
}

/**
 * Clear all error messages
 */
export function clearAllErrors() {
  document.querySelectorAll('.error').forEach(el => el.textContent = '');
}

/**
 * Create and append a message element
 * @param {HTMLElement} container - Container element
 * @param {string} role - Message role (user/assistant)
 * @param {string} text - Message text
 */
export function appendMessage(container, role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  container.appendChild(div);
  
  // Auto-scroll to bottom
  window.scrollTo({ 
    top: document.body.scrollHeight, 
    behavior: 'smooth' 
  });
  
  // Remove empty state if exists
  const emptyElement = document.getElementById('empty');
  if (emptyElement) {
    emptyElement.remove();
  }
}
