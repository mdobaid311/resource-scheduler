// src/components/ResourceScheduler/ResourceColumn.tsx
import React from "react";
import type { ResourceColumnProps } from "./types";

export const ResourceColumn: React.FC<ResourceColumnProps> = ({
  resources,
  resourceColumnWidth = "220px",
  getResourceRowHeight,
  renderResourceHeader,
  rowRange,
}) => {
  // Rows outside the range are not rendered; spacers keep the column tall.
  const heights = resources.map(getResourceRowHeight);
  const start = rowRange?.start ?? 0;
  const end = rowRange?.end ?? resources.length;
  const sum = (from: number, to: number) =>
    heights.slice(from, to).reduce((total, h) => total + h, 0);
  const before = sum(0, start);
  const after = sum(end, heights.length);

  return (
    <div
      className="bg-ocrs-white z-20 sticky left-0 shrink-0"
      style={{ width: resourceColumnWidth }}
    >
      <div className="border-r bg-ocrs-background sticky top-0 z-10 bg-ocrs-gray-50 p-2 text-center border-b h-14 flex items-center justify-center">
        <span className="text-sm font-medium text-ocrs-muted-foreground">Resources</span>
      </div>
      {before > 0 && <div aria-hidden="true" style={{ height: before + "px" }} />}
      {resources.slice(start, end).map((resource, i) => {
        const rowHeight = heights[start + i];
        return renderResourceHeader ? (
          <div
            key={resource.id}
            className="p-3 border-b border-r flex items-center justify-center text-center overflow-hidden bg-ocrs-white hover:bg-ocrs-accent text-sm"
            style={{ height: rowHeight + "px" }}
          >
            {renderResourceHeader(resource)}
          </div>
        ) : (
          <div
            key={resource.id}
            className="p-3 border-b border-r flex items-center justify-center text-center overflow-hidden bg-ocrs-white hover:bg-ocrs-accent text-sm"
            style={{ height: rowHeight + "px" }}
          >
            <span className="w-full block break-words whitespace-pre-line">
              {resource.name}
            </span>
          </div>
        );
      })}
      {after > 0 && <div aria-hidden="true" style={{ height: after + "px" }} />}
    </div>
  );
};
