import type { ConceptExtractor, ExtractOptions, ExtractResult, Lang } from '../types';
import { OBJECTS } from '../../objects/library';
import { OBJECT_KEYS } from '../../objects/keys';
import { extractJson, repairLlmOutput, validateExtract } from '../validate';

export type Provider = 'anthropic' | 'openai' | 'gemini';

export interface LlmConfig {
  provider: Provider;
  model: string;
  apiKey: string;
}

export const DEFAULT_MODELS: Record<Provider, string[]> = {
  anthropic: ['claude-sonnet-5-5', 'claude-haiku-4-5-20251001', 'claude-opus-5-5'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
};

export type LlmErrorKind = 'auth' | 'rate' | 'network' | 'server' | 'parse' | 'bad-request' | 'no-key';

export class LlmError extends Error {
  constructor(
    readonly kind: LlmErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

export type Fetch = typeof fetch;

/** Turns a failed HTTP response into a readable LlmError. */
export async function httpError(res: Response): Promise<LlmError> {
  let detail = '';
  try {
    const j = (await res.json()) as { error?: { message?: string } | string; message?: string };
    detail = typeof j.error === 'string' ? j.error : (j.error?.message ?? j.message ?? '');
  } catch {
    /* body not JSON */
  }
  const tail = detail ? `: ${detail.slice(0, 200)}` : '';
  if (res.status === 401 || res.status === 403)
    return new LlmError('auth', `API key rejected (HTTP ${res.status})${tail}`);
  if (res.status === 429) return new LlmError('rate', `Rate limit or quota reached (HTTP 429)${tail}`);
  if (res.status === 400 || res.status === 404)
    return new LlmError('bad-request', `Request rejected (HTTP ${res.status})${tail}`);
  return new LlmError('server', `Provider error (HTTP ${res.status})${tail}`);
}

export async function safeFetch(f: Fetch, url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await f(url, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError')
      throw new LlmError('network', 'The request timed out or was cancelled.');
    throw new LlmError(
      'network',
      'Network error – check your connection (or the browser blocked the request).',
    );
  }
  if (!res.ok) throw await httpError(res);
  return res;
}

export const LANG_NAME: Record<Lang, string> = {
  en: 'English',
  hi: 'Hindi (Devanagari)',
  mr: 'Marathi (Devanagari)',
};

export function systemPrompt(lang: Lang): string {
  const catalogue = OBJECTS.map((o) => `${o.key} (${o.name.en})`).join(', ');
  return [
    'You are a memory-palace designer using the method of loci. Read the student notes and extract the key concepts as vivid, memorable loci.',
    `Write ALL text fields (topic, title, summary, keywords, mnemonic, quiz) in ${LANG_NAME[lang]} – the language of the notes – and set "language" to "${lang}".`,
    'Return ONLY a JSON object, no prose, exactly this shape:',
    '{"topic": string, "language": "en"|"hi"|"mr", "concepts": [{"id": string, "title": string, "summary": string, "keywords": string[], "objectKey": string, "mnemonic": string, "quiz": {"question": string, "options": [string,string,string,string], "answerIndex": number}}]}',
    'Rules:',
    '- 6 to 8 concepts (fewer only if the notes are very short), in the order they appear in the notes.',
    '- title: 1-6 words naming the concept. summary: at most 25 words, faithful to the notes.',
    '- keywords: 2-5 short terms. id: "c1", "c2", ...',
    `- objectKey MUST be one of: ${catalogue}. Pick the object whose look best evokes the concept; use each object at most once; use "crystal" only if nothing fits.`,
    '- mnemonic: ONE vivid sentence linking the chosen object to the concept.',
    '- quiz: a question answerable from the notes, exactly 4 distinct plausible options, answerIndex is the 0-based index of the correct option.',
    `Allowed objectKey values: ${OBJECT_KEYS.join(', ')}.`,
  ].join('\n');
}

export function userPrompt(notes: string): string {
  return `Student notes:\n"""\n${notes.slice(0, 9000)}\n"""`;
}

export const EXTRACT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    language: { type: 'string', enum: ['en', 'hi', 'mr'] },
    concepts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string' },
          keywords: { type: 'array', items: { type: 'string' } },
          objectKey: { type: 'string', enum: [...OBJECT_KEYS] },
          mnemonic: { type: 'string' },
          quiz: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              answerIndex: { type: 'integer' },
            },
            required: ['question', 'options', 'answerIndex'],
          },
        },
        required: ['id', 'title', 'summary', 'keywords', 'objectKey', 'mnemonic', 'quiz'],
      },
    },
  },
  required: ['topic', 'language', 'concepts'],
} as const;

/** A provider call: returns the model's raw JSON text for (system, user). */
export type Complete = (
  cfg: LlmConfig,
  system: string,
  user: string,
  f: Fetch,
  signal: AbortSignal,
) => Promise<string>;

export class LlmExtractor implements ConceptExtractor {
  readonly name: string;
  constructor(
    private readonly cfg: LlmConfig,
    private readonly complete: Complete,
    private readonly fetchImpl: Fetch = (...a) => fetch(...a),
    private readonly timeoutMs = 90_000,
  ) {
    this.name = `${cfg.provider}:${cfg.model}`;
  }

  private async once(system: string, user: string): Promise<string> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.timeoutMs);
    try {
      return await this.complete(this.cfg, system, user, this.fetchImpl, ctl.signal);
    } finally {
      clearTimeout(timer);
    }
  }

  async extract(text: string, opts: ExtractOptions): Promise<ExtractResult> {
    if (!this.cfg.apiKey.trim()) throw new LlmError('no-key', 'No API key set.');
    const system = systemPrompt(opts.lang);
    let user = userPrompt(text);
    let lastErr = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      const reply = await this.once(system, user);
      try {
        const repaired = repairLlmOutput(extractJson(reply), opts.lang);
        const v = validateExtract(repaired);
        if (v.ok) {
          const prefix = opts.idPrefix ?? '';
          return {
            ...v.value,
            concepts: v.value.concepts.map((c, i) => ({ ...c, id: `${prefix}c${i + 1}` })),
          };
        }
        lastErr = v.error;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
      user = `${userPrompt(text)}\n\nYour previous reply was invalid (${lastErr}). Reply again with ONLY the corrected JSON object.`;
    }
    throw new LlmError('parse', `The model returned invalid JSON twice (${lastErr}).`);
  }
}
