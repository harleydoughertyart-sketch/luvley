/**
 * Dirty-rectangle arithmetic for the inpaint canvas: which rectangle a stamp
 * touched, which rectangle an undo snapshot must capture, and how both get
 * clamped to the document.
 *
 * The seam: pure rectangle algebra. Every function takes plain numbers and
 * `{ x, y, w, h }` objects and returns one - no canvas, no context, no ref, no
 * pixels. Nothing here reads or writes session state, which is why it could
 * leave `inpaintSession.ts`.
 *
 * This is the arithmetic behind the warning in AGENTS.md that a subtle change to
 * inpaintSession.ts can corrupt undo history: `expandSnapshotRectForCapture` decides
 * how much slack a stroke snapshot carries, and `clampSnapshotRect` decides whether
 * a capture is in bounds at all. Isolating it makes that math directly testable
 * for the first time.
 *
 * Lifted verbatim from `inpaintSession.ts`; every body below is byte-identical to
 * the one it replaced.
 */
import type { OverlayDirtyRect } from './inpaintOverlay';

export function clampSnapshotRect(
  rect: OverlayDirtyRect | null | undefined,
  width: number,
  height: number,
): OverlayDirtyRect | null {
  if (!rect || width <= 0 || height <= 0) return null;
  const x = Math.max(0, Math.min(width, Math.floor(rect.x)));
  const y = Math.max(0, Math.min(height, Math.floor(rect.y)));
  const x2 = Math.max(x, Math.min(width, Math.ceil(rect.x + rect.w)));
  const y2 = Math.max(y, Math.min(height, Math.ceil(rect.y + rect.h)));
  const w = x2 - x;
  const h = y2 - y;
  if (w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

export function rectsEqual(a: OverlayDirtyRect, b: OverlayDirtyRect): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

export function rectContains(outer: OverlayDirtyRect, inner: OverlayDirtyRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

export function unionSnapshotRect(a: OverlayDirtyRect, b: OverlayDirtyRect): OverlayDirtyRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: x2 - x, h: y2 - y };
}

export function expandSnapshotRectForCapture(
  required: OverlayDirtyRect,
  width: number,
  height: number,
  padSeed: OverlayDirtyRect = required,
): OverlayDirtyRect {
  const seedLongest = Math.max(padSeed.w, padSeed.h);
  const pad = Math.max(96, Math.min(512, Math.ceil(seedLongest * 0.5)));
  return (
    clampSnapshotRect(
      {
        x: required.x - pad,
        y: required.y - pad,
        w: required.w + pad * 2,
        h: required.h + pad * 2,
      },
      width,
      height,
    ) ?? required
  );
}

export function rectForBrushDisc(
  cx: number,
  cy: number,
  radius: number,
  width: number,
  height: number,
): OverlayDirtyRect | null {
  return clampSnapshotRect(
    {
      x: Math.floor(cx - radius - 2),
      y: Math.floor(cy - radius - 2),
      w: Math.ceil(radius * 2 + 4),
      h: Math.ceil(radius * 2 + 4),
    },
    width,
    height,
  );
}

export function rectForPathStrokePoints(
  points: readonly PathStrokePoint[],
  pad: number,
  width: number,
  height: number,
): OverlayDirtyRect | null {
  if (points.length === 0) return null;
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return clampSnapshotRect(
    {
      x: Math.floor(minX - pad),
      y: Math.floor(minY - pad),
      w: Math.ceil(maxX - minX + pad * 2),
      h: Math.ceil(maxY - minY + pad * 2),
    },
    width,
    height,
  );
}

export type PathStrokePoint = {
  x: number;
  y: number;
};
