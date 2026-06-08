import { describe, test, expect } from 'vitest';
import { buildPayload } from '../../src/utils/payload-builder.js';
import { webhookPayloadSchema } from '../../src/schema.js';

const base = { projectId: 'proj', user: null, custom: {} };

describe('buildPayload', () => {
  test('generates a valid UUID feedbackId', () => {
    const payload = buildPayload({ ...base, type: 'bug', title: 'Test', description: '' });
    expect(payload.feedbackId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  test('generates unique IDs for each call', () => {
    const p1 = buildPayload({ ...base, type: 'bug', title: 'A', description: '' });
    const p2 = buildPayload({ ...base, type: 'bug', title: 'B', description: '' });
    expect(p1.feedbackId).not.toBe(p2.feedbackId);
  });

  test('sets zone to null when not provided', () => {
    const payload = buildPayload({ ...base, type: 'general', title: 'Hi', description: '' });
    expect(payload.zone).toBeNull();
  });

  test('sets screenshot to null when not provided', () => {
    const payload = buildPayload({ ...base, type: 'general', title: 'Hi', description: '' });
    expect(payload.screenshot).toBeNull();
  });

  test('includes user info when provided', () => {
    const payload = buildPayload({
      ...base,
      type: 'bug',
      title: 'Test',
      description: '',
      user: { id: 'u1', email: 'test@example.com', name: 'Test User' },
    });
    expect(payload.user?.email).toBe('test@example.com');
  });

  test('includes custom data', () => {
    const payload = buildPayload({
      ...base,
      type: 'bug',
      title: 'Test',
      description: '',
      custom: { sprint: 'S24-01', env: 'staging' },
    });
    expect(payload.custom['sprint']).toBe('S24-01');
  });

  test('uses the provided url for context.url', () => {
    const payload = buildPayload({
      ...base,
      type: 'bug',
      title: 'T',
      description: '',
      url: 'https://app.example.com/orders/42',
    });
    expect(payload.context.url).toBe('https://app.example.com/orders/42');
  });

  test('falls back to window.location.href when url is omitted', () => {
    const payload = buildPayload({ ...base, type: 'bug', title: 'T', description: '' });
    expect(payload.context.url).toBe(window.location.href);
  });

  test('context.timestamp is ISO 8601', () => {
    const payload = buildPayload({ ...base, type: 'bug', title: 'T', description: '' });
    expect(() => new Date(payload.context.timestamp)).not.toThrow();
    expect(payload.context.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('passes full schema validation', () => {
    const payload = buildPayload({
      ...base,
      type: 'feature',
      title: 'Add dark mode',
      description: 'Would be great',
      zone: { id: 'header', label: 'Header' },
    });
    const result = webhookPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
