import { z } from 'zod';

export const zoneInfoSchema = z.object({
  id: z.string(),
  label: z.string(),
  cssPath: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});

export const feedbackContextSchema = z.object({
  url: z.string().url(),
  userAgent: z.string(),
  viewport: z.object({ width: z.number(), height: z.number() }),
  timestamp: z.string().datetime(),
  locale: z.string(),
});

export const userInfoSchema = z.object({
  id: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
});

export const webhookPayloadSchema = z.object({
  projectId: z.string(),
  feedbackId: z.string().uuid(),
  type: z.enum(['bug', 'feature', 'general']),
  title: z.string().min(1),
  description: z.string(),
  zone: zoneInfoSchema.nullable(),
  context: feedbackContextSchema,
  user: userInfoSchema.nullable(),
  screenshot: z.string().nullable(),
  screenshots: z.array(z.string()).default([]),
  custom: z.record(z.unknown()),
});

export const webhookResponseSchema = z.object({
  ticketId: z.string().optional(),
  ticketUrl: z.string().url().optional(),
  message: z.string().optional(),
});

export type WebhookPayloadInput = z.input<typeof webhookPayloadSchema>;
export type WebhookPayloadOutput = z.output<typeof webhookPayloadSchema>;
