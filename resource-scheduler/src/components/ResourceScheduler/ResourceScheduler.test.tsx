import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceScheduler } from "./ResourceScheduler";
import { ViewType } from "./types";

const scrollTo = vi.fn();

beforeEach(() => {
  // jsdom has no layout engine: stub what the component asks the browser for.
  Element.prototype.scrollTo = scrollTo;
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 12)); // a Wednesday
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  scrollTo.mockClear();
});

describe("ResourceScheduler", () => {
  it("scrolls to the displayed date, not to today", () => {
    render(
      <ResourceScheduler
        resources={[]}
        initialDate={new Date(2024, 2, 16)} // a Saturday: column 6 of its week
        initialView={ViewType.Week}
      />
    );

    // 6 columns * 140px + half a column, clientWidth is 0 in jsdom
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 910, behavior: "smooth" });
  });

  it("scrolls the element that actually overflows horizontally", () => {
    render(<ResourceScheduler resources={[]} initialView={ViewType.Week} />);

    const { contexts } = scrollTo.mock;
    const scroller = contexts[contexts.length - 1] as HTMLElement;
    expect(scroller.className).toContain("overflow-x-auto");
  });

  it("applies resourceColumnWidth to the resource column", () => {
    render(
      <ResourceScheduler
        resources={[]}
        initialView={ViewType.Week}
        resourceColumnWidth="300px"
      />
    );

    const column = screen.getByText("Resources").parentElement!.parentElement!;
    expect(column.style.width).toBe("300px");
  });
});
