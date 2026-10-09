// src/components/ResourceScheduler/EventItem.tsx
import React, { useContext, useState } from "react";
import { SchedulerDragContext } from "./hooks/useEventDrag";
import { useI18n } from "./i18n";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Calendar, User } from "lucide-react";
import { type EventItemProps, ViewType } from "./types";
import { formatEventTime, formatRangeLabel } from "./utils/dateUtils";

const MOVE_STEPS: Record<string, { cols?: number; rows?: number }> = {
  ArrowLeft: { cols: -1 },
  ArrowRight: { cols: 1 },
  ArrowUp: { rows: -1 },
  ArrowDown: { rows: 1 },
};
const RESIZE_STEPS: Record<string, { resizeEnd: number }> = {
  ArrowLeft: { resizeEnd: -1 },
  ArrowRight: { resizeEnd: 1 },
};

export const EventItem: React.FC<EventItemProps> = ({
  event,
  resource,
  renderEventPopover,
  renderTimeSlot,
}) => {
  const [open, setOpen] = useState(false);
  const drag = useContext(SchedulerDragContext);
  const i18n = useI18n();
  const movingThis =
    drag?.activeDrag?.eventId === event.id && drag.activeDrag.mode === "move";
  const opacity = movingThis ? 0.5 : 1;

  // Edge handles; only shown when the app provided `onEventResize`.
  const resizeHandles =
    drag?.canResize && resource
      ? (["start", "end"] as const).map((edge) => (
          <div
            key={edge}
            aria-hidden="true"
            data-rs-resize={edge}
            className={`absolute inset-y-0 w-2 cursor-ew-resize rounded opacity-0 hover:opacity-100 hover:bg-black/15 ${
              edge === "start" ? "left-0" : "right-0"
            }`}
            style={{ touchAction: "none" }}
            onPointerDown={(e) => {
              e.stopPropagation(); // don't start a move
              drag.startEventResize(e, event, resource, edge);
            }}
          />
        ))
      : null;

  const grabbed = drag?.grabbedEventId === event.id;
  const label = `${event.title}, ${resource ? `${resource.name}, ` : ""}${formatRangeLabel(
    event.startDate,
    event.endDate,
    drag?.viewType ?? ViewType.Week,
    i18n
  )}`;

  // Keyboard: Enter opens details, Space picks the event up; then arrows move
  // it (Shift+Left/Right resizes the end), Space drops it, Escape cancels.
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!drag || !resource) return;
    const handled = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    if (grabbed) {
      const step = e.shiftKey ? RESIZE_STEPS[e.key] : MOVE_STEPS[e.key];
      if (step) {
        handled();
        drag.stepGrab(step);
      } else if (e.key === " " || e.key === "Enter") {
        handled();
        drag.dropGrab();
      } else if (e.key === "Escape") {
        handled();
        drag.cancelGrab();
      }
    } else if (e.key === " ") {
      handled();
      drag.startGrab(event, resource);
    } else if (e.key === "Enter") {
      handled();
      setOpen(true);
    }
  };

  const a11yProps = {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": label,
    "data-rs-event": event.id,
    onKeyDown,
    // Leaving a picked-up event puts it back.
    onBlur: () => {
      if (grabbed) drag?.cancelGrab();
    },
  };
  const focusRing = `outline-none focus-visible:ring-2 focus-visible:ring-ocrs-ring ${
    grabbed ? "ring-2 ring-ocrs-primary" : ""
  }`;

  const dragProps = {
    ...a11yProps,
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
            className={`relative w-full h-full overflow-hidden ${focusRing}`}
            style={{ touchAction: "none", opacity }}
            {...dragProps}
          >
            {renderTimeSlot(event, resource ? [resource] : [])}
            {resizeHandles}
          </div>
        ) : (
          <div
            className={`event-item text-ocrs-foreground p-2 text-xs rounded border cursor-pointer z-99 h-full ocrs-shadow-xs flex flex-col justify-center ${focusRing}`}
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
            <div className="font-medium truncate text-ocrs-foreground">
              {event.title}
            </div>
            <div className="text-xs truncate text-ocrs-muted-foreground">
              {formatEventTime(event, i18n)}
            </div>
            {resizeHandles}
          </div>
        )}
      </PopoverTrigger>
      <PopoverContent side="top" className="z-[2000] w-fit p-3">
        {renderEventPopover ? (
          renderEventPopover(event, resource!, onClose)
        ) : (
          <div className="space-y-2">
            <div className="font-semibold text-ocrs-foreground">{event.title}</div>
            <div className="flex items-center gap-2 text-sm text-ocrs-muted-foreground">
              <Calendar className="h-4 w-4 text-ocrs-muted-foreground" />
              <span>
                {i18n.fmt.dateTime(event.startDate)} -{" "}
                {i18n.fmt.time(event.endDate)}
              </span>
            </div>
            {resource && (
              <div className="flex items-center gap-2 text-sm text-ocrs-muted-foreground">
                <User className="h-4 w-4 text-ocrs-muted-foreground" />
                <span>{resource.name}</span>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
