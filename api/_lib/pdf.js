import path from 'node:path';

const CMAPS_DIR = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/cmaps');
const STDFONTS_DIR = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts');

export async function extractPdfTextFromBuffer(buffer) {
  // Try pdf-parse first (if available), then pdfjs-dist
  try {
    let pdfParseMod = null;
    try { pdfParseMod = await import('pdf-parse'); } catch {}
    const pdfParse = pdfParseMod && (pdfParseMod.default || pdfParseMod);
    if (pdfParse) {
      const parsed = await pdfParse(buffer).catch(() => null);
      const text = parsed?.text ? String(parsed.text).trim() : '';
      if (text) return text;
    }
  } catch {}
  try {
    const pdfjsMod = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdfjsLib = pdfjsMod && (pdfjsMod.default || pdfjsMod);
    const loadingTask = pdfjsLib.getDocument({
      data: buffer,
      cMapUrl: CMAPS_DIR + '/',
      cMapPacked: true,
      standardFontDataUrl: STDFONTS_DIR + '/',
      isEvalSupported: false,
      disableFontFace: true
    });
    const doc = await loadingTask.promise;
    let out = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items?.map(it => it.str).filter(Boolean) || [];
      out += strings.join(' ') + '\n\n';
    }
    out = out.trim();
    return out || null;
  } catch {}
  return null;
}


