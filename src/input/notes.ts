export type NotesErrorKind = 'empty-pdf' | 'unsupported' | 'too-short' | 'read' | 'too-large';

export class NotesError extends Error {
  constructor(
    readonly kind: NotesErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'NotesError';
  }
}

export const MIN_NOTES_CHARS = 40;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;

/** Reads .txt / .md / .pdf into plain text. Throws NotesError with a readable message. */
export async function loadNotesFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new NotesError('too-large', 'That file is larger than 15 MB.');
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      const { extractPdfText } = await import('./pdf');
      return await extractPdfText(await file.arrayBuffer());
    }
    if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown') || file.type.startsWith('text/')) {
      const text = (await file.text()).replace(/^﻿/, '');
      if (!text.trim()) throw new NotesError('too-short', 'The file is empty.');
      return text;
    }
  } catch (e) {
    if (e instanceof NotesError) throw e;
    throw new NotesError('read', 'The file could not be read.');
  }
  throw new NotesError('unsupported', 'Unsupported file type. Use .txt, .md or .pdf.');
}

export function assertEnoughNotes(text: string): void {
  if (text.trim().length < MIN_NOTES_CHARS) {
    throw new NotesError('too-short', 'Add a few sentences of notes first (at least a paragraph).');
  }
}
