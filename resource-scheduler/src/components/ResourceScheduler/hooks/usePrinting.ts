// src/components/ResourceScheduler/hooks/usePrinting.ts
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useMediaQuery } from "./use-media-query";

/**
 * True while the page is printed: between `beforeprint` and `afterprint`, or
 * while the `print` media query matches (a print preview, or print media
 * emulated in DevTools or a test). The grid draws every row and column then:
 * a printout has no scroll position to draw a window around.
 */
export function usePrinting(): boolean {
  const media = useMediaQuery("print");
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    // The browser lays the page out for paper right after `beforeprint`
    // returns, in the same task, so the render has to be done by then: a
    // plain state update is scheduled for later and would print the window.
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  return media || printing;
}
