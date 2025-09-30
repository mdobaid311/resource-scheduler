// src/components/ResourceScheduler/EventItem.tsx
import React, { useState } from "react";
import { format } from "date-fns";
import { useDrag } from "react-dnd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Calendar, User } from "lucide-react";
import { EventItemProps } from "./types";

export const EventItem: React.FC<EventItemProps> = ({
  event,
  resource,
  renderEventPopover,
}) => {
  const [open, setOpen] = useState(false);
  const [{ opacity }, dragRef] = useDrag(
    () => ({
      type: "BOX",
      item: {
        event: event,
        resource: resource,
      },
      collect: (monitor) => ({
        opacity: monitor.isDragging() ? 0.5 : 1,
      }),
    }),
    [event, resource]
  );

  const onClose = () => {
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className="event-item text-black p-2 text-xs rounded border cursor-pointer z-99 h-full shadow-xs flex flex-col justify-center"
          style={{
            backgroundColor: `${event.color}20`,
            borderColor: event.color,
            borderLeftWidth: "3px",
            position: "relative",
            zIndex: 5,
            opacity,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={dragRef as any}
        >
          <div className="font-medium truncate text-gray-800">
            {event.title}
          </div>
          <div className="text-xs truncate text-gray-500">
            {format(event.startDate, "h:mm a")} -{" "}
            {format(event.endDate, "h:mm a")}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent side="top" className="z-[2000] w-fit p-3">
        {renderEventPopover ? (
          renderEventPopover(event, resource!, onClose)
        ) : (
          <div className="space-y-2">
            <div className="font-semibold text-gray-800">{event.title}</div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>
                {format(event.startDate, "MMM d, yyyy h:mm a")} -{" "}
                {format(event.endDate, "h:mm a")}
              </span>
            </div>
            {resource && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4 text-gray-400" />
                <span>{resource.name}</span>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
