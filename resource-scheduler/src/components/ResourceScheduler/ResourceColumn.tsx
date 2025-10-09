// src/components/ResourceScheduler/ResourceColumn.tsx
import React from "react";
import { ResourceColumnProps } from "./types";

export const ResourceColumn: React.FC<ResourceColumnProps> = ({
  resources,
  resourceColumnWidth = "220px",
  getResourceRowHeight,
}) => {
  return (
    <div
      className={`bg-ocrs-white z-20 sticky left-0 max-w-[30%] lg:max-w-${resourceColumnWidth}`}
    >
      <div className="border-r bg-ocrs-background sticky top-0 z-10 bg-ocrs-gray-50 p-2 text-center border-b h-14 flex items-center justify-center">
        <span className="text-sm font-medium text-gray-600">Resources</span>
      </div>
      {resources.map((resource) => {
        const rowHeight = getResourceRowHeight(resource);
        return (
          <div
            key={resource.id}
            className="p-3 border-b border-r flex items-center justify-center text-center overflow-hidden bg-white hover:bg-ocrs-accent text-sm"
            style={{ height: rowHeight + "px" }}
          >
            <span className="w-full block break-words whitespace-pre-line">
              {resource.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};
