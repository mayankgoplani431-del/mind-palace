import { z } from 'zod';
import type { ExtractResult, Lang } from './types';
import { OBJECT_KEYS } from '../objects/keys';
import { clipWords, wordCount } from '../input/text';
import { pickObjectKey } from './objectmatch';

const words = (s: string): number => wordCount(s);

export const quizSchema = z
  .object({
    question: z.string().trim().min(3),
    options: z.array(z.string().trim().min(1)).length(4),
    answerIndex: z.number().int().min(0).max(3),
  })
  .refine((q) => new Set(q.options.map((o) => o.toLowerCase())).size === 4, {
    message: 'quiz options must be distinct',
  });

export const conceptSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  summary: z
    .string()
    .trim()
    .min(1)
    .refine((s) => words(s) <= 25, { message: 'summary must be at most 25 words' }),
  keywords: z.array(z.string().trim().min(1)).min(1).max(8),
  objectKey: z.enum(OBJECT_KEYS),
  mnemonic: z.string().trim().min(1),
  quiz: quizSchema,
});

export const extractSchema = z.object({
  topic: z.string().trim().min(1).max(160),
  language: z.enum(['en', 'hi', 'mr']),
  concepts: z.array(conceptSchema).min(1).max(8),
});

export type ValidationResult = { ok: true; value: ExtractResult } | { ok: false; error: string };

export function validateExtract(raw: unknown): ValidationResult {
  const r = extractSchema.safeParse(raw);
  if (r.success) return { ok: true, value: r.data as ExtractResult };
  const msg = r.error.issues
    .slice(0, 6)
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ');
  return { ok: false, error: msg };
}

const LANG_ALIASES: Record<string, Lang> = {
  en: 'en',
  english: 'en',
  hi: 'hi',
  hindi: 'hi',
  mr: 'mr',
  marathi: 'mr',
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/**
 * Cheap, safe repairs for common LLM slips BEFORE strict validation: clip long summaries, fix
 * unknown object keys via keyword matching, coerce answerIndex, cap at 8 concepts, fill ids.
 */
export function repairLlmOutput(raw: unknown, lang: Lang): unknown {
  const root = asRecord(raw);
  if (!root) return raw;
  const used = new Set<string>();
  const concepts = Array.isArray(root.concepts) ? root.concepts.slice(0, 8) : root.concepts;
  const fixed = Array.isArray(concepts)
    ? concepts.map((c, i) => {
        const o = asRecord(c);
        if (!o) return c;
        const title = typeof o.title === 'string' ? o.title : '';
        const keywords = Array.isArray(o.keywords) ? o.keywords.map(String) : [];
        const summary = typeof o.summary === 'string' ? clipWords(o.summary, 25) : o.summary;
        let key = typeof o.objectKey === 'string' ? o.objectKey.trim().toLowerCase() : '';
        if (!(OBJECT_KEYS as readonly string[]).includes(key) || used.has(key)) {
          key = pickObjectKey(
            title,
            keywords,
            typeof summary === 'string' ? summary : '',
            lang,
            used,
            title + i,
          );
        }
        used.add(key);
        const quiz = asRecord(o.quiz);
        const answerIndex = quiz ? Number(quiz.answerIndex) : NaN;
        return {
          ...o,
          id: typeof o.id === 'string' && o.id ? o.id : `c${i + 1}`,
          summary,
          objectKey: key,
          quiz: quiz
            ? {
                ...quiz,
                answerIndex: Number.isFinite(answerIndex) ? Math.trunc(answerIndex) : quiz.answerIndex,
              }
            : o.quiz,
        };
      })
    : concepts;
  const lg =
    typeof root.language === 'string'
      ? (LANG_ALIASES[root.language.trim().toLowerCase()] ?? root.language)
      : lang;
  return { ...root, language: lg, concepts: fixed };
}

/** Pull the first JSON object out of a model reply (handles ```json fences and chatter). */
export function extractJson(text: string): unknown {
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const body = fence ? (fence[1] as string) : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('The model did not return JSON.');
  return JSON.parse(body.slice(start, end + 1));
}
