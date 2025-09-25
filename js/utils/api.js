/**
 * API Utility Functions
 * Helper functions for API requests and authentication
 */

import { CONFIG } from './constants.js';

/**
 * Make authenticated API request
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @param {string} token - Auth token (optional)
 * @returns {Promise<Response>} Fetch response
 */
export async function apiRequest(url, options = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers
  });
}

/**
 * Get user token from storage or API
 * @param {string} userId - User ID
 * @returns {Promise<string>} Auth token
 */
export async function getUserToken(userId) {
  try {
    const response = await apiRequest('/api/auth/token', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Failed to get user token:', error);
    throw new Error('Authentication failed');
  }
}

/**
 * Get saved base URL for user
 * @param {string} userId - User ID
 * @returns {Promise<string>} Base URL
 */
export async function getSavedBaseUrl(userId) {
  try {
    const response = await apiRequest(`/api/user/base-url?userId=${encodeURIComponent(userId)}`);
    const data = await response.json();
    return data?.baseUrl || CONFIG.DEFAULT_BASE_URL;
  } catch (error) {
    console.warn('Failed to get saved base URL, using default:', error);
    return CONFIG.DEFAULT_BASE_URL;
  }
}
