import React, { useState, FormEvent } from 'react';
import { useFeedbackContext } from '../context/FeedbackContext.js';
import { buildPayload } from '../utils/payload-builder.js';
import { submitWithRetry } from '../utils/retry.js';
import { ScreenshotAnnotator } from './ScreenshotAnnotator.js';
import type { FeedbackType, WebhookResponse } from '../types.js';

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: 'Bug Report',
  feature: 'Feature Request',
  general: 'General Feedback',
};

const TYPE_ICONS: Record<FeedbackType, string> = {
  bug: '🐛',
  feature: '💡',
  general: '💬',
};

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; result: WebhookResponse }
  | { status: 'error'; error: Error };

export function FeedbackModal() {
  const {
    config,
    closeWidget,
    selectedZone,
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
    addAnotherScreenshot,
  } = useFeedbackContext();

  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' });
  const [annotateIndex, setAnnotateIndex] = useState<number | null>(null);
  const annotateSrc = annotateIndex !== null ? screenshots[annotateIndex] : undefined;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draftTitle.trim()) return;

    // Collect the flexible field values, splitting user-mapped vs custom data.
    const userFromFields: Record<string, string> = {};
    const customFromFields: Record<string, unknown> = {};
    for (const f of config.fields) {
      const value = (fieldValues[f.name] ?? '').trim();
      if (f.required && !value) {
        setSubmitState({ status: 'error', error: new Error(`Bitte „${f.label}" ausfüllen.`) });
        return;
      }
      if (f.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setSubmitState({
          status: 'error',
          error: new Error(`„${f.label}": bitte eine gültige E-Mail-Adresse angeben.`),
        });
        return;
      }
      if (!value) continue;
      if (f.mapTo) userFromFields[f.mapTo] = value;
      else customFromFields[f.name] = value;
    }

    // Merge configured user with mapped field values (entered wins).
    const mergedUser =
      config.user || Object.keys(userFromFields).length > 0
        ? { ...(config.user ?? {}), ...userFromFields }
        : null;

    const mergedCustom = { ...config.custom, ...customFromFields };

    setSubmitState({ status: 'submitting' });

    const payload = buildPayload({
      type: draftType,
      title: draftTitle.trim(),
      description: draftDescription.trim(),
      zone: selectedZone,
      screenshots,
      projectId: config.projectId,
      user: mergedUser,
      custom: mergedCustom,
    });

    try {
      const result = await submitWithRetry(
        payload,
        config.webhookUrl,
        config.retry,
        undefined,
        config.secret,
      );
      setSubmitState({ status: 'success', result });
      config.onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setSubmitState({ status: 'error', error });
      config.onError?.(error);
    }
  }

  function handleClose() {
    closeWidget();
    setSubmitState({ status: 'idle' });
  }

  const isDark = config.theme === 'dark';
  const styles = getStyles(isDark);

  return (
    <div
      style={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Feedback"
      data-feedback-widget
      data-feedback-modal
    >
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.heading}>Send Feedback</h2>
          <button
            onClick={handleClose}
            style={styles.closeBtn}
            aria-label="Close feedback"
            type="button"
          >
            ✕
          </button>
        </div>

        {submitState.status === 'success' ? (
          <SuccessView result={submitState.result} onClose={handleClose} styles={styles} />
        ) : (
          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            noValidate
          >
            {/* Type selection */}
            <div style={styles.typeRow}>
              {config.types.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDraftType(t)}
                  style={{
                    ...styles.typeBtn,
                    ...(draftType === t ? styles.typeBtnActive : {}),
                  }}
                >
                  {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            {/* Screenshot gallery */}
            {config.screenshot && (
              <div style={styles.galleryWrap}>
                <div style={styles.galleryLabel}>
                  Screenshots {screenshots.length > 0 && `(${screenshots.length})`} – anklicken zum
                  Vergrößern & Markieren
                </div>
                {screenshots.length === 0 ? (
                  <div style={styles.galleryEmpty}>
                    Noch kein Screenshot. Über „Weiteres Bild" einen Bereich aufnehmen.
                  </div>
                ) : (
                  <div style={styles.galleryGrid}>
                    {screenshots.map((shot, i) => (
                      <div key={i} style={styles.thumbWrap}>
                        <img
                          src={shot}
                          alt={`Screenshot ${i + 1}`}
                          style={styles.thumb}
                          onClick={() => setAnnotateIndex(i)}
                          title="Vergrößern & markieren"
                        />
                        <button
                          type="button"
                          onClick={() => removeScreenshotAt(i)}
                          style={styles.thumbRemove}
                          aria-label={`Screenshot ${i + 1} entfernen`}
                          title="Entfernen"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Zone indicator (only when screenshots are disabled) */}
            {!config.screenshot && selectedZone && (
              <div style={styles.zoneBadge}>
                <span>📍 {selectedZone.label}</span>
              </div>
            )}

            {/* Title */}
            <div style={styles.field}>
              <label style={styles.label} htmlFor="fw-title">
                Title *
              </label>
              <input
                id="fw-title"
                style={styles.input}
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Brief summary"
                required
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div style={styles.field}>
              <label style={styles.label} htmlFor="fw-description">
                Description
              </label>
              <textarea
                id="fw-description"
                style={{ ...styles.input, ...styles.textarea }}
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder="More details (optional)"
                rows={4}
              />
            </div>

            {/* Flexible, app-defined fields (incl. optional contact via collectContact) */}
            {config.fields.length > 0 && (
              <div style={styles.contactRow}>
                {config.fields.map((f) => (
                  <div key={f.name} style={{ ...styles.field, flex: 1, minWidth: '160px' }}>
                    <label style={styles.label} htmlFor={`fw-field-${f.name}`}>
                      {f.label} {!f.required && <span style={styles.optional}>(optional)</span>}
                    </label>
                    {f.type === 'textarea' ? (
                      <textarea
                        id={`fw-field-${f.name}`}
                        style={{ ...styles.input, ...styles.textarea }}
                        value={fieldValues[f.name] ?? ''}
                        onChange={(e) => setFieldValue(f.name, e.target.value)}
                        placeholder={f.placeholder ?? ''}
                        rows={3}
                      />
                    ) : f.type === 'select' ? (
                      <select
                        id={`fw-field-${f.name}`}
                        style={styles.input}
                        value={fieldValues[f.name] ?? ''}
                        onChange={(e) => setFieldValue(f.name, e.target.value)}
                      >
                        <option value="">–</option>
                        {(f.options ?? []).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`fw-field-${f.name}`}
                        style={styles.input}
                        type={f.type === 'email' ? 'email' : 'text'}
                        value={fieldValues[f.name] ?? ''}
                        onChange={(e) => setFieldValue(f.name, e.target.value)}
                        placeholder={f.placeholder ?? ''}
                        autoComplete={
                          f.mapTo === 'email' ? 'email' : f.mapTo === 'name' ? 'name' : 'off'
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {submitState.status === 'error' && (
              <p style={styles.errorText} role="alert">
                ⚠️ {submitState.error.message} – your feedback is preserved.
              </p>
            )}

            {/* Actions */}
            <div style={styles.actions}>
              {config.screenshot && (
                <button
                  type="button"
                  onClick={addAnotherScreenshot}
                  style={styles.secondaryBtn}
                  disabled={submitState.status === 'submitting'}
                >
                  ＋ Weiteres Bild
                </button>
              )}
              <button
                type="submit"
                style={{
                  ...styles.submitBtn,
                  ...(submitState.status === 'submitting' ? styles.submitBtnDisabled : {}),
                }}
                disabled={submitState.status === 'submitting' || !draftTitle.trim()}
              >
                {submitState.status === 'submitting' ? 'Sending…' : 'Absenden'}
              </button>
            </div>
          </form>
        )}
      </div>

      {annotateIndex !== null && annotateSrc && (
        <ScreenshotAnnotator
          src={annotateSrc}
          isDark={isDark}
          onSave={(dataUrl) => {
            updateScreenshotAt(annotateIndex, dataUrl);
            setAnnotateIndex(null);
          }}
          onClose={() => setAnnotateIndex(null)}
        />
      )}
    </div>
  );
}

function SuccessView({
  result,
  onClose,
  styles,
}: {
  result: WebhookResponse;
  onClose: () => void;
  styles: ReturnType<typeof getStyles>;
}) {
  return (
    <div style={styles.successView}>
      <div style={styles.successIcon}>✓</div>
      <h3 style={styles.successHeading}>Thank you!</h3>
      <p style={styles.successText}>{result.message ?? 'Your feedback has been received.'}</p>
      {result.ticketId && (
        <p style={styles.ticketInfo}>
          {result.ticketUrl ? (
            <a
              href={result.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.ticketLink}
            >
              #{result.ticketId}
            </a>
          ) : (
            <span>#{result.ticketId}</span>
          )}
        </p>
      )}
      <button onClick={onClose} style={styles.submitBtn} type="button">
        Close
      </button>
    </div>
  );
}

function getStyles(isDark: boolean) {
  const bg = isDark ? '#1f2937' : '#ffffff';
  const text = isDark ? '#f9fafb' : '#111827';
  const border = isDark ? '#374151' : '#e5e7eb';
  const inputBg = isDark ? '#374151' : '#f9fafb';
  const mutedText = isDark ? '#9ca3af' : '#6b7280';

  return {
    overlay: {
      position: 'fixed' as const,
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    },
    modal: {
      backgroundColor: bg,
      color: text,
      borderRadius: '12px',
      padding: '24px',
      width: '100%',
      maxWidth: '480px',
      maxHeight: '90vh',
      overflowY: 'auto' as const,
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    heading: { margin: 0, fontSize: '18px', fontWeight: 600, color: text },
    closeBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '16px',
      color: mutedText,
      padding: '4px',
    },
    typeRow: {
      display: 'flex',
      gap: '8px',
      marginBottom: '16px',
      flexWrap: 'wrap' as const,
    },
    typeBtn: {
      padding: '6px 12px',
      borderRadius: '6px',
      border: `1px solid ${border}`,
      background: inputBg,
      color: text,
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 500,
    },
    typeBtnActive: {
      borderColor: '#2563eb',
      backgroundColor: '#eff6ff',
      color: '#1d4ed8',
    },
    galleryWrap: { marginBottom: '16px' },
    galleryLabel: {
      fontSize: '12px',
      fontWeight: 500,
      color: mutedText,
      marginBottom: '8px',
    },
    galleryEmpty: {
      padding: '12px',
      borderRadius: '8px',
      border: `1px dashed ${border}`,
      backgroundColor: inputBg,
      color: mutedText,
      fontSize: '13px',
      textAlign: 'center' as const,
    },
    galleryGrid: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '8px',
    },
    thumbWrap: {
      position: 'relative' as const,
      width: '92px',
      height: '64px',
      borderRadius: '8px',
      overflow: 'hidden',
      border: `1px solid ${border}`,
      backgroundColor: inputBg,
    },
    thumb: {
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
      cursor: 'zoom-in',
      display: 'block',
    },
    thumbRemove: {
      position: 'absolute' as const,
      top: '3px',
      right: '3px',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      border: 'none',
      backgroundColor: 'rgba(0,0,0,0.6)',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '11px',
      lineHeight: 1,
    },
    zoneBadge: {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      backgroundColor: isDark ? '#1e3a5f' : '#eff6ff',
      borderRadius: '6px',
      marginBottom: '16px',
      fontSize: '13px',
      color: isDark ? '#93c5fd' : '#1d4ed8',
    },
    field: { marginBottom: '16px' },
    contactRow: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap' as const,
    },
    optional: { color: mutedText, fontWeight: 400 },
    label: {
      display: 'block',
      marginBottom: '6px',
      fontSize: '13px',
      fontWeight: 500,
      color: text,
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      borderRadius: '6px',
      border: `1px solid ${border}`,
      backgroundColor: inputBg,
      color: text,
      fontSize: '14px',
      boxSizing: 'border-box' as const,
      outline: 'none',
    },
    textarea: { resize: 'vertical' as const, minHeight: '80px' },
    errorText: {
      color: '#dc2626',
      fontSize: '13px',
      marginBottom: '12px',
    },
    actions: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
    },
    secondaryBtn: {
      padding: '10px 14px',
      borderRadius: '8px',
      border: `1px solid ${border}`,
      backgroundColor: inputBg,
      color: text,
      fontWeight: 600,
      fontSize: '14px',
      cursor: 'pointer',
      whiteSpace: 'nowrap' as const,
    },
    submitBtn: {
      flex: 1,
      width: '100%',
      padding: '10px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: '#2563eb',
      color: '#ffffff',
      fontWeight: 600,
      fontSize: '14px',
      cursor: 'pointer',
    },
    submitBtnDisabled: {
      backgroundColor: '#93c5fd',
      cursor: 'not-allowed',
    },
    successView: { textAlign: 'center' as const, padding: '16px 0' },
    successIcon: {
      width: '48px',
      height: '48px',
      backgroundColor: '#22c55e',
      color: '#fff',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      margin: '0 auto 16px',
    },
    successHeading: { margin: '0 0 8px', fontSize: '18px', color: text },
    successText: { color: mutedText, marginBottom: '12px', fontSize: '14px' },
    ticketInfo: { marginBottom: '20px', fontSize: '14px' },
    ticketLink: { color: '#2563eb', textDecoration: 'none', fontWeight: 600 },
  };
}
