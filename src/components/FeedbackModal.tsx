import React, { useState, FormEvent } from 'react';
import { useFeedbackContext } from '../context/FeedbackContext.js';
import { buildPayload } from '../utils/payload-builder.js';
import { submitWithRetry } from '../utils/retry.js';
import { ScreenshotAnnotator } from './ScreenshotAnnotator.js';
import { format } from '../i18n.js';
import type { Messages } from '../i18n.js';
import type { FeedbackType, WebhookResponse } from '../types.js';

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
    addAnotherScreenshot,
  } = useFeedbackContext();

  const m = config.messages;
  const visibleFields = config.fields.filter((f) => !f.hidden);
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
      // Hidden fields carry prefilled values straight into the payload; the user
      // can't edit them, so they skip validation.
      if (!f.hidden) {
        if (f.required && !value) {
          setSubmitState({
            status: 'error',
            error: new Error(format(m.form.requiredField, { field: f.label })),
          });
          return;
        }
        if (f.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          setSubmitState({
            status: 'error',
            error: new Error(format(m.form.invalidEmail, { field: f.label })),
          });
          return;
        }
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

    // Append the affected page URL to the description so it shows up in the
    // ticket text (not just in context.url).
    const description = draftDescription.trim();
    const fullDescription = pageUrl
      ? `${description}${description ? '\n\n' : ''}${m.form.pageLabel}: ${pageUrl}`
      : description;

    const payload = buildPayload({
      type: draftType,
      title: draftTitle.trim(),
      description: fullDescription,
      zone: selectedZone,
      screenshots,
      ...(pageUrl && { url: pageUrl }),
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
          <h2 style={styles.heading}>{m.form.heading}</h2>
          <button
            onClick={handleClose}
            style={styles.closeBtn}
            aria-label={m.form.close}
            type="button"
          >
            ✕
          </button>
        </div>

        {submitState.status === 'success' ? (
          <SuccessView
            result={submitState.result}
            onClose={handleClose}
            styles={styles}
            messages={m}
          />
        ) : (
          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            noValidate
          >
            {/* Type selection */}
            {config.showType && (
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
                    {TYPE_ICONS[t]} {m.typesLong[t]}
                  </button>
                ))}
              </div>
            )}

            {/* Affected page URL */}
            {config.showUrl && pageUrl && (
              <div style={styles.urlBadge} title={pageUrl}>
                🔗 <span style={styles.urlText}>{pageUrl}</span>
              </div>
            )}

            {/* Screenshot gallery */}
            {config.screenshot && (
              <div style={styles.galleryWrap}>
                <div style={styles.galleryLabel}>
                  {m.form.screenshots}
                  {screenshots.length > 0 && ` (${screenshots.length})`} – {m.form.screenshotsHint}
                </div>
                {screenshots.length === 0 ? (
                  <div style={styles.galleryEmpty}>{m.form.noScreenshot}</div>
                ) : (
                  <div style={styles.galleryGrid}>
                    {screenshots.map((shot, i) => (
                      <div key={i} style={styles.thumbWrap}>
                        <img
                          src={shot}
                          alt={`Screenshot ${i + 1}`}
                          style={styles.thumb}
                          onClick={() => setAnnotateIndex(i)}
                          title={m.form.enlargeTitle}
                        />
                        <button
                          type="button"
                          onClick={() => removeScreenshotAt(i)}
                          style={styles.thumbRemove}
                          aria-label={format(m.form.removeScreenshot, { index: i + 1 })}
                          title={m.form.remove}
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
                {m.form.title} *
              </label>
              <input
                id="fw-title"
                style={styles.input}
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder={m.form.titlePlaceholder}
                required
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div style={styles.field}>
              <label style={styles.label} htmlFor="fw-description">
                {m.form.description}
              </label>
              <textarea
                id="fw-description"
                style={{ ...styles.input, ...styles.textarea }}
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder={m.form.descriptionPlaceholder}
                rows={4}
              />
            </div>

            {/* Flexible, app-defined fields (incl. optional contact via collectContact).
                Hidden fields are submitted with their prefilled value but not rendered. */}
            {visibleFields.length > 0 && (
              <div style={styles.contactRow}>
                {visibleFields.map((f) => (
                  <div key={f.name} style={{ ...styles.field, flex: 1, minWidth: '160px' }}>
                    <label style={styles.label} htmlFor={`fw-field-${f.name}`}>
                      {f.label}{' '}
                      {!f.required && <span style={styles.optional}>{m.form.optional}</span>}
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
                {format(m.form.submitError, { message: submitState.error.message })}
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
                  {m.form.addScreenshot}
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
                {submitState.status === 'submitting' ? m.form.submitting : m.form.submit}
              </button>
            </div>
          </form>
        )}
      </div>

      {annotateIndex !== null && annotateSrc && (
        <ScreenshotAnnotator
          src={annotateSrc}
          isDark={isDark}
          messages={m}
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
  messages,
}: {
  result: WebhookResponse;
  onClose: () => void;
  styles: ReturnType<typeof getStyles>;
  messages: Messages;
}) {
  return (
    <div style={styles.successView}>
      <div style={styles.successIcon}>✓</div>
      <h3 style={styles.successHeading}>{messages.success.heading}</h3>
      <p style={styles.successText}>{result.message ?? messages.success.message}</p>
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
        {messages.success.close}
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
    urlBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 12px',
      backgroundColor: inputBg,
      border: `1px solid ${border}`,
      borderRadius: '6px',
      marginBottom: '16px',
      fontSize: '12px',
      color: mutedText,
    },
    urlText: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
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
