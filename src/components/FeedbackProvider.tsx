import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { FeedbackCtx } from '../context/FeedbackContext.js';
import type {
  FeedbackProviderConfig,
  FeedbackContextValue,
  ResolvedConfig,
  ZoneRegistration,
  ZoneInfo,
  WidgetPhase,
} from '../types.js';
import { FeedbackWidget } from './FeedbackWidget.js';
import { startAutoDiscovery } from './AutoDiscovery.js';
import { captureScreenshot, resolveTargetElement } from '../utils/screenshot.js';
import type { FeedbackType, ClipRect, FeedbackField } from '../types.js';

interface FeedbackProviderProps extends FeedbackProviderConfig {
  children: ReactNode;
}

export function FeedbackProvider({
  children,
  webhookUrl,
  projectId = 'default',
  user = null,
  custom = {},
  types = ['bug', 'feature', 'general'],
  retry,
  selectionMode = 'hybrid',
  autoDiscovery = true,
  screenshot = false,
  screenshotCursor = false,
  collectContact = false,
  fields = [],
  position = 'bottom-right',
  theme = 'auto',
  locale = 'en',
  onSuccess,
  onError,
  secret,
  trigger,
}: FeedbackProviderProps) {
  const [zones, setZones] = useState<Map<string, ZoneRegistration>>(new Map());
  const [phase, setPhase] = useState<WidgetPhase>('idle');
  const [selectedZone, setSelectedZone] = useState<ZoneInfo | null>(null);

  // Draft lives here (not in the modal) so it survives the modal unmounting
  // during capture and SPA page navigation between captures.
  const [draftType, setDraftType] = useState<FeedbackType>(types[0] ?? 'general');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  // URL of the page the feedback is about, captured when the widget opens so it
  // survives SPA navigation between opening and submitting.
  const [pageUrl, setPageUrl] = useState('');

  // Flexible form schema: optional contact fields (sugar) + app-defined fields.
  const resolvedFields = useMemo<FeedbackField[]>(() => {
    const contact: FeedbackField[] = collectContact
      ? [
          {
            name: 'name',
            label: 'Name',
            type: 'text',
            mapTo: 'name',
            placeholder: 'Dein Name',
            defaultValue: user?.name ?? '',
          },
          {
            name: 'email',
            label: 'E-Mail',
            type: 'email',
            mapTo: 'email',
            placeholder: 'du@example.com',
            defaultValue: user?.email ?? '',
          },
        ]
      : [];
    return [...contact, ...(fields ?? [])];
  }, [collectContact, fields, user]);

  const initialFieldValues = useCallback((): Record<string, string> => {
    const v: Record<string, string> = {};
    for (const f of resolvedFields) v[f.name] = f.defaultValue ?? '';
    return v;
  }, [resolvedFields]);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>(initialFieldValues);
  const setFieldValue = useCallback((name: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Always-current zones map for capture invoked from event handlers.
  const zonesRef = useRef(zones);
  useEffect(() => {
    zonesRef.current = zones;
  }, [zones]);

  const registerZone = useCallback((zone: ZoneRegistration) => {
    setZones((prev) => {
      const next = new Map(prev);
      next.set(zone.id, zone);
      return next;
    });
  }, []);

  const unregisterZone = useCallback((id: string) => {
    setZones((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Auto-discovery via MutationObserver
  const autoDiscoveryCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!autoDiscovery) return;
    autoDiscoveryCleanupRef.current = startAutoDiscovery(document, registerZone, unregisterZone);
    return () => autoDiscoveryCleanupRef.current?.();
  }, [autoDiscovery, registerZone, unregisterZone]);

  // Captures a screenshot for the given selection (or full page) and appends it,
  // then opens the form. Invoked from click handlers so getDisplayMedia keeps
  // its required user activation.
  const confirmSelection = useCallback(
    async (zone?: ZoneInfo | null, clip?: ClipRect) => {
      if (zone !== undefined) setSelectedZone(zone);
      const effectiveZone = zone === undefined ? selectedZone : zone;

      if (!screenshot) {
        setPhase('form');
        return;
      }

      setPhase('capturing');
      try {
        // A clip (free region) takes priority over resolving the zone's element.
        const targetEl = clip
          ? undefined
          : effectiveZone
            ? resolveTargetElement(effectiveZone.id, effectiveZone.cssPath, zonesRef.current)
            : undefined;
        const data = await captureScreenshot({
          ...(clip !== undefined && { clip }),
          ...(targetEl !== undefined && { targetEl }),
          cursor: screenshotCursor,
        });
        setScreenshots((prev) => [...prev, data]);
      } catch (err) {
        console.warn('[feedback-widget] Screenshot failed:', err);
      }
      setPhase('form');
    },
    [selectedZone, screenshot, screenshotCursor],
  );

  const openWidget = useCallback(() => {
    // Capture the page URL at the start of the feedback session, before any
    // SPA navigation can change window.location.
    if (typeof window !== 'undefined') setPageUrl(window.location.href);
    // Skip selection phase when there's nothing to select.
    if (selectionMode === 'none') {
      void confirmSelection(null);
    } else {
      setSelectedZone(null);
      setPhase('selecting');
    }
  }, [selectionMode, confirmSelection]);

  // "Weiteres Bild": keep the draft + collected screenshots, go capture another.
  const addAnotherScreenshot = useCallback(() => {
    if (selectionMode === 'none') {
      void confirmSelection(null);
      return;
    }
    setSelectedZone(null);
    setPhase('selecting');
  }, [selectionMode, confirmSelection]);

  // Open the form straight away, no screenshot captured.
  const skipSelection = useCallback(() => {
    if (typeof window !== 'undefined') setPageUrl(window.location.href);
    setSelectedZone(null);
    setPhase('form');
  }, []);

  const updateScreenshotAt = useCallback((index: number, dataUrl: string) => {
    setScreenshots((prev) => prev.map((s, i) => (i === index ? dataUrl : s)));
  }, []);

  const removeScreenshotAt = useCallback((index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const closeWidget = useCallback(() => {
    setPhase('idle');
    setSelectedZone(null);
    setDraftTitle('');
    setDraftDescription('');
    setFieldValues(initialFieldValues());
    setDraftType(types[0] ?? 'general');
    setScreenshots([]);
  }, [types, initialFieldValues]);

  const resolvedRetry = useMemo(
    () => ({
      maxRetries: retry?.maxRetries ?? 3,
      baseDelay: retry?.baseDelay ?? 1000,
      maxDelay: retry?.maxDelay ?? 10000,
      backoffFactor: retry?.backoffFactor ?? 2,
    }),
    [retry],
  );

  const config = useMemo<ResolvedConfig>(
    () => ({
      webhookUrl,
      projectId,
      user: user ?? null,
      custom: custom ?? {},
      types: types ?? ['bug', 'feature', 'general'],
      retry: resolvedRetry,
      selectionMode: selectionMode ?? 'hybrid',
      autoDiscovery: autoDiscovery ?? true,
      screenshot: screenshot ?? false,
      screenshotCursor: screenshotCursor ?? false,
      collectContact: collectContact ?? false,
      fields: resolvedFields,
      position: position ?? 'bottom-right',
      theme: theme ?? 'auto',
      locale: locale ?? 'en',
      ...(onSuccess !== undefined && { onSuccess }),
      ...(onError !== undefined && { onError }),
      ...(secret !== undefined && { secret }),
    }),
    [
      webhookUrl,
      projectId,
      user,
      custom,
      types,
      resolvedRetry,
      selectionMode,
      autoDiscovery,
      screenshot,
      screenshotCursor,
      collectContact,
      resolvedFields,
      position,
      theme,
      locale,
      onSuccess,
      onError,
      secret,
    ],
  );

  const value: FeedbackContextValue = useMemo(
    () => ({
      config,
      zones,
      registerZone,
      unregisterZone,
      phase,
      isOpen: phase === 'form',
      openWidget,
      confirmSelection,
      addAnotherScreenshot,
      skipSelection,
      closeWidget,
      selectedZone,
      setSelectedZone,
      pageUrl,
      draftType,
      setDraftType,
      draftTitle,
      setDraftTitle,
      draftDescription,
      setDraftDescription,
      fieldValues,
      setFieldValue,
      screenshots,
      updateScreenshotAt,
      removeScreenshotAt,
    }),
    [
      config,
      zones,
      registerZone,
      unregisterZone,
      phase,
      openWidget,
      confirmSelection,
      addAnotherScreenshot,
      skipSelection,
      closeWidget,
      selectedZone,
      pageUrl,
      draftType,
      draftTitle,
      draftDescription,
      fieldValues,
      setFieldValue,
      screenshots,
      updateScreenshotAt,
      removeScreenshotAt,
    ],
  );

  return (
    <FeedbackCtx.Provider value={value}>
      {children}
      <FeedbackWidget {...(trigger !== undefined && { trigger })} />
    </FeedbackCtx.Provider>
  );
}
