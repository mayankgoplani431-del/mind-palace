import { LlmError, safeFetch, type Complete } from './common';

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  promptFeedback?: { blockReason?: string };
}

/** Gemini generateContent with JSON mime type. The key goes in a header, never in the URL. */
export const geminiComplete: Complete = async (cfg, system, user, f, signal) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`;
  const res = await safeFetch(f, url, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.apiKey.trim() },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
  if (!text)
    throw new LlmError(
      'parse',
      data.promptFeedback?.blockReason
        ? `Gemini blocked the prompt (${data.promptFeedback.blockReason}).`
        : 'Gemini returned an empty response.',
    );
  return text;
};
