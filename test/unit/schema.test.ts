import { describe, test, expect } from 'vitest';
import { webhookPayloadSchema } from '../../src/schema.js';
import { buildPayload } from '../../src/utils/payload-builder.js';

const baseInput = {
  projectId: 'test-project',
  user: null,
  custom: {},
};

describe('webhookPayloadSchema', () => {
  test('generated payload matches schema', () => {
    const payload = buildPayload({
      ...baseInput,
      type: 'feature',
      title: 'Dark Mode',
      description: 'Please add dark mode support',
    });

    const result = webhookPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  test('rejects payload without title', () => {
    const payload = buildPayload({
      ...baseInput,
      type: 'bug',
      title: '',
      description: 'Something is broken',
    });

    const result = webhookPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  test('rejects payload with invalid feedbackId', () => {
    const payload = buildPayload({
      ...baseInput,
      type: 'general',
      title: 'Hello',
      description: '',
    });
    const invalid = { ...payload, feedbackId: 'not-a-uuid' };

    const result = webhookPayloadSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test('accepts null user and null zone', () => {
    const payload = buildPayload({
      ...baseInput,
      type: 'bug',
      title: 'Something broke',
      description: '',
      zone: null,
    });

    const result = webhookPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  test('accepts zone with full info', () => {
    const payload = buildPayload({
      ...baseInput,
      type: 'bug',
      title: 'Navigation issue',
      description: '',
      zone: {
        id: 'nav',
        label: 'Navigation',
        cssPath: 'header > nav',
        meta: { team: 'frontend' },
      },
    });

    const result = webhookPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.zone?.id).toBe('nav');
      expect(result.data.zone?.meta?.['team']).toBe('frontend');
    }
  });

  test('rejects invalid feedback type', () => {
    const payload = buildPayload({
      ...baseInput,
      type: 'bug',
      title: 'Test',
      description: '',
    });
    const invalid = { ...payload, type: 'invalid' };

    const result = webhookPayloadSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test('requires context.url to be a URL', () => {
    const payload = buildPayload({
      ...baseInput,
      type: 'general',
      title: 'Test',
      description: '',
    });
    const invalid = { ...payload, context: { ...payload.context, url: 'not-a-url' } };

    const result = webhookPayloadSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
