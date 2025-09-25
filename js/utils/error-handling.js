/**
 * Error Handling Utility Functions
 * Centralized error handling and logging
 */

/**
 * Handle and display error messages
 * @param {Error|string} error - Error to handle
 * @param {string} context - Context where error occurred
 * @param {Function} displayFn - Function to display error (optional)
 */
export function handleError(error, context = '', displayFn = null) {
  const message = error instanceof Error ? error.message : String(error);
  const fullMessage = context ? `${context}: ${message}` : message;
  
  console.error(fullMessage, error);
  
  if (displayFn) {
    displayFn(fullMessage);
  }
}

/**
 * Create error handler with context
 * @param {string} context - Error context
 * @param {Function} displayFn - Function to display error
 * @returns {Function} Error handler function
 */
export function createErrorHandler(context, displayFn = null) {
  return (error) => handleError(error, context, displayFn);
}

/**
 * Async error wrapper for functions
 * @param {Function} fn - Function to wrap
 * @param {string} context - Error context
 * @param {Function} errorHandler - Error handler function
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(fn, context, errorHandler = null) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (errorHandler) {
        errorHandler(error);
      } else {
        handleError(error, context);
      }
      throw error;
    }
  };
}

/**
 * Log error with structured data
 * @param {Error} error - Error object
 * @param {Object} metadata - Additional metadata
 */
export function logError(error, metadata = {}) {
  const errorData = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...metadata
  };
  
  console.error('Error logged:', errorData);
  
  // In production, you might want to send this to an error tracking service
  // Example: sendToErrorService(errorData);
}

/**
 * Create retry wrapper for functions
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in ms
 * @returns {Function} Function with retry logic
 */
export function withRetry(fn, maxRetries = 3, delay = 1000) {
  return async (...args) => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  };
}
