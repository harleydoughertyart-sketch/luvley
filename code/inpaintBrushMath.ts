/**
 * Brush dynamics arithmetic: how pressure, taper, hardness and size become the
 * numbers a stamp is drawn with.
 *
 * The seam: every function here is pure and total - numbers in, numbers out. No
 * canvas, no refs, no rAF, no undo snapshot. That is the whole contract, and it
 * is why this could leave `inpaintSession.ts` when almost nothing else could:
 * callers pass the state in, and this module never reaches for it.
 *
 * Lifted verbatim from `inpaintSession.ts`; every body below is byte-identical to
 * the one it replaced.
 */
import type { BrushPressurePresetName } from './brushSamplePerf';

export const MIN_STAMP_SCALE = 0.15;

export const TAPER_BRUSH_MULT = 3;

export const MIN_BRUSH_STAMP_SPACING_PX = 0.8;

export const MIN_BRUSH_STAMP_SPACING_CAP_PX = 20;

export const MAX_BRUSH_STAMP_SPACING_CAP_PX = 96;

export const BRUSH_STAMP_SPACING_CAP_RATIO = 0.16;

export const MODERN_ROUND_STAMP_PAD_PX = 2;

export const CURRENT_PRESSURE_SMOOTHING = 0.32;

export const SEGMENT_PRESSURE_SMOOTHING = 0.4;

export type BrushPressureDynamicsConfig = {
  enabled: boolean;
  sizeMinScale: number;
  opacityMinScale: number;
  sizeCurve: number;
  opacityCurve: number;
  smoothing: number;
  jitterDeadzone: number;
  mousePressureMode: 'full' | 'neutral';
  responseMode: 'current' | 'curve';
};

export const BRUSH_PRESSURE_DYNAMICS_PRESETS: Record<BrushPressurePresetName, BrushPressureDynamicsConfig> = {
  current: {
    enabled: true,
    sizeMinScale: 0.88,
    opacityMinScale: 0.35,
    sizeCurve: 1,
    opacityCurve: 1,
    smoothing: CURRENT_PRESSURE_SMOOTHING,
    jitterDeadzone: 0,
    mousePressureMode: 'full',
    responseMode: 'current',
  },
  natural: {
    enabled: true,
    sizeMinScale: 0.55,
    opacityMinScale: 0.08,
    sizeCurve: 1.3,
    opacityCurve: 1.6,
    smoothing: CURRENT_PRESSURE_SMOOTHING,
    jitterDeadzone: 0,
    mousePressureMode: 'full',
    responseMode: 'curve',
  },
  ink: {
    enabled: true,
    sizeMinScale: 0.35,
    opacityMinScale: 0.65,
    sizeCurve: 1.8,
    opacityCurve: 0.8,
    smoothing: CURRENT_PRESSURE_SMOOTHING,
    jitterDeadzone: 0,
    mousePressureMode: 'full',
    responseMode: 'curve',
  },
  softAirbrush: {
    enabled: true,
    sizeMinScale: 0.85,
    opacityMinScale: 0.02,
    sizeCurve: 1,
    opacityCurve: 2.2,
    smoothing: CURRENT_PRESSURE_SMOOTHING,
    jitterDeadzone: 0,
    mousePressureMode: 'full',
    responseMode: 'curve',
  },
};

