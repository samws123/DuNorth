/**
 * Assignment Selection Utilities
 * Handles parsing ordinal selectors and assignment targeting
 */

/**
 * Parse ordinal selectors from user message
 * @param {string} message - User message
 * @param {Array} lastIds - Array of last assignment IDs
 * @returns {Array} Array of target assignment IDs
 */
export function parseOrdinalSelectors(message, lastIds) {
  const m = message.toLowerCase();
  const ordinalMap = [
    { re: /(first|1st|one|#?1)\b/, index: 0 },
    { re: /(second|2nd|two|#?2)\b/, index: 1 },
    { re: /(third|3rd|three|#?3)\b/, index: 2 },
    { re: /(fourth|4th|four|#?4)\b/, index: 3 },
    { re: /(fifth|5th|five|#?5)\b/, index: 4 }
  ];

  const allRequested = /\ball\b|\ball of them\b/.test(m);
  if (allRequested && lastIds.length > 0) {
    return lastIds;
  }

  const anyOrdinal = ordinalMap.find(o => o.re.test(m));
  if (anyOrdinal && lastIds[anyOrdinal.index] != null) {
    return [lastIds[anyOrdinal.index]];
  }

  return [];
}

/**
 * Check if message contains ordinal-only patterns
 * @param {string} message - User message
 * @returns {boolean} True if message contains ordinal patterns
 */
export function isOrdinalOnlyMessage(message) {
  return /\b(first|1st|1|second|2nd|2|third|3rd|3|fourth|4th|4|fifth|5th|5|all)\b/.test(message.toLowerCase());
}

/**
 * Parse ordinal selectors for follow-up messages
 * @param {string} message - User message
 * @param {Array} lastIds - Array of last assignment IDs
 * @returns {Array} Array of target assignment IDs
 */
export function parseFollowUpOrdinals(message, lastIds) {
  const m = message.toLowerCase();
  
  const allRequested = /\ball\b/.test(m);
  if (allRequested) {
    return lastIds;
  }

  const ordinalMap = [
    { re: /(first|1st|\b1\b)/, index: 0 },
    { re: /(second|2nd|\b2\b)/, index: 1 },
    { re: /(third|3rd|\b3\b)/, index: 2 },
    { re: /(fourth|4th|\b4\b)/, index: 3 },
    { re: /(fifth|5th|\b5\b)/, index: 4 }
  ];

  const anyOrdinal = ordinalMap.find(o => o.re.test(m));
  if (anyOrdinal && lastIds[anyOrdinal.index] != null) {
    return [lastIds[anyOrdinal.index]];
  }

  return [];
}
