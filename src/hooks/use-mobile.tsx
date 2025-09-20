import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = () => setIsMobile(mql.matches);

    onChange(); // Set initial state
    mql.addEventListener("change", onChange);

    return () => {
      mql.removeEventListener("change", onChange);
    };
  }, []);

  return isMobile;
}
