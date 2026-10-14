// src/components/ResourceScheduler/EventItem.tsx
import { isSameDay } from "date-fns";
import React, { useContext, useState } from "react";
import { useClassNames, withClass } from "./classNames";
import { useComponents } from "./components";
import { useDensity } from "./density";
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
import { flipHorizontal } from "./utils/keyboard";

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
const RESIZE_START_STEPS: Record<string, { resizeStart: number }> = {
  ArrowLeft: { resizeStart: -1 },
  ArrowRight: { resizeStart: 1 },
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
  const classNames = useClassNames();
  const { Event: EventPart, EventPopover } = useComponents();
  const compact = useDensity() === "compact";
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
            className={`rs-no-print absolute inset-y-0 z-10 w-2 cursor-ew-resize opacity-0 transition-opacity group-hover/event:opacity-100 after:absolute after:inset-y-2 after:w-0.5 after:rounded-full after:bg-current after:opacity-40 ${
              edge === "start" ? "start-0 after:start-[3px]" : "end-0 after:end-[3px]"
            }`}
            style={{ touchAction: "none" }}
            onPointerDown={(e) => {
              e.stopPropagation(); // don't start a move
              drag.startEventResize(e, event, resource, edge);
            }}
          />
        ))
      : null;

  // The tile is a light, solid tint of the event's colour with a strip of the colour on top;
  // the title is the colour darkened toward the text colour, so it reads in light and dark.
  const color = event.color || "var(--rs-primary)";
  const allDay = formatEventTime(event, i18n) === i18n.labels.allDay;
  // A booking over several whole days shows its dates, which say more than "All day".
  const lastDay = new Date(Math.max(event.startDate.getTime(), event.endDate.getTime() - 1));
  const time =
    allDay && !isSameDay(event.startDate, lastDay)
      ? `${i18n.fmt.titleDateStart(event.startDate)} – ${i18n.fmt.titleDateStart(lastDay)}`
      : formatEventTime(event, i18n);

  const grabbed = drag?.grabbedEventId === event.id;
  const label = `${event.title}, ${resource ? `${resource.name}, ` : ""}${formatRangeLabel(
    event.startDate,
    event.endDate,
    drag?.viewType ?? ViewType.Week,
    i18n
  )}`;

  // Keyboard: Enter opens details, Space picks the event up; then arrows move
  // it (Shift+Left/Right moves the end edge, Shift+Alt+Left/Right the start
  // edge), Space drops it, Escape cancels.
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!drag || !resource) return;
    const handled = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    if (grabbed) {
      const key = flipHorizontal(e.key, i18n.dir === "rtl");
      const resize = e.altKey ? RESIZE_START_STEPS : RESIZE_STEPS;
      const step = e.shiftKey ? resize[key] : MOVE_STEPS[key];
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
        {EventPart || renderTimeSlot ? (
          <div
            className={`group/event relative w-full h-full overflow-hidden ${focusRing}`}
            style={{ touchAction: "none", opacity }}
            {...dragProps}
          >
            {EventPart ? (
              <EventPart event={event} resource={resource!} />
            ) : (
              renderTimeSlot!(event, resource ? [resource] : [])
            )}
            {resizeHandles}
          </div>
        ) : (
          <div
            className={withClass(
              `event-item @container group/event relative h-full overflow-hidden rounded-md text-xs text-ocrs-foreground cursor-pointer flex flex-col justify-center transition-shadow hover:ocrs-shadow-md before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[var(--rs-event-color)] ${
                compact ? "px-2 pt-1 pb-0.5" : "px-2.5 pt-1.5"
              } ${focusRing}`,
              classNames.event
            )}
            style={{
              "--rs-event-color": color,
              backgroundColor: `color-mix(in srgb, ${color} 13%, var(--rs-surface))`,
              zIndex: 5,
              opacity,
              touchAction: "none",
            } as React.CSSProperties}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            {...dragProps}
          >
            {compact ? (
              <div className="truncate">
                <span className="font-semibold" style={{ color: `color-mix(in srgb, ${color} 50%, var(--rs-foreground))` }}>
                  {event.title}
                </span>
                <span className="ms-1.5 tabular-nums text-ocrs-muted-foreground @max-[5.5rem]:hidden">{time}</span>
              </div>
            ) : (
              <>
                <div
                  className="truncate font-semibold leading-4"
                  style={{ color: `color-mix(in srgb, ${color} 50%, var(--rs-foreground))` }}
                >
                  {event.title}
                </div>
                {/* A tile too narrow for the time shows the title alone. */}
                <div className="mt-0.5 truncate text-[11px] leading-4 tabular-nums text-ocrs-muted-foreground @max-[5.5rem]:hidden">
                  {time}
                </div>
              </>
            )}
            {resizeHandles}
          </div>
        )}
      </PopoverTrigger>
      <PopoverContent side="top" dir={i18n.dir} className="rs-no-print z-[2000] w-fit min-w-56 max-w-80 rounded-xl p-4">
        {EventPopover ? (
          <EventPopover event={event} resource={resource!} close={onClose} />
        ) : renderEventPopover ? (
          renderEventPopover(event, resource!, onClose)
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <div className="min-w-0">
                <div className="font-semibold leading-snug text-ocrs-foreground">{event.title}</div>
                {event.description && (
                  <p className="mt-1 text-sm text-ocrs-muted-foreground">{event.description}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5 text-sm text-ocrs-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>
                  {allDay
                    ? formatRangeLabel(event.startDate, event.endDate, ViewType.Week, i18n)
                    : `${i18n.fmt.dateTime(event.startDate)} – ${
                        isSameDay(event.startDate, event.endDate)
                          ? i18n.fmt.time(event.endDate)
                          : i18n.fmt.dateTime(event.endDate)
                      }`}
                </span>
              </div>
              {resource && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 shrink-0" />
                  <span>{resource.name}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
