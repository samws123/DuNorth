/**
 * Text Formatting Utilities
 * Handles text processing and document style formatting
 */

/**
 * Convert text to document style format
 * @param {string} text - Text to format
 * @returns {string} Formatted text
 */
export function toDocumentStyle(text) {
  if (!text) return '';
  let t = String(text);
  
  // Strip Markdown bold/italic/underline syntax
  t = t.replace(/\*\*(.*?)\*\*/g, '$1');
  t = t.replace(/\*(.*?)\*/g, '$1');
  t = t.replace(/__(.*?)__/g, '$1');
  t = t.replace(/_(.*?)_/g, '$1');
  t = t.replace(/^\s*#+\s*/gm, '');
  
  // Normalize bullets and numbering
  t = t.replace(/^\s*[•·]\s*/gm, '- ');
  t = t.replace(/^\s*-\s*/gm, '- ');
  t = t.replace(/^\s*(\d+)\)\s+/gm, '$1. ');
  
  // Ensure headings end the line (ALL CAPS or ends with colon)
  t = t.replace(/^([A-Z0-9 ,&()\-]+:)\s+/gm, '$1\n');
  
  // Ensure each numbered item title is on its own line
  // If a bullet follows on same line after number, push bullet to next line
  t = t.replace(/^(\s*\d+\.\s+[^\n]+?)\s+-\s+/gm, '$1\n- ');
  
  // If multiple sentences on a numbered line, keep as is but ensure a newline before next bullet/number
  t = t.replace(/(\n\s*\d+\.\s+[^\n]+)(\s*)(\n?)(-\s+)/g, '$1\n$4');
  
  // Collapse extra spaces
  t = t.replace(/[ \t]+$/gm, '');
  
  return t.trim();
}

/**
 * Format assignment list for display
 * @param {Array} assignments - Array of assignment objects
 * @param {string} timeframe - Timeframe description
 * @returns {string} Formatted assignment list
 */
export function formatAssignmentList(assignments, timeframe = '') {
  if (assignments.length === 0) {
    return `No assignments ${timeframe}! 🎉`;
  }
  
  const formatted = assignments.map((r, i) => 
    `${i + 1}. ${r.name}${r.due_at ? ` (due ${new Date(r.due_at).toLocaleDateString()})` : ''}`
  ).join('\n');
  
  return toDocumentStyle(`ASSIGNMENTS ${timeframe.toUpperCase()}\n\n${formatted}`);
}

/**
 * Format course list for display
 * @param {Array} courses - Array of course objects
 * @returns {string} Formatted course list
 */
export function formatCourseList(courses) {
  if (courses.length === 0) {
    return 'I don\'t see any courses yet. Click "Refresh Canvas" to sync.';
  }
  
  const lines = courses.map((c, i) => 
    `${i + 1}. ${c.name}${c.course_code ? ` (${c.course_code})` : ''}`
  );
  
  return `Your courses:\n\n${lines.join('\n')}`;
}
