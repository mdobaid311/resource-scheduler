// src/components/ResourceScheduler/utils/columnWindow.ts

/** A width in px as a number, or `undefined` for any other unit (rem, %, calc), which cannot be measured without the DOM. */
export const parsePx = (width: string | undefined): number | undefined => {
  const match = /^\s*([0-9]+(?:[.][0-9]+)?)px\s*$/.exec(width ?? "");
  return match ? Number(match[1]) : undefined;
};

/**
 * The columns (`start` to `end`, end exclusive) that are in a viewport that
 * starts `left` px into a grid of `count` equal columns, `width` px wide, plus
 * `overscan` px on each side. A column that is only partly in view counts.
 * When it cannot tell (no width, no column size) every column is returned, so
 * nothing is hidden by mistake.
 */
export const getColumnWindow = (
  count: number,
  columnWidth: number,
  left: number,
  width: number,
  overscan: number
): { start: number; end: number } => {
  if (count <= 0) return { start: 0, end: 0 };
  if (!(columnWidth > 0) || !(width > 0) || !Number.isFinite(left)) return { start: 0, end: count };
  const clamp = (n: number) => Math.min(count, Math.max(0, n));
  return {
    start: clamp(Math.floor((left - overscan) / columnWidth)),
    end: clamp(Math.ceil((left + width + overscan) / columnWidth)),
  };
};
