/**
 * Minimal Groq client (OpenAI-compatible chat completions API).
 *
 * Uses plain `fetch`, so it needs no extra package. Configuration (environment variables):
 *   GROQ_API_KEY      required; without it the app answers from the engine + astrology only
 *   GROQ_MODEL        optional; default "llama-3.3-70b-versatile"
 *   GROQ_BASE_URL     optional; default "https://api.groq.com/openai/v1"
 *   GROQ_TIMEOUT_MS   optional; default 20000 (a slow call falls back instead of hanging the request)
 */

export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_TIMEOUT_MS = 20_000;

export function groqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

type ChatResponse = { choices?: { message?: { content?: string | null } }[] };

function post(body: Record<string, unknown>): Promise<Response> {
  const baseUrl = (process.env.GROQ_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const timeoutMs = Number(process.env.GROQ_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  return fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

/**
 * Sends one prompt and returns the model's reply text (expected to be a JSON object).
 * Throws on network errors, timeouts and non-2xx answers; the caller decides the fallback.
 * The error message never contains the API key or the response body.
 */
export async function groqJsonCompletion(
  prompt: string,
  options: { maxTokens?: number; temperature?: number } = {},
): Promise<string | null> {
  const request = {
    model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
    temperature: options.temperature ?? 0.3,
    max_completion_tokens: options.maxTokens ?? 500,
    messages: [{ role: "user", content: prompt }],
  };

  let res = await post({ ...request, response_format: { type: "json_object" } });
  // A model that does not accept JSON mode answers 400. The prompt already demands "ONLY a JSON
  // object", so retry once without the option instead of losing the AI answer.
  if (res.status === 400) res = await post(request);
  if (!res.ok) throw new Error(`Groq request failed with HTTP ${res.status}`);

  const data = (await res.json()) as ChatResponse;
  return data.choices?.[0]?.message?.content ?? null;
}
