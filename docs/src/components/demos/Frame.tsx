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
    <figure className="demo-frame">
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
