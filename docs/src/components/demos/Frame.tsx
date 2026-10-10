import type { ReactNode } from "react";

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
          {log || "Try it: drag, resize or click."}
        </div>
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
