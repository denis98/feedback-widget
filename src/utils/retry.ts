import type { RetryConfig, WebhookPayload, WebhookResponse } from '../types.js';
import { webhookResponseSchema } from '../schema.js';

export type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

export class WebhookError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'WebhookError';
  }
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

function resolveRetryConfig(partial?: Partial<RetryConfig>): RetryConfig {
  return { ...DEFAULT_RETRY_CONFIG, ...partial };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calcDelay(attempt: number, config: RetryConfig): number {
  const d = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
  return Math.min(d, config.maxDelay);
}

function isRetryable(status: number): boolean {
  return status >= 500 || status === 429;
}

export async function submitWithRetry(
  payload: WebhookPayload,
  webhookUrl: string,
  retryConfig?: Partial<RetryConfig>,
  fetchFn: FetchFn = fetch,
  secret?: string,
): Promise<WebhookResponse> {
  const config = resolveRetryConfig(retryConfig);
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (secret) {
    const signature = await signPayload(body, secret);
    headers['X-Feedback-Signature'] = signature;
  }

  let lastError: Error = new WebhookError('Unknown error');

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      const response = await fetchFn(webhookUrl, { method: 'POST', headers, body });

      if (response.ok) {
        const text = await response.text();
        if (!text) return {};
        try {
          const json: unknown = JSON.parse(text);
          const parsed = webhookResponseSchema.safeParse(json);
          if (!parsed.success) return {};
          const { ticketId, ticketUrl, message } = parsed.data;
          return {
            ...(ticketId !== undefined && { ticketId }),
            ...(ticketUrl !== undefined && { ticketUrl }),
            ...(message !== undefined && { message }),
          };
        } catch {
          return {};
        }
      }

      if (!isRetryable(response.status)) {
        throw new WebhookError(
          `Webhook rejected with status ${response.status}`,
          response.status,
          false,
        );
      }

      lastError = new WebhookError(
        `Webhook returned ${response.status}`,
        response.status,
        true,
      );
    } catch (err) {
      if (err instanceof WebhookError && !err.retryable) throw err;
      lastError = err instanceof Error ? err : new WebhookError(String(err));
    }

    if (attempt <= config.maxRetries) {
      await delay(calcDelay(attempt, config));
    }
  }

  throw lastError;
}

async function signPayload(body: string, secret: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return '';
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
