# Text extraction

Server (Node runtime)
- pdf.js (`pdfjs-dist/legacy/build/pdf.mjs`) with cMaps/standard_fonts packaged and absolute paths
- `extractText.js` handles PDF, DOCX, PPTX, XLSX, HTML, TXT
- For PDFs, detect image‑only pages; return empty when fonts unavailable

Fallbacks
- WASM extractor (planned) for stubborn PDFs
- OCR (tesseract.js) for scans (page‑capped)
- Client fallback: hidden iframe loads `/extract.html?fileId=...` using pdf.js in browser, posts text to `/api/debug/store-text`

Operational
- Store only extracted text (not file bytes) where possible
- Use Canvas `public_url` to download file bytes server‑side
- Upsert text by `{ file_id, sha256 }` to avoid re‑processing
