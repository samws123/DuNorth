/**
 * Storage Utility Functions
 * Helper functions for localStorage management
 */

import { CONFIG } from './constants.js';

/**
 * Get user ID from localStorage
 * @returns {string} User ID or default
 */
export function getUserId() {
  return localStorage.getItem(CONFIG.STORAGE_KEYS.USER_ID) || 'demo-user';
}

/**
 * Set user ID in localStorage
 * @param {string} userId - User ID to store
 */
export function setUserId(userId) {
  localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, userId);
}

/**
 * Get token from localStorage
 * @returns {string|null} Stored token
 */
export function getStoredToken() {
  return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
}

/**
 * Set token in localStorage
 * @param {string} token - Token to store
 */
export function setStoredToken(token) {
  localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
}

/**
 * Remove user data from localStorage
 */
export function clearUserData() {
  localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_ID);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
}

/**
 * Get item from localStorage with JSON parsing
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if key doesn't exist
 * @returns {any} Parsed value or default
 */
export function getStorageItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Failed to parse localStorage item '${key}':`, error);
    return defaultValue;
  }
}

/**
 * Set item in localStorage with JSON stringification
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
export function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to set localStorage item '${key}':`, error);
  }
}
