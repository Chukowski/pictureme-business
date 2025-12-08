import { BadgePrintSettings } from './types';

export const DEFAULT_DPI = 300;
export const INCH_IN_MM = 25.4;

export type Unit = 'in' | 'mm';

export function inchesToPx(valueInches: number, dpi: number = DEFAULT_DPI): number {
  if (!valueInches || !dpi) return 0;
  return valueInches * dpi;
}

export function mmToPx(valueMm: number, dpi: number = DEFAULT_DPI): number {
  if (!valueMm || !dpi) return 0;
  return (valueMm / INCH_IN_MM) * dpi;
}

export function pxToInches(valuePx: number, dpi: number = DEFAULT_DPI): number {
  if (!valuePx || !dpi) return 0;
  return valuePx / dpi;
}

export function pxToMm(valuePx: number, dpi: number = DEFAULT_DPI): number {
  if (!valuePx || !dpi) return 0;
  return (valuePx / dpi) * INCH_IN_MM;
}

export function normalizePrintSettings(print?: BadgePrintSettings): BadgePrintSettings {
  const fallback: BadgePrintSettings = {
    widthInches: 3.5,
    heightInches: 2,
    dpi: DEFAULT_DPI,
    bleedInches: 0,
    units: 'in',
  };

  if (!print) return fallback;

  return {
    ...fallback,
    ...print,
    widthInches: print.widthInches || fallback.widthInches,
    heightInches: print.heightInches || fallback.heightInches,
    dpi: print.dpi || fallback.dpi,
    bleedInches: print.bleedInches ?? fallback.bleedInches,
    units: print.units || fallback.units,
  };
}
