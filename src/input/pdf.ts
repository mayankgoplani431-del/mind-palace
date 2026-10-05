import { NotesError } from './notes';

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

/** Turns positioned PDF text items into lines / paragraphs (blank line between paragraphs). */
export function itemsToText(items: TextItem[]): string {
  const lines: Array<{ y: number; h: number; text: string; endX: number }> = [];
  for (const it of items) {
    if (!it.str) continue;
    const x = it.transform[4] ?? 0;
    const y = it.transform[5] ?? 0;
    const h = Math.abs(it.height) || Math.abs(it.transform[3] ?? 10) || 10;
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - y) < h * 0.5) {
      const gap = x - last.endX;
      last.text += (gap > h * 0.2 && !last.text.endsWith(' ') && !it.str.startsWith(' ') ? ' ' : '') + it.str;
      last.endX = x + it.width;
    } else {
      lines.push({ y, h, text: it.str, endX: x + it.width });
    }
  }
  let out = '';
  let prev: (typeof lines)[number] | undefined;
  for (const l of lines) {
    const t = l.text.trim();
    if (!t) continue;
    if (prev) out += Math.abs(prev.y - l.y) > Math.max(prev.h, l.h) * 1.7 ? '\n\n' : '\n';
    out += t;
    prev = l;
  }
  return out;
}

/** Client-side PDF text extraction (pdfjs legacy build for older phone browsers; loaded on demand). */
export async function extractPdfText(data: ArrayBuffer, maxPages = 60): Promise<string> {
  let pdfjs: typeof import('pdfjs-dist');
  try {
    pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const worker = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = worker;
  } catch {
    throw new NotesError('read', 'Could not load the PDF reader. Check your connection and try again.');
  }
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  } catch {
    throw new NotesError('read', 'This PDF could not be opened (it may be corrupted or password-protected).');
  }
  const pages: string[] = [];
  for (let p = 1; p <= Math.min(doc.numPages, maxPages); p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items.filter((i): i is typeof i & TextItem => 'str' in i) as TextItem[];
    pages.push(itemsToText(items));
  }
  const text = pages.join('\n\n').trim();
  if (text.replace(/\s+/g, '').length < 20) {
    throw new NotesError('empty-pdf', 'No readable text found in this PDF (scanned images are not supported). Paste the text instead.');
  }
  return text;
}
