// Line icons for the showcase chrome: 24px grid, 1.75 stroke, drawn in currentColor.
import type { ReactNode, SVGProps } from "react";

const Icon = ({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

export const Door = () => (
  <Icon>
    <path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21" />
    <path d="M3 21h18" />
    <path d="M14.5 12v.01" />
  </Icon>
);

export const Clock = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);

export const Box = () => (
  <Icon>
    <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
    <path d="m3 8 9 5 9-5" />
    <path d="M12 13v8" />
  </Icon>
);

export const Pin = () => (
  <Icon>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Icon>
);

export const Gantt = () => (
  <Icon>
    <path d="M4 6h9" />
    <path d="M8 12h12" />
    <path d="M4 18h7" />
  </Icon>
);

export const Chart = () => (
  <Icon>
    <path d="M3 20h18" />
    <path d="M7 16v-4" />
    <path d="M12 16V7" />
    <path d="M17 16v-6" />
  </Icon>
);

export const Book = () => (
  <Icon>
    <path d="M5 19.5V5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2z" />
    <path d="M9 7h6" />
  </Icon>
);

export const Drop = () => (
  <Icon>
    <path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z" />
  </Icon>
);

export const Code = () => (
  <Icon>
    <path d="m8 7-5 5 5 5" />
    <path d="m16 7 5 5-5 5" />
  </Icon>
);

export const Sun = () => (
  <Icon width="16" height="16">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

export const Moon = () => (
  <Icon width="16" height="16">
    <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
  </Icon>
);

export const Monitor = () => (
  <Icon width="16" height="16">
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </Icon>
);

export const ArrowRight = () => (
  <Icon width="16" height="16">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Icon>
);

/** The product mark: a timeline on a rounded tile. */
export const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="var(--rs-primary)" />
    <rect x="7" y="9" width="11" height="4" rx="2" fill="var(--rs-primary-foreground)" />
    <rect x="12" y="15" width="13" height="4" rx="2" fill="var(--rs-primary-foreground)" opacity="0.75" />
    <rect x="7" y="21" width="8" height="4" rx="2" fill="var(--rs-primary-foreground)" opacity="0.5" />
  </svg>
);
