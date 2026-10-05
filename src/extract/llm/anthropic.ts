import { EXTRACT_JSON_SCHEMA, LlmError, safeFetch, type Complete } from './common';

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string; input?: unknown }>;
}

/**
 * Anthropic Messages API called straight from the browser (BYO key).
 * JSON is forced with a single tool + tool_choice; the tool input is the palace JSON.
 */
export const anthropicComplete: Complete = async (cfg, system, user, f, signal) => {
  const res = await safeFetch(f, 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.apiKey.trim(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
      tools: [
        {
          name: 'emit_palace',
          description: 'Emit the extracted concepts as JSON.',
          input_schema: EXTRACT_JSON_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'emit_palace' },
    }),
  });
  const data = (await res.json()) as AnthropicResponse;
  const tool = data.content?.find((c) => c.type === 'tool_use');
  if (tool?.input !== undefined) return JSON.stringify(tool.input);
  const text = data.content?.find((c) => c.type === 'text')?.text;
  if (text) return text;
  throw new LlmError('parse', 'Anthropic returned an empty response.');
};
