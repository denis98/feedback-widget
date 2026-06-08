// Components
export { FeedbackProvider } from './components/FeedbackProvider.js';
export { FeedbackZone } from './components/FeedbackZone.js';
export { FeedbackWidget } from './components/FeedbackWidget.js';

// Hooks
export { useFeedbackContext } from './context/FeedbackContext.js';

// Utilities
export { formatters } from './formatters.js';
export { buildPayload } from './utils/payload-builder.js';
export { submitWithRetry, WebhookError } from './utils/retry.js';
export { getCssPath } from './utils/css-selector.js';
export { captureScreenshot, resolveTargetElement } from './utils/screenshot.js';
export type { ScreenshotOptions } from './utils/screenshot.js';
export { startAutoDiscovery } from './components/AutoDiscovery.js';

// i18n
export { builtinMessages, resolveMessages, format } from './i18n.js';
export type { Messages, DeepPartial } from './i18n.js';

// Schema
export {
  webhookPayloadSchema,
  webhookResponseSchema,
  zoneInfoSchema,
  feedbackContextSchema,
  userInfoSchema,
} from './schema.js';

// Types
export type {
  FeedbackType,
  SelectionMode,
  Theme,
  Position,
  ZoneInfo,
  FeedbackField,
  ClipRect,
  FeedbackContext,
  UserInfo,
  WebhookPayload,
  WebhookResponse,
  RetryConfig,
  ZoneRegistration,
  FeedbackProviderConfig,
  FeedbackContextValue,
  BuildPayloadInput,
  TriggerRenderProps,
} from './types.js';
