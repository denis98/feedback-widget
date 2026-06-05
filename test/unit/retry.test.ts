import { describe, it, expect, vi } from 'vitest';
import { submitWithRetry, WebhookError } from '../../src/utils/retry.js';
import type { WebhookPayload } from '../../src/types.js';

const mockPayload: WebhookPayload = {
  projectId: 'test',
  feedbackId: '00000000-0000-4000-8000-000000000000',
  type: 'bug',
  title: 'Test Bug',
  description: 'Description',
  zone: null,
  context: {
    url: 'http://localhost/',
    userAgent: 'test-agent',
    viewport: { width: 1280, height: 720 },
    timestamp: new Date().toISOString(),
    locale: 'en',
  },
  user: null,
  screenshot: null,
  custom: {},
};

function makeResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body !== undefined ? JSON.stringify(body) : ''),
  } as Response;
}

describe('submitWithRetry', () => {
  it('succeeds immediately on 200', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(makeResponse(200, { ticketId: 'T-1' }));

    const result = await submitWithRetry(
      mockPayload,
      'http://test/webhook',
      { maxRetries: 3 },
      fetchMock,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.ticketId).toBe('T-1');
  });

  it('retries on 500 and succeeds on third attempt', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(500))
      .mockResolvedValueOnce(makeResponse(500))
      .mockResolvedValueOnce(makeResponse(200, {}));

    await submitWithRetry(
      mockPayload,
      'http://test/webhook',
      { maxRetries: 3, baseDelay: 0 },
      fetchMock,
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry on 4xx', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(makeResponse(401));

    await expect(
      submitWithRetry(
        mockPayload,
        'http://test/webhook',
        { maxRetries: 3, baseDelay: 0 },
        fetchMock,
      ),
    ).rejects.toThrow(WebhookError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting retries', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(500));

    await expect(
      submitWithRetry(
        mockPayload,
        'http://test/webhook',
        { maxRetries: 2, baseDelay: 0 },
        fetchMock,
      ),
    ).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('retries on network error (fetch throws)', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(makeResponse(200, {}));

    await submitWithRetry(
      mockPayload,
      'http://test/webhook',
      { maxRetries: 3, baseDelay: 0 },
      fetchMock,
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('returns empty object on 200 with empty body', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(makeResponse(200));

    const result = await submitWithRetry(
      mockPayload,
      'http://test/webhook',
      { maxRetries: 0 },
      fetchMock,
    );

    expect(result).toEqual({});
  });

  it('does not retry on 422', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(makeResponse(422));

    await expect(
      submitWithRetry(
        mockPayload,
        'http://test/webhook',
        { maxRetries: 3, baseDelay: 0 },
        fetchMock,
      ),
    ).rejects.toBeInstanceOf(WebhookError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 (rate limit)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(429))
      .mockResolvedValueOnce(makeResponse(200, {}));

    await submitWithRetry(
      mockPayload,
      'http://test/webhook',
      { maxRetries: 3, baseDelay: 0 },
      fetchMock,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
