import type { ReactNode } from "react";

/** What the showcase passes to the recipe demos. */
export type DemoProps = { density?: "compact" | "comfortable" };

/** The border, optional controls row and caption around every live demo. */
export function Frame({
  height = 440,
  controls,
  caption,
  log,
  children,
}: {
  height?: number;
  controls?: ReactNode;
  caption?: ReactNode;
  log?: string;
  children: ReactNode;
}) {
  return (
    // `not-content` keeps Starlight's markdown rules (a 1rem margin between siblings) off the scheduler.
    <figure className="demo-frame not-content">
      {controls && <div className="demo-controls">{controls}</div>}
      <div style={{ height }}>{children}</div>
      {log !== undefined && (
        <div className="demo-log" role="status" aria-live="polite">
          {log || (caption ? "What you do shows up here." : "Try it: drag, resize or click.")}
        </div>
      )}
      {caption && (
        <figcaption>
          {caption}
          {/* Shown only on touch screens (CSS), where a drag across empty time scrolls instead. */}
          <span className="touch-hint"> On touch: press and hold an empty slot, then drag.</span>
        </figcaption>
      )}
    </figure>
  );
}
