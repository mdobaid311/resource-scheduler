// The six icons the scheduler draws, as inline SVG so the package needs no icon
// library. The paths are from Lucide (ISC license, https://lucide.dev).
import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement>;

function icon(name: string, children: React.ReactNode) {
  const Icon = (props: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
  Icon.displayName = name;
  return Icon;
}

export const Calendar = icon(
  "Calendar",
  <>
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </>
);

export const User = icon(
  "User",
  <>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>
);

export const ChevronDown = icon("ChevronDown", <path d="m6 9 6 6 6-6" />);
export const ChevronLeft = icon("ChevronLeft", <path d="m15 18-6-6 6-6" />);
export const ChevronRight = icon("ChevronRight", <path d="m9 18 6-6-6-6" />);

export const GripVertical = icon(
  "GripVertical",
  <>
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="19" r="1" />
  </>
);
