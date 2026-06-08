import type { ReactNode } from 'react';
import type { DeepPartial, Messages } from './i18n.js';

export type FeedbackType = 'bug' | 'feature' | 'general';

export type SelectionMode = 'zone' | 'pixel' | 'hybrid' | 'region' | 'none';

/** A viewport-relative rectangle in CSS pixels. */
export interface ClipRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Theme = 'light' | 'dark' | 'auto';

export type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface ZoneInfo {
  id: string;
  label: string;
  cssPath?: string;
  meta?: Record<string, unknown>;
}

/**
 * A configurable form field. Lets each embedding application define its own
 * data to collect — a flexible schema rather than hardcoded fields.
 */
export interface FeedbackField {
  /** Key used in the payload (under `custom`, unless `mapTo` is set). */
  name: string;
  label: string;
  type?: 'text' | 'email' | 'textarea' | 'select';
  required?: boolean;
  placeholder?: string;
  /** Options for `type: 'select'`. */
  options?: { value: string; label: string }[];
  /** Map the value into `payload.user` instead of `payload.custom`. */
  mapTo?: 'name' | 'email' | 'id';
  /** Prefill value (e.g. from the host app's known user). */
  defaultValue?: string;
}

export interface FeedbackContext {
  url: string;
  userAgent: string;
  viewport: { width: number; height: number };
  timestamp: string;
  locale: string;
}

export interface UserInfo {
  id?: string;
  email?: string;
  name?: string;
}

export interface WebhookPayload {
  projectId: string;
  feedbackId: string;
  type: FeedbackType;
  title: string;
  description: string;
  zone: ZoneInfo | null;
  context: FeedbackContext;
  user: UserInfo | null;
  /** First screenshot (backward-compatible). Equals screenshots[0] or null. */
  screenshot: string | null;
  /** All attached screenshots (base64 PNG data URLs). */
  screenshots: string[];
  custom: Record<string, unknown>;
}

