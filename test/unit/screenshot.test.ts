import { describe, it, expect } from 'vitest';
import { computeCropRect } from '../../src/utils/screenshot.js';

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
