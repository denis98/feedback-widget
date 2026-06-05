import React from 'react';
import type { ReactNode } from 'react';
import { useFeedbackContext } from '../context/FeedbackContext.js';
import { FeedbackModal } from './FeedbackModal.js';
import { RegionSelector } from './RegionSelector.js';
import type { TriggerRenderProps } from '../types.js';

interface FeedbackWidgetProps {
  trigger?: ((props: TriggerRenderProps) => ReactNode) | null;
}

const POSITION_STYLES: Record<string, React.CSSProperties> = {
  'bottom-right': { bottom: '24px', right: '24px' },
  'bottom-left': { bottom: '24px', left: '24px' },
  'top-right': { top: '24px', right: '24px' },
  'top-left': { top: '24px', left: '24px' },
};

export function FeedbackWidget({ trigger }: FeedbackWidgetProps) {
  const { phase, openWidget, closeWidget, confirmSelection, skipSelection, config, selectedZone } =
    useFeedbackContext();

  const isDark =
    config.theme === 'dark' ||
    (config.theme === 'auto' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const positionStyle = POSITION_STYLES[config.position] ?? POSITION_STYLES['bottom-right'];

  // ── Floating trigger button (idle) ─────────────────────────────────────
  const triggerElement: ReactNode =
    phase !== 'idle' ? null : trigger === null ? null : trigger !== undefined ? ( // hide while active
      trigger({ open: openWidget, isOpen: false })
    ) : (
      <button
        type="button"
        onClick={openWidget}
        aria-label="Open feedback"
        data-feedback-widget
        style={{
          position: 'fixed',
          ...positionStyle,
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          borderRadius: '999px',
          border: 'none',
          backgroundColor: isDark ? '#1f2937' : '#2563eb',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '14px',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        💬 Feedback
      </button>
    );

  // ── Selection bar (selecting phase) ────────────────────────────────────
  const selectionBar: ReactNode =
    phase === 'selecting' ? (
      <div
        data-feedback-widget
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 20px',
          borderRadius: '999px',
          backgroundColor: isDark ? '#1f2937' : '#1e293b',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '14px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
        }}
      >
        {selectedZone ? (
          <>
            <span>
              📍 <strong>{selectedZone.label}</strong> ausgewählt
            </span>
            <button
              type="button"
              onClick={() => confirmSelection()}
              style={selectionActionBtn('#22c55e')}
            >
              Weiter →
            </button>
            <button
              type="button"
              onClick={() => confirmSelection(null)}
              style={selectionActionBtn('#64748b')}
            >
              Auswahl entfernen
            </button>
          </>
        ) : (
          <>
            <span>🎯 Bereich aufziehen oder Element anklicken –</span>
            <button
              type="button"
              onClick={() => confirmSelection(null)}
              style={selectionActionBtn('#2563eb')}
            >
              {config.screenshot ? '🖥 Ganzer Bildschirm' : 'Überspringen'}
            </button>
            {config.screenshot && (
              <button type="button" onClick={skipSelection} style={selectionActionBtn('#64748b')}>
                Ohne Screenshot
              </button>
            )}
          </>
        )}
        <button
          type="button"
          onClick={closeWidget}
          aria-label="Abbrechen"
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
    ) : null;

  // ── Capturing indicator ────────────────────────────────────────────────
  const capturingBar: ReactNode =
    phase === 'capturing' ? (
      <div
        data-feedback-widget
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 20px',
          borderRadius: '999px',
          backgroundColor: isDark ? '#1f2937' : '#1e293b',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '14px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
        }}
      >
        📸 Screenshot wird erstellt…
      </div>
    ) : null;

  return (
    <>
      {triggerElement}
      {selectionBar}
      {capturingBar}
      {/* Element click + drag-to-select region, active during selecting phase */}
      <RegionSelector />
      {/* Modal only in form phase */}
      {phase === 'form' && <FeedbackModal />}
    </>
  );
}

function selectionActionBtn(bg: string): React.CSSProperties {
  return {
    padding: '5px 12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: bg,
    color: '#fff',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
  };
}