export interface WebhookResponse {
  ticketId?: string;
  ticketUrl?: string;
  message?: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export interface ZoneRegistration {
  id: string;
  label: string;
  element: HTMLElement;
  meta?: Record<string, unknown>;
}

export type WidgetPhase = 'idle' | 'selecting' | 'capturing' | 'form';

export interface TriggerRenderProps {
  open: () => void;
  isOpen: boolean;
}

export interface FeedbackProviderConfig {
  webhookUrl: string;
  projectId?: string;
  user?: UserInfo | null;
  custom?: Record<string, unknown>;
  types?: FeedbackType[];
  retry?: Partial<RetryConfig>;
  selectionMode?: SelectionMode;
  autoDiscovery?: boolean;
  screenshot?: boolean;
  /** Include mouse cursor in screenshot. Default: false. Only affects Screen Capture API. */
  screenshotCursor?: boolean;
  /**
   * Show optional name + email fields in the form so anonymous submitters can
   * leave contact details (to be thanked / followed up by email). Prefilled
   * from `user` when provided. Default: false.
   *
   * Sugar for two `fields` ({name→name}, {email→email}); for anything beyond
   * name/email use `fields` directly.
   */
  collectContact?: boolean;
  /**
   * Flexible form schema — extra fields rendered in the form. Each app can
   * declare whatever data it wants to collect. Values land in `payload.custom`
   * (or `payload.user` when `mapTo` is set).
   */
  fields?: FeedbackField[];
  position?: Position;
  theme?: Theme;
  /**
   * Selects the built-in message pack: `'en'` (default) or `'de'`. Unknown
   * locales fall back to English. Combine with `messages` to add languages.
   */
  locale?: string;
  /**
   * Override individual UI strings (deep-merged onto the `locale` pack). Pass a
   * full {@link Messages} object under a new key — or just the strings you want
   * to change — to localize or rebrand the widget.
   */
  messages?: DeepPartial<Messages>;
  /**
   * Show the feedback-type selector (Bug/Feature/General) inside the form.
   * Redundant when the type is already chosen via the floating trigger.
   * Default: true.
   */
  showType?: boolean;
  /**
   * Show the affected page URL inside the form. The URL is always transmitted
   * regardless (in `context.url` and appended to the description). Default: true.
   */
  showUrl?: boolean;
  onSuccess?: (result: WebhookResponse) => void;
  onError?: (error: Error) => void;
  secret?: string;
  /**
   * Custom trigger element.
   * - Pass a render function to replace the default floating button.
   * - Pass `null` to hide the button entirely (control via `useFeedbackContext`).
   * - Omit to use the default floating button.
   */
  trigger?: ((props: TriggerRenderProps) => ReactNode) | null;
}

export interface ResolvedConfig {
  webhookUrl: string;
  projectId: string;
  user: UserInfo | null;
  custom: Record<string, unknown>;
  types: FeedbackType[];
  retry: RetryConfig;
  selectionMode: SelectionMode;
  autoDiscovery: boolean;
  screenshot: boolean;
  screenshotCursor: boolean;
  collectContact: boolean;
  fields: FeedbackField[];
  position: Position;
  theme: Theme;
  locale: string;
  /** Resolved message dictionary (built-in pack merged with overrides). */
  messages: Messages;
  showType: boolean;
  showUrl: boolean;
  onSuccess?: ((result: WebhookResponse) => void) | undefined;
  onError?: ((error: Error) => void) | undefined;
  secret?: string | undefined;
}

export interface FeedbackContextValue {
  config: ResolvedConfig;
  zones: Map<string, ZoneRegistration>;
  registerZone: (zone: ZoneRegistration) => void;
  unregisterZone: (id: string) => void;
  /** Current phase of the widget state machine */
  phase: WidgetPhase;
  /** @deprecated use phase instead */
  isOpen: boolean;
  /** Enter selection mode (or form directly when selectionMode=none) */
  openWidget: () => void;
  /**
   * Confirm selection; captures a screenshot (if enabled) then opens the form.
   * Pass a clip rect to capture a free region instead of the zone's element.
   */
  confirmSelection: (zone?: ZoneInfo | null, clip?: ClipRect) => void;
  /** Go back to selection to add another screenshot, keeping the current draft */
  addAnotherScreenshot: () => void;
  /** Open the form directly without capturing a screenshot */
  skipSelection: () => void;
  /** Close and reset everything */
  closeWidget: () => void;
  selectedZone: ZoneInfo | null;
  setSelectedZone: (zone: ZoneInfo | null) => void;
  /**
   * URL of the page the feedback is about, captured when the widget opened.
   * Survives SPA navigation between opening and submitting.
   */
  pageUrl: string;

  // ── Draft (lifted here so it survives the modal unmounting during capture
  //    and SPA page navigation between captures) ──
  draftType: FeedbackType;
  setDraftType: (t: FeedbackType) => void;
  draftTitle: string;
  setDraftTitle: (s: string) => void;
  draftDescription: string;
  setDraftDescription: (s: string) => void;
  /** Values for the configurable form fields (keyed by field name). */
  fieldValues: Record<string, string>;
  setFieldValue: (name: string, value: string) => void;
  /** Collected screenshots (base64 PNG data URLs). */
  screenshots: string[];
  /** Replace the screenshot at an index (used after annotation). */
  updateScreenshotAt: (index: number, dataUrl: string) => void;
  /** Remove a collected screenshot. */
  removeScreenshotAt: (index: number) => void;
}

export interface BuildPayloadInput {
  type: FeedbackType;
  title: string;
  description: string;
  zone?: ZoneInfo | null;
  screenshot?: string | null;
  screenshots?: string[];
  projectId: string;
  user: UserInfo | null;
  custom: Record<string, unknown>;
  /**
   * URL of the page the feedback is about. Captured when the widget opens so it
   * survives SPA navigation between opening and submitting. Falls back to
   * `window.location.href` at submit time when omitted.
   */
  url?: string;
}
