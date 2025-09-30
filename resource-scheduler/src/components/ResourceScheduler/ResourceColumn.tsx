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
      className="bg-white border-r z-20 sticky left-0"
      style={{ width: resourceColumnWidth }}
    >
      <div className="sticky top-0 z-10 bg-gray-50 p-2 text-center border-b h-14 flex items-center justify-center shadow-sm">
        <span className="text-sm font-medium text-gray-600">Resources</span>
      </div>
      {resources.map((resource) => {
        const rowHeight = getResourceRowHeight(resource);
        return (
          <div
            key={resource.id}
            className="p-3 border-b hover:bg-gray-50 transition-colors"
            style={{ height: rowHeight + "px" }}
          >
            <div className="font-medium text-gray-800">{resource.name}</div>
            {resource.role && (
              <div className="text-xs text-gray-500 mt-1">{resource.role}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
