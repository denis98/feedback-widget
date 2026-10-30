import { describe, it, expect } from 'vitest';
import {
  applyScrollOffset,
  computeCropRect,
  fitWithin,
  markOffscreen,
  markScrollOffsets,
} from '../../src/utils/screenshot.js';

describe('computeCropRect', () => {
  it('maps a region 1:1 when frame matches the viewport (DPR 1)', () => {
    const crop = computeCropRect(1000, 800, 1000, 800, {
      x: 100,
      y: 50,
      width: 200,
      height: 120,
    });
    expect(crop).toEqual({ sx: 100, sy: 50, sw: 200, sh: 120 });
  });

  it('scales the region by the device pixel ratio (frame larger than viewport)', () => {
    // Retina: frame is 2× the CSS viewport.
    const crop = computeCropRect(2000, 1600, 1000, 800, {
      x: 100,
      y: 50,
      width: 200,
      height: 120,
    });
    expect(crop).toEqual({ sx: 200, sy: 100, sw: 400, sh: 240 });
  });

  it('clamps a region that extends past the right/bottom edge', () => {
    const crop = computeCropRect(1000, 800, 1000, 800, {
      x: 900,
      y: 700,
      width: 400, // would reach x=1300, past the 1000 edge
      height: 400, // would reach y=1100, past the 800 edge
    });
    expect(crop).toEqual({ sx: 900, sy: 700, sw: 100, sh: 100 });
  });

  it('clamps a region that starts off-screen (negative offsets)', () => {
    const crop = computeCropRect(1000, 800, 1000, 800, {
      x: -50,
      y: -30,
      width: 150,
      height: 100,
    });
    // Visible part starts at 0,0 and spans to x=100 / y=70.
    expect(crop).toEqual({ sx: 0, sy: 0, sw: 100, sh: 70 });
  });

  it('never returns a zero-sized crop', () => {
    const crop = computeCropRect(1000, 800, 1000, 800, {
      x: 500,
      y: 500,
      width: 0,
      height: 0,
    });
    expect(crop.sw).toBeGreaterThanOrEqual(1);
    expect(crop.sh).toBeGreaterThanOrEqual(1);
  });
});

describe('scroll offsets in the DOM fallback', () => {
  it('reproduces the scroll position of a nested container in the clone', () => {
    document.body.innerHTML =
      '<div id="sc" style="overflow:auto"><p id="a">x</p><div id="abs" style="position:absolute"></div><div id="fx" style="position:fixed"></div>text</div>';
    const sc = document.getElementById('sc')!;
    Object.defineProperty(sc, 'scrollTop', { value: 120, configurable: true });
    Object.defineProperty(sc, 'scrollLeft', { value: 5, configurable: true });

    const unmark = markScrollOffsets();
    expect(sc.getAttribute('data-fw-scroll')).toBe('5,120');
    const clone = sc.cloneNode(true) as HTMLElement;
    unmark();
    expect(sc.hasAttribute('data-fw-scroll')).toBe(false);

    // modern-screenshot inlines computed styles before the hook runs.
    (clone.querySelector('#abs') as HTMLElement).style.position = 'absolute';
    (clone.querySelector('#fx') as HTMLElement).style.position = 'fixed';
    (clone.querySelector('#a') as HTMLElement).style.position = 'static';
    applyScrollOffset(clone);

    expect(clone.style.overflow).toBe('hidden');
    const a = clone.querySelector('#a') as HTMLElement;
    expect([a.style.position, a.style.top, a.style.left]).toEqual(['relative', '-120px', '-5px']);
    // Must beat the inset-block/inset-inline longhands the clone also carries.
    expect(a.style.getPropertyPriority('top')).toBe('important');
    expect((clone.querySelector('#abs') as HTMLElement).style.transform).toBe(
      'translate(-5px, -120px)',
    );
    const fx = clone.querySelector('#fx') as HTMLElement;
    expect(fx.style.transform).toBe('');
    // Stays above the now positioned, shifted siblings.
    expect(fx.style.zIndex).toBe('1');
    // Loose text is wrapped so it shifts too.
    expect(clone.lastChild?.nodeName).toBe('SPAN');
    expect((clone.lastChild as HTMLElement).style.top).toBe('-120px');
  });
});

describe('offscreen pruning in the DOM fallback', () => {
  it('empties offscreen blocks, keeps visible chains and inline-level subtrees', () => {
    document.body.innerHTML =
      '<div id="vis"><p id="vp">a</p></div><div id="off"><p id="op">b</p></div>' +
      '<div id="wrap"><div id="toast">c</div></div><span id="ib" style="display:inline-block"><b id="ibc">d</b></span>';
    const at = (y: number) => ({
      top: y,
      bottom: y + 10,
      left: 0,
      right: 10,
      width: 10,
      height: 10,
    });
    const rects: Record<string, number> = {
      vis: 0,
      vp: 0,
      off: 5000,
      op: 5000,
      wrap: 5000,
      toast: 0,
      ib: 5000,
      ibc: 5000,
    };
    document.body.querySelectorAll<HTMLElement>('*').forEach((el) => {
      el.getBoundingClientRect = () => at(rects[el.id] ?? 0) as DOMRect;
    });

    const { keep, cleanup } = markOffscreen();
    const $ = (id: string) => document.getElementById(id)!;
    expect(keep($('vp'))).toBe(true);
    expect(keep($('off'))).toBe(true); // the box itself stays (layout)
    expect(keep($('op'))).toBe(false); // its content is skipped
    expect(keep($('toast'))).toBe(true); // visible child of an offscreen parent
    expect(keep($('ibc'))).toBe(true); // inline-block content defines the baseline
    expect($('off').hasAttribute('data-fw-size')).toBe(true);
    cleanup();
    expect($('off').hasAttribute('data-fw-size')).toBe(false);
  });
});

describe('fitWithin', () => {
  it('scales the longest edge down to the limit, keeping the aspect ratio', () => {
    expect(fitWithin(3840, 2160, 2560)).toEqual({ width: 2560, height: 1440 });
    expect(fitWithin(1000, 4000, 2000)).toEqual({ width: 500, height: 2000 });
  });

  it('never upscales and never returns 0', () => {
    expect(fitWithin(800, 600, 2560)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(10000, 1, 100)).toEqual({ width: 100, height: 1 });
  });
});