export function clamp01x(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function normalizeOpacity01(value: number): number {
  if (!Number.isFinite(value)) return 1;
  if (value > 1) return clamp01x(value / 100);
  return clamp01x(value);
}

export function applyPressureCurve(pressure: number, curve: number): number {
  const p = clamp01x(pressure);
  if (!Number.isFinite(curve) || curve <= 0 || curve === 1) return p;
  return Math.pow(p, curve);
}

export function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

export function estimateBrushDabOverlap(effectiveBrushSize: number, stampSpacing: number): number {
  const raw = effectiveBrushSize / Math.max(0.001, stampSpacing);
  return Math.max(1, Math.min(64, raw));
}

export function inverseAccumulatedDabAlpha(targetAlpha: number, overlapCount: number): number {
  const target = clamp01x(targetAlpha);
  const overlap = Math.max(1, Math.min(64, overlapCount));
  if (target <= 0) return 0;
  if (target >= 1) return 1;
  return 1 - Math.pow(1 - target, 1 / overlap);
}

export function normalizeFlowGlobalAlpha(
  brushOpacity: number,
  pressureOpacityScaleValue: number,
  effectiveBrushSize: number,
  stampSpacing: number,
): { globalAlpha: number; estimatedOverlap: number; normalizedDabAlpha: number; targetAlpha: number } {
  const bakedOpacity = clamp01x(brushOpacity);
  const targetAlpha = clamp01x(bakedOpacity * clamp01x(pressureOpacityScaleValue));
  const estimatedOverlap = estimateBrushDabOverlap(effectiveBrushSize, stampSpacing);
  const normalizedDabAlpha = inverseAccumulatedDabAlpha(targetAlpha, estimatedOverlap);
  const globalAlpha = bakedOpacity > 0 ? Math.max(0, Math.min(1, normalizedDabAlpha / bakedOpacity)) : 0;
  return { globalAlpha, estimatedOverlap, normalizedDabAlpha, targetAlpha };
}

export function brushFeatherPx(brushSize: number, brushHardness: number): number {
  return (Math.max(1, brushSize) / 2) * (1 - clamp01x(brushHardness));
}

export function brushCoreWidthPx(brushSize: number, brushHardness: number): number {
  const feather = brushFeatherPx(brushSize, brushHardness);
  const size = Math.max(1, brushSize);
  return Math.max(size * 0.15, size - feather * 2, 1);
}

export function pathStrokeOuterPadPx(brushSize: number, brushHardness: number): number {
  return Math.ceil(Math.max(1, brushSize) / 2 + brushFeatherPx(brushSize, brushHardness) + 6);
}

export function modernRoundStampDirtyRadius(brushSize: number, stampScale = 1): number {
  const radius = Math.max(2, Math.floor(Math.max(1, brushSize) / 2));
  return (radius + MODERN_ROUND_STAMP_PAD_PX) * Math.max(MIN_STAMP_SCALE, Math.min(1, stampScale));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01x((x - edge0) / Math.max(1e-6, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Size response to pen pressure (0–1). Kept intentionally subtle so pressure mainly influences
 * strength/opacity; exported for tooling and cursor helpers.
 */
export function pressureStampScale(pressure: number, enabled: boolean): number {
  if (!enabled) return 1;
  const p = normalizePressureSample(pressure, enabled);
  // Keep size dynamics intentionally subtle so pressure primarily controls strength.
  const eased = smoothstep(0.18, 0.95, p);
  return 0.88 + 0.12 * eased;
}

export function pressureStampScaleWithDynamics(
  pressure: number,
  enabled: boolean,
  dynamics: BrushPressureDynamicsConfig,
): number {
  if (!enabled || !dynamics.enabled) return 1;
  if (dynamics.responseMode === 'current') return pressureStampScale(pressure, enabled);
  const t = applyPressureCurve(pressure, dynamics.sizeCurve);
  return lerp(dynamics.sizeMinScale, 1, t);
}

export function taperStampScale(distanceFromStrokeStart: number, brushSize: number, enabled: boolean): number {
  if (!enabled) return 1;
  const len = Math.max(8, brushSize * TAPER_BRUSH_MULT);
  const t = smoothstep(0, len, distanceFromStrokeStart);
  return MIN_STAMP_SCALE + (1 - MIN_STAMP_SCALE) * t;
}

export function pressureOpacityScale(pressure: number, enabled: boolean): number {
  if (!enabled) return 1;
  const p = normalizePressureSample(pressure, enabled);
  const eased = smoothstep(0.04, 0.92, p);
  // Wider range than size scaling so pressure mostly feels like strength control.
  return 0.35 + 0.65 * eased;
}

export function pressureOpacityScaleWithDynamics(
  pressure: number,
  enabled: boolean,
  dynamics: BrushPressureDynamicsConfig,
): number {
  if (!enabled || !dynamics.enabled) return 1;
  if (dynamics.responseMode === 'current') return pressureOpacityScale(pressure, enabled);
  const t = applyPressureCurve(pressure, dynamics.opacityCurve);
  return lerp(dynamics.opacityMinScale, 1, t);
}

export function normalizePressureSample(pressure: number, enabled: boolean): number {
  if (!enabled) return 1;
  if (!Number.isFinite(pressure)) return 1;
  const p = clamp01x(pressure);
  // Many mouse stacks report 0 even while painting; treat as neutral/full.
  if (p <= 0) return 1;
  return p;
}

export function normalizePressureSampleWithDynamics(
  pressure: number,
  enabled: boolean,
  dynamics: BrushPressureDynamicsConfig,
  pointerType?: string,
): number {
  if (!enabled || !dynamics.enabled) return 1;
  if (dynamics.responseMode === 'current') return normalizePressureSample(pressure, enabled);
  if (!Number.isFinite(pressure)) return 1;
  const p = clamp01x(pressure);
  if (p > 0) return p;
  if ((pointerType ?? '').toLowerCase() === 'mouse') {
    return dynamics.mousePressureMode === 'neutral' ? 0.5 : 1;
  }
  return 0;
}

export function applyPressureJitterDeadzone(
  nextPressure: number,
  previousPressure: number,
  dynamics: BrushPressureDynamicsConfig,
): number {
  const deadzone = Math.max(0, dynamics.jitterDeadzone);
  if (deadzone <= 0) return nextPressure;
  return Math.abs(nextPressure - previousPressure) <= deadzone ? previousPressure : nextPressure;
}

export function brushStampSpacingPx(brushSize: number, brushHardness: number): number {
  const diameter = Math.max(1, brushSize);
  const h = clamp01x(brushHardness);
  // Soft brushes need denser stamps to avoid dotted halos; hard brushes can space a bit wider.
  const ratio = 0.14 + h * 0.08;
  // The cap scales for big inpaint brushes. A fixed 20px ceiling made 300-1000px masks stamp
  // dozens of unnecessary giant dabs per segment, which dominated non-GPU canvas time.
  const scaledCap = Math.max(
    MIN_BRUSH_STAMP_SPACING_CAP_PX,
    Math.min(MAX_BRUSH_STAMP_SPACING_CAP_PX, diameter * BRUSH_STAMP_SPACING_CAP_RATIO),
  );
  return Math.max(MIN_BRUSH_STAMP_SPACING_PX, Math.min(scaledCap, diameter * ratio));
}
