import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Full-screen screenshot viewer + annotator.
 *
 * Shows the screenshot large and lets the user mark it up with the mouse:
 * freehand pen or rectangle, in a choice of colours, with undo / clear. On save
 * the annotations are flattened onto the image and returned as a PNG data URL.
 *
 * Dependency-free: a single <canvas> sized to the image's natural resolution
 * (so the export stays full-res) and scaled down for display.
 */

type Tool = 'pen' | 'rect';

interface Point {
  x: number;
  y: number;
}

type Shape =
  | { type: 'pen'; color: string; width: number; points: Point[] }
  | { type: 'rect'; color: string; width: number; start: Point; end: Point };

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#111827', '#ffffff'];
const DEFAULT_COLOR = '#ef4444';

interface ScreenshotAnnotatorProps {
  src: string;
  isDark: boolean;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

export function ScreenshotAnnotator({ src, isDark, onSave, onClose }: ScreenshotAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drawingRef = useRef<Shape | null>(null);

  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState<string>(DEFAULT_COLOR);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [ready, setReady] = useState(false);

  // Stroke width in image-pixel space, scaled to the image so it reads well on
  // both small and large screenshots.
  const strokeWidth = useCallback(() => {
    const c = canvasRef.current;
    return c ? Math.max(2, Math.round(c.width / 320)) : 3;
  }, []);

  const drawShape = (ctx: CanvasRenderingContext2D, s: Shape) => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (s.type === 'pen') {
      const [first, ...rest] = s.points;
      if (!first) return;
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (const pt of rest) ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    } else {
      const x = Math.min(s.start.x, s.end.x);
      const y = Math.min(s.start.y, s.end.y);
      ctx.strokeRect(x, y, Math.abs(s.end.x - s.start.x), Math.abs(s.end.y - s.start.y));
    }
  };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const s of shapes) drawShape(ctx, s);
    if (drawingRef.current) drawShape(ctx, drawingRef.current);
  }, [shapes]);

  // Load the image and size the canvas to its natural resolution.
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
      }
      setReady(true);
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    redraw();
  }, [redraw, ready]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ready) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toCanvasCoords(e);
    const width = strokeWidth();
    drawingRef.current =
      tool === 'pen'
        ? { type: 'pen', color, width, points: [p] }
        : { type: 'rect', color, width, start: p, end: p };
    redraw();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cur = drawingRef.current;
    if (!cur) return;
    const p = toCanvasCoords(e);
    if (cur.type === 'pen') cur.points.push(p);
    else cur.end = p;
    redraw();
  };

  const onPointerUp = () => {
    const cur = drawingRef.current;
    if (!cur) return;
    drawingRef.current = null;
    // Ignore zero-length pen strokes / zero-area rects.
    const meaningful =
      cur.type === 'pen'
        ? cur.points.length > 1
        : Math.abs(cur.end.x - cur.start.x) > 2 || Math.abs(cur.end.y - cur.start.y) > 2;
    if (meaningful) setShapes((prev) => [...prev, cur]);
    else redraw();
  };

  const handleUndo = () => setShapes((prev) => prev.slice(0, -1));
  const handleClear = () => setShapes([]);

  const handleSave = () => {
    drawingRef.current = null;
    redraw();
    const canvas = canvasRef.current;
    if (canvas) onSave(canvas.toDataURL('image/png'));
  };

  const s = getStyles(isDark);

  return (
    <div
      style={s.overlay}
      data-feedback-widget
      role="dialog"
      aria-modal="true"
      aria-label="Screenshot bearbeiten"
    >
      <div style={s.toolbar}>
        <div style={s.group}>
          <button
            type="button"
            onClick={() => setTool('pen')}
            style={{ ...s.toolBtn, ...(tool === 'pen' ? s.toolBtnActive : {}) }}
            title="Freihand zeichnen"
          >
            ✏️ Stift
          </button>
          <button
            type="button"
            onClick={() => setTool('rect')}
            style={{ ...s.toolBtn, ...(tool === 'rect' ? s.toolBtnActive : {}) }}
            title="Rechteck markieren"
          >
            ▭ Rahmen
          </button>
        </div>

        <div style={s.group}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Farbe ${c}`}
              style={{
                ...s.swatch,
                backgroundColor: c,
                outline: color === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.4)',
                outlineOffset: color === c ? '1px' : '0',
              }}
            />
          ))}
        </div>

        <div style={s.group}>
          <button
            type="button"
            onClick={handleUndo}
            disabled={shapes.length === 0}
            style={s.actionBtn}
            title="Rückgängig"
          >
            ↶ Zurück
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={shapes.length === 0}
            style={s.actionBtn}
            title="Alles löschen"
          >
            🗑 Leeren
          </button>
        </div>

        <div style={{ ...s.group, marginLeft: 'auto' }}>
          <button type="button" onClick={onClose} style={s.cancelBtn}>
            Abbrechen
          </button>
          <button type="button" onClick={handleSave} style={s.saveBtn}>
            ✓ Übernehmen
          </button>
        </div>
      </div>

      <div style={s.canvasArea}>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={s.canvas}
        />
      </div>
    </div>
  );
}

function getStyles(isDark: boolean) {
  void isDark;
  return {
    overlay: {
      position: 'fixed' as const,
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column' as const,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    toolbar: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap' as const,
      padding: '10px 16px',
      backgroundColor: '#111827',
      borderBottom: '1px solid #374151',
    },
    group: { display: 'flex', alignItems: 'center', gap: '6px' },
    toolBtn: {
      padding: '6px 12px',
      borderRadius: '6px',
      border: '1px solid #374151',
      background: '#1f2937',
      color: '#f9fafb',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 500,
    },
    toolBtnActive: {
      borderColor: '#3b82f6',
      backgroundColor: '#1e3a5f',
      color: '#93c5fd',
    },
    swatch: {
      width: '22px',
      height: '22px',
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
    },
    actionBtn: {
      padding: '6px 10px',
      borderRadius: '6px',
      border: '1px solid #374151',
      background: '#1f2937',
      color: '#f9fafb',
      cursor: 'pointer',
      fontSize: '13px',
    },
    cancelBtn: {
      padding: '6px 14px',
      borderRadius: '6px',
      border: '1px solid #374151',
      background: 'transparent',
      color: '#cbd5e1',
      cursor: 'pointer',
      fontSize: '13px',
    },
    saveBtn: {
      padding: '6px 16px',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: '#2563eb',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 600,
    },
    canvasArea: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'auto',
      padding: '16px',
    },
    canvas: {
      maxWidth: '100%',
      maxHeight: '82vh',
      display: 'block',
      touchAction: 'none' as const,
      cursor: 'crosshair',
      boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
      backgroundColor: '#fff',
    },
  };
}
