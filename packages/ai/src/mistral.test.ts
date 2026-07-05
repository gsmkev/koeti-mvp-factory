import { afterEach, describe, expect, it, vi } from 'vitest';
import { AI_MODELS, AiError, aiChat, aiJson } from './mistral';

function mockFetchOnce(status: number, body: unknown) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

const okBody = {
  choices: [{ message: { content: 'hola' } }],
  usage: { prompt_tokens: 10, completion_tokens: 5 },
};

afterEach(() => vi.restoreAllMocks());

describe('aiChat', () => {
  it('throws without an API key', async () => {
    await expect(aiChat({ prompt: 'x', apiKey: '' })).rejects.toThrow(AiError);
  });

  it('sends the tier model and returns content + usage', async () => {
    const spy = mockFetchOnce(200, okBody);
    const result = await aiChat({ prompt: 'hi', system: 'be brief', tier: 'fast', apiKey: 'k' });
    expect(result).toEqual({ content: 'hola', usage: { promptTokens: 10, completionTokens: 5 } });
    const sent = JSON.parse(spy.mock.calls[0][1]!.body as string);
    expect(sent.model).toBe(AI_MODELS.fast);
    expect(sent.messages).toEqual([
      { role: 'system', content: 'be brief' },
      { role: 'user', content: 'hi' },
    ]);
  });

  it('retries once on 429 then succeeds', async () => {
    vi.useFakeTimers();
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('slow down', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(okBody), { status: 200 }));
    const promise = aiChat({ prompt: 'hi', apiKey: 'k' });
    await vi.runAllTimersAsync();
    expect((await promise).content).toBe('hola');
    expect(spy).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('surfaces API errors with status', async () => {
    mockFetchOnce(401, { message: 'bad key' });
    await expect(aiChat({ prompt: 'x', apiKey: 'k' })).rejects.toMatchObject({ status: 401 });
  });
});

describe('aiJson', () => {
  it('requests json_object and parses the result', async () => {
    const spy = mockFetchOnce(200, {
      choices: [{ message: { content: '{"a":1}' } }],
    });
    expect(await aiJson<{ a: number }>({ prompt: 'x', apiKey: 'k' })).toEqual({ a: 1 });
    const sent = JSON.parse(spy.mock.calls[0][1]!.body as string);
    expect(sent.response_format).toEqual({ type: 'json_object' });
  });

  it('wraps invalid JSON in AiError', async () => {
    mockFetchOnce(200, { choices: [{ message: { content: 'not json' } }] });
    await expect(aiJson({ prompt: 'x', apiKey: 'k' })).rejects.toThrow(/invalid JSON/);
  });
});
