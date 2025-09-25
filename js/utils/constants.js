/**
 * Application Constants
 * Central configuration for the DuNorth application
 */

export const CONFIG = {
  EXTENSION_ID: 'elipinieeokobcniibdafjkbifbfencb',
  DEFAULT_BASE_URL: 'https://princeton.instructure.com',
  API_ENDPOINT: 'https://du-north-three.vercel.app/api',
  TIMEOUTS: {
    BRIDGE_DEFAULT: 8000,
    EXTENSION_PING: 4000,
    FINGERPRINT: 6000,
    SYNC_CANVAS: 8000,
    EXTRACTION_POLL: 200000
  },
  TEXT_FILE_EXTENSIONS: ['.pdf', '.docx', '.pptx', '.xlsx', '.html', '.htm', '.txt', '.csv', '.md', '.json', '.rtf'],
  STORAGE_KEYS: {
    USER_ID: 'dunorth_user',
    TOKEN: 'dunorth_token'
  }
};
