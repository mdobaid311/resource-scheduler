// utils/popoverRenderer.tsx
import { type Event, type Resource } from "resource-scheduler";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

export const renderEventPopover = (
  event: Event,
  resource: Resource,
  closePopover: () => void
) => (
  <div className="space-y-3 p-4 bg-white rounded-lg border shadow-lg">
    <div className="flex justify-between items-start">
      <h3 className="font-bold text-lg text-gray-900">{event.title}</h3>
      <Button
        variant="outline"
        size="sm"
        onClick={closePopover}
        className="h-8 w-8 p-0 hover:bg-gray-100"
      >
        ×
      </Button>
    </div>
    <div className="flex items-center gap-2">
      <div
        className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
        style={{ backgroundColor: event.color }}
      ></div>
      <span className="text-sm font-medium text-gray-700">{resource.name}</span>
      <Badge variant="secondary" className="bg-blue-50 text-blue-700">
        {resource.role}
      </Badge>
    </div>
    <p className="text-sm text-gray-600">{event.description}</p>
    <div className="text-sm space-y-1 text-gray-500">
      <div>Start: {event.startDate.toLocaleString()}</div>
      <div>End: {event.endDate.toLocaleString()}</div>
    </div>
    <Button size="sm" className="w-full">
      Edit Event
    </Button>
  </div>
);
