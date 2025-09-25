/**
 * Extension Bridge Communication Module
 * Handles communication with the DuNorth browser extension
 */

import { CONFIG, generateRequestId, handleError } from './utils/index.js';

// =============================================================================
// BRIDGE COMMUNICATION
// =============================================================================

/**
 * Send message to extension via bridge
 * @param {string} type - Message type
 * @param {Object} payload - Message payload
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<any>} Response data
 */
export function bridgeCall(type, payload, timeoutMs = CONFIG.TIMEOUTS.BRIDGE_DEFAULT) {
  return new Promise((resolve, reject) => {
    const reqId = generateRequestId();
    
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error('Bridge timeout'));
    }, timeoutMs);
    
    function onMessage(event) {
      const data = event.data && event.data.__SHX_RES;
      if (!data || data.reqId !== reqId) return;
      
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      
      if (data.ok) {
        resolve(data.data);
      } else {
        reject(new Error(data.error || 'Bridge error'));
      }
    }
    
    window.addEventListener('message', onMessage);
    window.postMessage({ 
      __SHX: { type, payload, reqId } 
    }, '*');
  });
}

// =============================================================================
// CHROME EXTENSION COMMUNICATION
// =============================================================================

/**
 * Send message directly to Chrome extension
 * @param {string} type - Message type
 * @param {Object} payload - Message payload
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<any>} Response data
 */
export function chromeExtensionCall(type, payload = {}, timeoutMs = CONFIG.TIMEOUTS.BRIDGE_DEFAULT) {
  return new Promise((resolve, reject) => {
    if (!window.chrome || !window.chrome.runtime) {
      reject(new Error('Chrome runtime not available'));
      return;
    }
    
    const timer = setTimeout(() => {
      reject(new Error('Chrome extension timeout'));
    }, timeoutMs);
    
    chrome.runtime.sendMessage(
      CONFIG.EXTENSION_ID, 
      { type, ...payload }, 
      (response) => {
        clearTimeout(timer);
        
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        
        if (!response?.ok) {
          reject(new Error(response?.error || 'No response from extension'));
          return;
        }
        
        resolve(response);
      }
    );
  });
}

// =============================================================================
// UNIFIED EXTENSION COMMUNICATION
// =============================================================================

/**
 * Try Chrome extension first, fallback to bridge
 * @param {string} type - Message type
 * @param {Object} payload - Message payload
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<any>} Response data
 */
export async function extensionCall(type, payload = {}, timeoutMs = CONFIG.TIMEOUTS.BRIDGE_DEFAULT) {
  try {
    // Try Chrome extension first
    return await chromeExtensionCall(type, payload, timeoutMs);
  } catch (chromeError) {
    console.warn('Chrome extension call failed, trying bridge:', chromeError.message);
    
    try {
      // Fallback to bridge
      return await bridgeCall(type, payload, timeoutMs);
    } catch (bridgeError) {
      console.error('Both Chrome extension and bridge calls failed');
      throw new Error(`Extension communication failed: ${bridgeError.message}`);
    }
  }
}

// =============================================================================
// EXTENSION CONNECTION TESTING
// =============================================================================

/**
 * Test extension connection
 * @returns {Promise<boolean>} True if connected
 */
export async function testExtensionConnection() {
  try {
    await extensionCall('PING', {}, CONFIG.TIMEOUTS.EXTENSION_PING);
    return true;
  } catch (error) {
    console.warn('Extension connection test failed:', error.message);
    return false;
  }
}

/**
 * Get extension fingerprint for verification
 * @returns {Promise<Object|null>} Fingerprint data or null
 */
export async function getExtensionFingerprint() {
  try {
    const fingerprint = await extensionCall('TEST_FINGERPRINT', {}, CONFIG.TIMEOUTS.FINGERPRINT);
    return fingerprint;
  } catch (error) {
    console.warn('Failed to get extension fingerprint:', error.message);
    return null;
  }
}

// =============================================================================
// CANVAS SYNC OPERATIONS
// =============================================================================

/**
 * Sync Canvas data via extension
 * @param {string} userToken - User authentication token
 * @param {string} baseUrl - Canvas base URL
 * @returns {Promise<Object>} Sync result
 */
export async function syncCanvasData(userToken, baseUrl) {
  if (!userToken) {
    throw new Error('User token is required for Canvas sync');
  }
  
  try {
    const result = await extensionCall('SYNC_CANVAS', {
      userToken,
      apiEndpoint: CONFIG.API_ENDPOINT,
      baseUrl
    }, CONFIG.TIMEOUTS.SYNC_CANVAS);
    
    return result;
  } catch (error) {
    handleError(error, 'Canvas sync failed');
    throw error;
  }
}
