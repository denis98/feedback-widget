import React, { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useFeedbackContext } from '../context/FeedbackContext.js';

interface FeedbackZoneProps {
  id: string;
  label: string;
  meta?: Record<string, unknown>;
  children: ReactNode;
}

export function FeedbackZone({ id, label, meta, children }: FeedbackZoneProps) {
  const { registerZone, unregisterZone, phase, config, confirmSelection, selectedZone } =
    useFeedbackContext();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerZone({ id, label, element: el, ...(meta !== undefined && { meta }) });
    return () => unregisterZone(id);
  }, [id, label, meta, registerZone, unregisterZone]);

  const isSelecting =
    phase === 'selecting' && (config.selectionMode === 'zone' || config.selectionMode === 'hybrid');

  const isSelected = selectedZone?.id === id;

  function handleClick(e: React.MouseEvent) {
    if (!isSelecting) return;
    e.stopPropagation();
    confirmSelection({ id, label, ...(meta !== undefined && { meta }) });
  }

  return (
    <div
      ref={ref}
      data-feedback-zone={id}
      data-feedback-label={label}
      onClick={isSelecting ? handleClick : undefined}
      style={
        isSelecting
          ? {
              outline: isSelected ? '2px solid #22c55e' : '2px dashed #60a5fa',
              outlineOffset: '3px',
              cursor: 'crosshair',
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
