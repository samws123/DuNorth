import { extractPdfTextFromBuffer } from './pdf.js';

export async function extractTextUniversal(buffer, filename = '', contentType = '') {
  const name = String(filename || '').toLowerCase();
  const type = String(contentType || '').toLowerCase();

  // Try by extension first
  if (name.endsWith('.pdf') || type.includes('pdf')) {
    return await extractPdfTextFromBuffer(buffer);
  }

  // DOCX → HTML → text
  if (name.endsWith('.docx') || type.includes('wordprocessingml')) {
    try {
      const mammothMod = await import('mammoth');
      const mammoth = mammothMod && (mammothMod.default || mammothMod);
      const { value: html } = await mammoth.convertToHtml({ buffer });
      const { htmlToText } = await import('html-to-text');
      return htmlToText(html || '', { wordwrap: false }).trim() || null;
    } catch {}
  }

  // PPTX → extract slide text from XML
  if (name.endsWith('.pptx') || type.includes('presentationml')) {
    try {
      const jszipMod = await import('jszip');
      const JSZip = jszipMod && (jszipMod.default || jszipMod);
      const fxpMod = await import('fast-xml-parser');
      const { XMLParser } = fxpMod;
      const zip = await JSZip.loadAsync(buffer);
      const parser = new XMLParser();
      let out = '';
      const slideFiles = Object.keys(zip.files).filter(p => p.startsWith('ppt/slides/slide') && p.endsWith('.xml'));
      slideFiles.sort();
      for (const p of slideFiles) {
        const xml = await zip.files[p].async('string');
        const j = parser.parse(xml);
        // Gather all a:t text nodes
        const texts = [];
        function walk(node) {
          if (!node || typeof node !== 'object') return;
          for (const k of Object.keys(node)) {
            const v = node[k];
            if (k === 'a:t' && (typeof v === 'string' || typeof v === 'number')) texts.push(String(v));
            if (v && typeof v === 'object') walk(v);
          }
        }
        walk(j);
        if (texts.length) out += texts.join(' ') + '\n\n';
      }
      return out.trim() || null;
    } catch {}
  }

  // XLSX → join sheet cell values
  if (name.endsWith('.xlsx') || type.includes('sheet')) {
    try {
      const xlsxMod = await import('xlsx');
      const XLSX = xlsxMod && (xlsxMod.default || xlsxMod);
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const lines = [];
      wb.SheetNames.forEach(sn => {
        const ws = wb.Sheets[sn];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
        json.forEach(row => {
          const vals = row.filter(v => v !== undefined && v !== null).map(v => String(v));
          if (vals.length) lines.push(vals.join(' \t '));
        });
      });
      return lines.join('\n');
    } catch {}
  }

  // HTML
  if (name.endsWith('.html') || name.endsWith('.htm') || type.includes('text/html')) {
    try {
      const { htmlToText } = await import('html-to-text');
      const html = buffer.toString('utf8');
      return htmlToText(html || '', { wordwrap: false }).trim() || null;
    } catch {}
  }

  // Plain text / CSV / JSON
  if (type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.md') || type.includes('json') || name.endsWith('.json')) {
    try {
      return buffer.toString('utf8');
    } catch {}
  }

  // RTF basic strip
  if (name.endsWith('.rtf') || type.includes('rtf')) {
    try {
      const rtf = buffer.toString('utf8');
      // Naive fallback: strip control words
      return rtf.replace(/\\[a-zA-Z]+-?\d* ?/g, '').replace(/[{}]/g, '').trim();
    } catch {}
  }

  return null;
}


