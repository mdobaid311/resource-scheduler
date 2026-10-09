// src/components/ResourceScheduler/utils/rowWindow.ts

/**
 * The rows worth rendering. `heights` are the row heights in px, `top` and
 * `height` the scroll position and visible height of the scroller, `offset`
 * what sits above the first row (the sticky header) and `overscan` extra px
 * to render on each side. Returns indices; `end` is exclusive.
 */
export const getRowWindow = (
  heights: number[],
  top: number,
  height: number,
  overscan = 0,
  offset = 0
): { start: number; end: number } => {
  const count = heights.length;
  const from = top - offset - overscan;
  const to = top - offset + height + overscan;
  let start = count;
  let end = 0;
  let y = 0;
  for (let i = 0; i < count; i++) {
    if (start === count && y + heights[i] > from) start = i;
    if (y < to) end = i + 1;
    y += heights[i];
    if (y >= to && start !== count) break;
  }
  return { start: Math.min(start, end), end };
};
