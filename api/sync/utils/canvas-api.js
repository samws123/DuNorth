/**
 * Canvas API Utilities
 * Shared utilities for making paginated Canvas API requests
 */

/**
 * Make paginated Canvas API requests
 * @param {string} baseUrl - Canvas base URL
 * @param {string} cookieValue - Session cookie value
 * @param {string} path - API path to request
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} Array of all paginated results
 */
export async function callCanvasPaged(baseUrl, cookieValue, path, options = {}) {
  const tryNames = options.cookieNames || ['canvas_session', '_legacy_normandy_session'];
  const maxPages = options.maxPages || 50;
  const userAgent = options.userAgent || 'DuNorth-Server/1.0';
  
  const out = [];
  let url = `${baseUrl}${path}`;
  
  for (let page = 0; page < maxPages && url; page++) {
    let resp;
    
    // Try different cookie names
    for (const name of tryNames) {
      resp = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Cookie': `${name}=${cookieValue}`,
          'User-Agent': userAgent,
          ...options.headers
        },
        redirect: 'follow'
      });
      
      if (resp.ok) break;
      if (![401, 403].includes(resp.status)) break;
    }
    
    if (!resp?.ok) {
      const txt = await resp.text().catch(() => '');
      
      // Handle specific Canvas error cases
      if (resp.status === 404 && /disabled for this course/i.test(txt)) {
        return out; // Return partial results for disabled features
      }
      
      if (resp.status === 401 || resp.status === 403) {
        if (options.throwOnAuth) {
          throw new Error(`Canvas authentication failed: ${resp.status}`);
        }
        return out; // Return partial results for auth failures
      }
      
      throw new Error(`Canvas API error ${resp.status}: ${txt.slice(0, 300)}`);
    }
    
    const data = await resp.json();
    if (Array.isArray(data)) {
      out.push(...data);
    } else if (data) {
      out.push(data);
    }
    
    // Parse pagination link header
    const link = resp.headers.get('Link') || '';
    const nextMatch = /<([^>]+)>;\s*rel="next"/.exec(link);
    url = nextMatch ? nextMatch[1] : null;
  }
  
  return out;
}

/**
 * Make a single Canvas API request
 * @param {string} baseUrl - Canvas base URL
 * @param {string} cookieValue - Session cookie value
 * @param {string} path - API path to request
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} API response data
 */
export async function callCanvasAPI(baseUrl, cookieValue, path, options = {}) {
  const tryNames = options.cookieNames || ['canvas_session', '_legacy_normandy_session'];
  const userAgent = options.userAgent || 'DuNorth-Server/1.0';
  
  let resp;
  const url = `${baseUrl}${path}`;
  
  // Try different cookie names
  for (const name of tryNames) {
    resp = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': `${name}=${cookieValue}`,
        'User-Agent': userAgent,
        ...options.headers
      },
      body: options.body,
      redirect: 'follow'
    });
    
    if (resp.ok) break;
    if (![401, 403].includes(resp.status)) break;
  }
  
  if (!resp?.ok) {
    const txt = await resp.text().catch(() => '');
    
    if (resp.status === 404 && /disabled for this course/i.test(txt)) {
      return null; // Feature disabled
    }
    
    if (resp.status === 401 || resp.status === 403) {
      if (options.throwOnAuth) {
        throw new Error(`Canvas authentication failed: ${resp.status}`);
      }
      return null; // Auth failure
    }
    
    throw new Error(`Canvas API error ${resp.status}: ${txt.slice(0, 300)}`);
  }
  
  const contentType = resp.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await resp.json();
  }
  
  return await resp.text();
}

/**
 * Fetch file content from Canvas public URL
 * @param {string} publicUrl - Public file URL
 * @param {Object} options - Additional options
 * @returns {Promise<Buffer|null>} File content buffer or null
 */
export async function fetchCanvasFile(publicUrl, options = {}) {
  const maxSize = options.maxSize || 15 * 1024 * 1024; // 15MB default
  const userAgent = options.userAgent || 'DuNorth-Server/1.0';
  
  try {
    const resp = await fetch(publicUrl, {
      headers: { 'User-Agent': userAgent }
    });
    
    if (!resp.ok) return null;
    
    const contentLength = Number(resp.headers.get('content-length') || '0');
    if (contentLength > 0 && contentLength > maxSize) return null;
    
    const buffer = Buffer.from(await resp.arrayBuffer());
    if (buffer.length > maxSize) return null;
    
    return buffer;
  } catch (error) {
    console.warn('Failed to fetch Canvas file:', error.message);
    return null;
  }
}
