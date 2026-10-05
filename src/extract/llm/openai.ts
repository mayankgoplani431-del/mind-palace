import { LlmError, safeFetch, type Complete } from './common';

interface OpenAiResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

/** OpenAI Chat Completions with response_format json_object (BYO key). */
export const openaiComplete: Complete = async (cfg, system, user, f, signal) => {
  const res = await safeFetch(f, 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey.trim()}` },
    body: JSON.stringify({
      model: cfg.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  const data = (await res.json()) as OpenAiResponse;
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new LlmError('parse', 'OpenAI returned an empty response.');
  return text;
};
