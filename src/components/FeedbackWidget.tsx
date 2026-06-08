import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { useFeedbackContext } from '../context/FeedbackContext.js';
import { FeedbackModal } from './FeedbackModal.js';
import { RegionSelector } from './RegionSelector.js';
import { format } from '../i18n.js';
import type { Messages } from '../i18n.js';
import type { FeedbackType, TriggerRenderProps } from '../types.js';

interface FeedbackWidgetProps {
  trigger?: ((props: TriggerRenderProps) => ReactNode) | null;
}

const POSITION_STYLES: Record<string, React.CSSProperties> = {
  'bottom-right': { bottom: '24px', right: '24px' },
  'bottom-left': { bottom: '24px', left: '24px' },
  'top-right': { top: '24px', right: '24px' },
  'top-left': { top: '24px', left: '24px' },
};

const TYPE_ICONS: Record<FeedbackType, string> = {
  bug: '🐛',
  feature: '💡',
  general: '💬',
};

export function FeedbackWidget({ trigger }: FeedbackWidgetProps) {
  const {
    phase,
    openWidget,
    closeWidget,
    confirmSelection,
    skipSelection,
    config,
    selectedZone,
    setDraftType,
  } = useFeedbackContext();

  const m = config.messages;

  const isDark =
    config.theme === 'dark' ||
    (config.theme === 'auto' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const positionStyle = POSITION_STYLES[config.position] ?? POSITION_STYLES['bottom-right'];

  // Open the widget pre-selected to a feedback type.
  const openWithType = (t: FeedbackType) => {
    setDraftType(t);
    openWidget();
  };

  // ── Floating trigger button (idle) ─────────────────────────────────────
  const triggerElement: ReactNode =
    phase !== 'idle' ? null : trigger === null ? null : trigger !== undefined ? ( // hide while active
      trigger({ open: openWidget, isOpen: false })
    ) : (
      <DefaultTrigger
        isDark={isDark}
        positionStyle={positionStyle ?? POSITION_STYLES['bottom-right']!}
        types={config.types}
        messages={m}
        onOpen={openWidget}
        onPick={openWithType}
      />
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
            <span>{format(m.selection.selected, { label: selectedZone.label })}</span>
            <button
              type="button"
              onClick={() => confirmSelection()}
              style={selectionActionBtn('#22c55e')}
            >
              {m.selection.continue}
            </button>
            <button
              type="button"
              onClick={() => confirmSelection(null)}
              style={selectionActionBtn('#64748b')}
            >
              {m.selection.clearSelection}
            </button>
          </>
        ) : (
          <>
            <span>{m.selection.prompt}</span>
            <button
              type="button"
              onClick={() => confirmSelection(null)}
              style={selectionActionBtn('#2563eb')}
            >
              {config.screenshot ? m.selection.fullScreen : m.selection.skip}
            </button>
            {config.screenshot && (
              <button type="button" onClick={skipSelection} style={selectionActionBtn('#64748b')}>
                {m.selection.withoutScreenshot}
              </button>
            )}
          </>
        )}
        <button
          type="button"
          onClick={closeWidget}
          aria-label={m.selection.cancel}
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
        {m.capturing}
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

// Floating trigger that expands on hover into one button per feedback type.
function DefaultTrigger({
  isDark,
  positionStyle,
  types,
  messages,
  onOpen,
  onPick,
}: {
  isDark: boolean;
  positionStyle: React.CSSProperties;
  types: FeedbackType[];
  messages: Messages;
  onOpen: () => void;
  onPick: (t: FeedbackType) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // The outer wrapper stays mounted across the collapsed↔expanded swap so its
  // onMouseLeave keeps firing while the inner content (pill ↔ type container)
  // is replaced.
  return (
    <div
      data-feedback-widget
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        position: 'fixed',
        ...positionStyle,
        zIndex: 9998,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {expanded ? (
        // Container that replaces the hovered Feedback button: the three type
        // buttons grouped side by side as a segmented control.
        <div role="group" aria-label={messages.trigger.chooseType} style={typeContainer(isDark)}>
          {types.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => onPick(t)}
              aria-label={format(messages.trigger.typeAria, { type: messages.types[t] })}
              title={messages.types[t]}
              style={typeSegment(isDark, i > 0)}
            >
              <span aria-hidden="true" style={{ fontSize: '20px', lineHeight: 1 }}>
                {TYPE_ICONS[t]}
              </span>
              <span>{messages.types[t]}</span>
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          onFocus={() => setExpanded(true)}
          aria-label={messages.trigger.openAria}
          style={triggerPill(isDark)}
        >
          💬 {messages.trigger.open}
        </button>
      )}
    </div>
  );
}

function triggerPill(isDark: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    borderRadius: '999px',
    border: 'none',
    backgroundColor: isDark ? '#1f2937' : '#2563eb',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    whiteSpace: 'nowrap',
  };
}

function typeContainer(isDark: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'stretch',
    borderRadius: '16px',
    overflow: 'hidden',
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
  };
}

function typeSegment(isDark: boolean, withDivider: boolean): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '12px 18px',
    minWidth: '76px',
    border: 'none',
    borderLeft: withDivider ? `1px solid ${isDark ? '#374151' : '#e5e7eb'}` : 'none',
    backgroundColor: 'transparent',
    color: isDark ? '#f9fafb' : '#1e293b',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
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
