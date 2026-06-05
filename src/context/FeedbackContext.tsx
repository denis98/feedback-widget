import { createContext, useContext } from 'react';
import type { FeedbackContextValue } from '../types.js';

export const FeedbackCtx = createContext<FeedbackContextValue | null>(null);

export function useFeedbackContext(): FeedbackContextValue {
  const ctx = useContext(FeedbackCtx);
  if (!ctx) {
    throw new Error('useFeedbackContext must be used within a FeedbackProvider');
  }
  return ctx;
}
