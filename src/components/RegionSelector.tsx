import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useFeedbackContext } from '../context/FeedbackContext.js';
import { getCssPath } from '../utils/css-selector.js';

/**
 * Selection during the 'selecting' phase. Supports two gestures:
 *
 *  • Click an element  → selects that single DOM element (like a pixel pick).
 *  • Drag a rectangle  → selects a free region spanning whatever is underneath,
 *                        so the user can grab several components / an exact area.
 *
 * Active for selectionMode 'pixel' | 'hybrid' | 'region'. In 'region' mode only
 * dragging is offered; in 'hybrid' mode zones take priority over element clicks.
 */

const DRAG_THRESHOLD = 6;

interface DragState {
  startX: number;
  startY: number;
  dragging: boolean;
  moved: boolean;
}

export function RegionSelector() {
  const { phase, config, confirmSelection, zones } = useFeedbackContext();

  const isActive =
    phase === 'selecting' &&
    (config.selectionMode === 'pixel' ||
      config.selectionMode === 'hybrid' ||
      config.selectionMode === 'region');

  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragRef = useRef<DragState>({ startX: 0, startY: 0, dragging: false, moved: false });

  const getZoneForElement = useCallback(
    (el: Element) => {
      for (const zone of zones.values()) {
        if (zone.element.contains(el)) return zone;
      }
      return null;
    },
    [zones],
  );

  useEffect(() => {
    if (!isActive) return;

    const allowPixel = config.selectionMode !== 'region';
    let highlighted: HTMLElement | null = null;

    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    function isWidget(el: Element | null): boolean {
      return !!el && !!(el as HTMLElement).closest?.('[data-feedback-widget]');
    }

    function highlight(el: HTMLElement | null) {
      if (highlighted && highlighted !== el) {
        highlighted.style.removeProperty('outline');
        highlighted.style.removeProperty('outline-offset');
        highlighted.style.removeProperty('cursor');
      }
      if (el) {
        el.style.outline = '2px solid #f97316';
        el.style.outlineOffset = '2px';
        el.style.cursor = 'crosshair';
      }
      highlighted = el;
    }

    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (isWidget(target)) return;
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startY: e.clientY, dragging: true, moved: false };
    }

    function onPointerMove(e: PointerEvent) {
      const st = dragRef.current;
      if (st.dragging) {
        const dx = e.clientX - st.startX;
        const dy = e.clientY - st.startY;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) st.moved = true;
        if (st.moved) {
          highlight(null);
          setRect({
            x: Math.min(st.startX, e.clientX),
            y: Math.min(st.startY, e.clientY),
            w: Math.abs(dx),
            h: Math.abs(dy),
          });
        }
        return;
      }
      if (!allowPixel) return;
      const target = e.target as HTMLElement;
      if (isWidget(target)) { highlight(null); return; }
      if (config.selectionMode === 'hybrid' && getZoneForElement(target)) { highlight(null); return; }
      highlight(target);
    }

    function onPointerUp(e: PointerEvent) {
      const st = dragRef.current;
      if (!st.dragging) return;
      st.dragging = false;

      if (st.moved) {
        const x = Math.min(st.startX, e.clientX);
        const y = Math.min(st.startY, e.clientY);
        const w = Math.abs(e.clientX - st.startX);
        const h = Math.abs(e.clientY - st.startY);
        setRect(null);
        highlight(null);
        if (w < 4 || h < 4) return;
        confirmSelection(
          {
            id: 'region',
            label: `Bereich ${Math.round(w)}×${Math.round(h)}`,
            meta: { region: { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) } },
          },
          { x, y, width: w, height: h },
        );
        return;
      }

      // No drag → treat as an element click (pixel pick).
      if (!allowPixel) return;
      const target = e.target as HTMLElement;
      if (isWidget(target)) return;
      const zone = config.selectionMode === 'hybrid' ? getZoneForElement(target) : null;
      if (zone) return; // zone handles its own click
      const r = target.getBoundingClientRect();
      const cssPath = getCssPath(target);
      highlight(null);
      if (r.width < 1 || r.height < 1) return;
      // Capture by the element's bounding box directly (we already have the
      // element) — avoids re-resolving via querySelector, which would throw on
      // unescaped Tailwind-style class selectors.
      confirmSelection(
        {
          id: cssPath,
          label: target.tagName.toLowerCase() + (target.id ? `#${target.id}` : ''),
          cssPath,
          meta: {
            tagName: target.tagName,
            boundingBox: {
              top: Math.round(r.top),
              left: Math.round(r.left),
              width: Math.round(r.width),
              height: Math.round(r.height),
            },
          },
        },
        { x: r.left, y: r.top, width: r.width, height: r.height },
      );
    }

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);

    return () => {
      highlight(null);
      document.body.style.userSelect = prevUserSelect;
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerup', onPointerUp, true);
    };
  }, [isActive, config.selectionMode, getZoneForElement, confirmSelection]);

  // Swallow page clicks while selecting/capturing so the user's click doesn't
  // also activate the element underneath (navigate, open menus, submit forms…).
  // Always mounted + reads a live phase ref to avoid a teardown race on the
  // selecting → capturing transition.
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => {
    const mode = config.selectionMode;
    // Only the pointer-based selection modes hijack clicks; in 'zone'/'none'
    // mode FeedbackZone's own onClick must keep working.
    if (mode !== 'pixel' && mode !== 'hybrid' && mode !== 'region') return;
    function onClickCapture(e: MouseEvent) {
      const p = phaseRef.current;
      if (p !== 'selecting' && p !== 'capturing') return;
      const target = e.target as HTMLElement;
      if (target.closest?.('[data-feedback-widget]')) return;
      // In hybrid mode, let clicks on zones reach their FeedbackZone handler.
      if (mode === 'hybrid' && target.closest?.('[data-feedback-zone]')) return;
      e.preventDefault();
      e.stopPropagation();
    }
    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, [config.selectionMode]);

  if (!rect) return null;
  return (
    <div
      data-feedback-widget
      style={{
        position: 'fixed',
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.w}px`,
        height: `${rect.h}px`,
        border: '2px solid #f97316',
        backgroundColor: 'rgba(249,115,22,0.12)',
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.12)',
        zIndex: 9997,
        pointerEvents: 'none',
      }}
    />
  );
}
