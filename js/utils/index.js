/**
 * Utils Index - Central Export Hub
 * Re-exports all utility functions for easy importing
 */

// Constants
export { CONFIG } from './constants.js';

// DOM utilities
export {
  getElementById,
  getInputValue,
  setFieldError,
  clearAllErrors,
  appendMessage
} from './dom.js';

// Validation utilities
export {
  isValidEmail,
  isValidPassword,
  isRequired,
  isValidLength,
  isValidUrl
} from './validation.js';

// API utilities
export {
  apiRequest,
  getUserToken,
  getSavedBaseUrl
} from './api.js';

// Storage utilities
export {
  getUserId,
  setUserId,
  getStoredToken,
  setStoredToken,
  clearUserData,
  getStorageItem,
  setStorageItem
} from './storage.js';

// Error handling utilities
export {
  handleError,
  createErrorHandler,
  withErrorHandling,
  logError,
  withRetry
} from './error-handling.js';

// Helper utilities
export {
  sleep,
  generateRequestId,
  isTextFile,
  getFileExtension,
  formatDate,
  debounce,
  throttle,
  deepClone,
  isEmpty,
  capitalize,
  toKebabCase,
  toCamelCase
} from './helpers.js';
