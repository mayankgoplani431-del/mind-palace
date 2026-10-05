import { z } from 'zod';
import LZString from 'lz-string';
import type { PalaceData } from '../extract/types';
import { conceptSchema } from '../extract/validate';
import type { Card } from '../learn/srs';

const roomSchema = z.object({
  id: z.string().min(1),
  topic: z.string().min(1),
  concepts: z.array(conceptSchema).min(1).max(8),
});

export const palaceSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  topic: z.string().min(1),
  language: z.enum(['en', 'hi', 'mr']),
  seed: z.number().int(),
  style: z.enum(['temple', 'lab', 'zen']),
  rooms: z.array(roomSchema).min(1).max(6),
  slots: z.record(z.string(), z.number().int().min(0)).optional(),
  createdAt: z.number(),
  engine: z.string(),
});

const FORMAT = 'mind-palace';

export interface ExportFile {
  format: typeof FORMAT;
  version: 1;
  palace: PalaceData;
  cards?: Record<string, Card>;
}

export function exportPalace(palace: PalaceData, cards?: Record<string, Card>): string {
  const file: ExportFile = { format: FORMAT, version: 1, palace, ...(cards ? { cards } : {}) };
  return JSON.stringify(file, null, 2);
}

export class ImportError extends Error {}

export function parsePalaceFile(text: string): { palace: PalaceData; cards?: Record<string, Card> } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ImportError('That file is not valid JSON.');
  }
  const obj = (raw ?? {}) as { format?: string; palace?: unknown; cards?: unknown };
  // accept both a wrapped export and a bare palace object
  const candidate = obj.format === FORMAT ? obj.palace : raw;
  const parsed = palaceSchema.safeParse(candidate);
  if (!parsed.success) throw new ImportError('This file is not a valid Mind Palace export.');
  const out: { palace: PalaceData; cards?: Record<string, Card> } = { palace: parsed.data as PalaceData };
  if (obj.format === FORMAT && obj.cards && typeof obj.cards === 'object') out.cards = obj.cards as Record<string, Card>;
  return out;
}

/** Compact, URL-safe encoding of a palace for the share link (#p=...). */
export function encodeShare(palace: PalaceData): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(palace));
}

export function decodeShare(payload: string): PalaceData {
  const json = LZString.decompressFromEncodedURIComponent(payload);
  if (!json) throw new ImportError('The share link is damaged or incomplete.');
  return parsePalaceFile(json).palace;
}

export function shareUrl(palace: PalaceData, base = location.href.split('#')[0] ?? ''): string {
  return `${base}#p=${encodeShare(palace)}`;
}

/** Returns the palace encoded in the URL hash, if any. */
export function palaceFromHash(hash: string): PalaceData | null {
  const m = /^#p=(.+)$/.exec(hash);
  return m ? decodeShare(m[1] as string) : null;
}
