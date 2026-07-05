// @koeti/ai — Mistral chat client. Zero-dep fetch against the REST API.
//
// Tiers are pinned to the best price/performance models on
// https://mistral.ai/pricing/api/ (checked 2026-07, $/M tokens in/out):
//   fast     Ministral 3 8B   $0.15/$0.15  classification, extraction, routing
//   balanced Mistral Small 4  $0.15/$0.60  default workhorse (chat, summaries)
//   quality  Mistral Large 3  $0.50/$1.50  generation/reasoning that must be good
//   embed    Mistral Embed    $0.10        embeddings
// `-latest` aliases track Mistral's model upgrades without code changes.
export const AI_MODELS = {
  fast: 'ministral-8b-latest',
  balanced: 'mistral-small-latest',
  quality: 'mistral-large-latest',
  embed: 'mistral-embed',
} as const;

export type AiTier = Exclude<keyof typeof AI_MODELS, 'embed'>;

export class AiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiChatOptions {
  /** Model tier — defaults to 'balanced'. */
  tier?: AiTier;
  /** Shorthand: single user prompt (+ optional system). Ignored if `messages` given. */
  prompt?: string;
  system?: string;
  messages?: AiMessage[];
  /** Ask the model for a JSON object (response_format json_object). */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  /** Defaults to process.env.MISTRAL_API_KEY. */
  apiKey?: string;
}

export interface AiChatResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
}

export async function aiChat(opts: AiChatOptions): Promise<AiChatResult> {
  const apiKey = opts.apiKey ?? process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new AiError('MISTRAL_API_KEY is not set');

  const messages =
    opts.messages ??
    ([
      ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
      { role: 'user', content: opts.prompt ?? '' },
    ] as AiMessage[]);

  const body = JSON.stringify({
    model: AI_MODELS[opts.tier ?? 'balanced'],
    messages,
    ...(opts.temperature !== undefined && { temperature: opts.temperature }),
    ...(opts.maxTokens !== undefined && { max_tokens: opts.maxTokens }),
    ...(opts.json && { response_format: { type: 'json_object' } }),
  });

  // ponytail: one retry on 429/5xx with a fixed 1s pause — enough for cron jobs
  // and transient blips; add real backoff if a feature ever hammers the API.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body,
    });
    if (res.ok) {
      const data = (await res.json()) as {
        choices: { message: { content: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      return {
        content: data.choices[0]?.message.content ?? '',
        usage: {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
        },
      };
    }
    if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    const detail = await res.text().catch(() => '');
    throw new AiError(`Mistral API error ${res.status}: ${detail.slice(0, 200)}`, res.status);
  }
}

/** aiChat + JSON.parse. Model is instructed via response_format; the prompt must still describe the shape. */
export async function aiJson<T>(opts: AiChatOptions): Promise<T> {
  const { content } = await aiChat({ ...opts, json: true });
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new AiError(`Model returned invalid JSON: ${content.slice(0, 200)}`);
  }
}
