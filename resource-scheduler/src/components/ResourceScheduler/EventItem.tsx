// src/components/ResourceScheduler/EventItem.tsx
import React, { useContext, useState } from "react";
import { format } from "date-fns";
import { SchedulerDragContext } from "./hooks/useEventDrag";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Calendar, User } from "lucide-react";
import { EventItemProps } from "./types";
import { formatEventTime } from "./utils/dateUtils";

export const EventItem: React.FC<EventItemProps> = ({
  event,
  resource,
  renderEventPopover,
  renderTimeSlot,
}) => {
  const [open, setOpen] = useState(false);
  const drag = useContext(SchedulerDragContext);
  const opacity = drag?.activeDrag?.eventId === event.id ? 0.5 : 1;

  const dragProps = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (resource) drag?.startEventDrag(e, event, resource);
    },
    // Swallow the click that ends a drag. Keyboard clicks (detail 0) pass.
    onClickCapture: (e: React.MouseEvent) => {
      if (e.detail > 0 && drag?.wasDragged()) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
  };

  const onClose = () => {
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {renderTimeSlot ? (
          <div
            className="w-full h-full overflow-hidden"
            style={{ touchAction: "none", opacity }}
            {...dragProps}
          >
            {renderTimeSlot(event, resource ? [resource] : [])}
          </div>
        ) : (
          <div
            className="event-item text-black p-2 text-xs rounded border cursor-pointer z-99 h-full ocrs-shadow-xs flex flex-col justify-center"
            style={{
              backgroundColor: `${event.color}20`,
              borderColor: event.color,
              borderLeftWidth: "3px",
              position: "relative",
              zIndex: 5,
              opacity,
              touchAction: "none",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            {...dragProps}
          >
            <div className="font-medium truncate text-gray-800">
              {event.title}
            </div>
            <div className="text-xs truncate text-gray-500">
              {formatEventTime(event)}
            </div>
          </div>
        )}
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
