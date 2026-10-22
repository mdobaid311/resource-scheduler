import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceScheduler } from "./ResourceScheduler";
import { ViewType } from "./types";

beforeEach(() => {
  Element.prototype.scrollTo = vi.fn();
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
  vi.setSystemTime(new Date(2026, 9, 14, 12));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const css = fs
  .readFileSync(path.resolve(__dirname, "../../styles/tokens.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

describe("the view switch", () => {
  it("does nothing when the pressed view is clicked again", () => {
    const onViewChange = vi.fn();
    const onDateChange = vi.fn();
    render(
      <ResourceScheduler
        resources={[{ id: "a", name: "Ann", events: [] }]}
        initialView={ViewType.Month}
        onViewChange={onViewChange}
        onDateChange={onDateChange}
      />
    );
    fireEvent.click(screen.getByLabelText("Next period"));
    fireEvent.click(screen.getByLabelText("Next period"));
    expect(screen.getAllByText("December 2026")).toBeTruthy();
    onDateChange.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Month" }));
    expect(screen.getAllByText("December 2026")).toBeTruthy();
    expect(onViewChange).not.toHaveBeenCalled();
    expect(onDateChange).not.toHaveBeenCalled();
  });
});

describe("a resource with a role", () => {
  it("keeps the name to one line so nothing is cut through", () => {
    render(
      <ResourceScheduler
        resources={[{ id: "a", name: "Maximilian Bartholomew Featherstonehaugh", role: "Senior Backend Engineer", events: [] }]}
      />
    );
    const name = screen.getByText("Maximilian Bartholomew Featherstonehaugh");
    expect(name.className).toContain("line-clamp-1");
    expect(name.className).not.toContain("line-clamp-2");
  });

  it("still wraps a name over two lines without a role", () => {
    render(<ResourceScheduler resources={[{ id: "a", name: "Maximilian Bartholomew", events: [] }]} />);
    expect(screen.getByText("Maximilian Bartholomew").className).toContain("line-clamp-2");
  });
});

describe("a zero-length event at midnight", () => {
  it("does not show a reversed range", () => {
    const at = new Date(2026, 9, 14);
    render(
      <ResourceScheduler
        resources={[{ id: "a", name: "Ann", events: [{ id: "z", title: "Zero", startDate: at, endDate: at }] }]}
        initialView={ViewType.Week}
      />
    );
    const tile = document.querySelector('[data-rs-event="z"]')!;
    expect(tile.textContent).not.toMatch(/Oct 14\s*–\s*Oct 13/);
  });
});

describe("the base reset", () => {
  it("leaves buttons of the host alone", () => {
    const base = css.match(/@layer base\s*\{([\s\S]*?)\n\}/)![1];
    const rule = base.match(/\.rs-root button\s*\{([^}]*)\}/)![1];
    expect(rule).not.toMatch(/border/);
  });

  it("gives the library's own buttons an explicit border reset", () => {
    render(<ResourceScheduler resources={[{ id: "a", name: "Ann", events: [] }]} initialView={ViewType.Week} />);
    for (const el of [
      screen.getByRole("button", { name: "Week" }),
      screen.getByLabelText("Previous period"),
      screen.getByLabelText("Next period"),
      screen.getByRole("button", { name: "Today" }),
    ]) {
      expect(el.className).toMatch(/(^|\s)border-0(\s|$)/);
    }
  });
});

describe("print", () => {
  const print = css.slice(css.indexOf("@media print"));
  it("hides the divider of the resource column and the nav group", () => {
    expect(print).toMatch(/\.rs-resources::after[^{]*\{[^}]*display:\s*none/);
    expect(print).toMatch(/\.rs-nav[^{]*\{[^}]*display:\s*none/);
  });
});

describe("the column totals", () => {
  it("do not shrink, and the label is level with them", () => {
    render(
      <ResourceScheduler
        resources={[{ id: "a", name: "Ann", events: [] }]}
        initialView={ViewType.Week}
        showColumnUtilization
      />
    );
    expect(document.querySelector(".rs-totals")!.className).toContain("shrink-0");
    const label = document.querySelector(".rs-totals-label")!;
    expect(label.previousElementSibling!.hasAttribute("data-rs-spacer")).toBe(true);
  });
});

describe("first-run defaults", () => {
  const ann = [{ id: "a", name: "Ann", events: [] }];
  const pressed = () => screen.getByRole("group", { name: "View" }).querySelector('[aria-pressed="true"]');

  it("opens on the week view when no view is given", () => {
    render(<ResourceScheduler resources={ann} />);
    expect(pressed()?.textContent).toBe("Week");
  });

  it("keeps the shown date when the view changes, instead of jumping to today", () => {
    const onDateChange = vi.fn();
    render(
      <ResourceScheduler
        resources={ann}
        initialView={ViewType.Month}
        initialDate={new Date(2026, 11, 16)}
        onDateChange={onDateChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Week" }));
    expect(pressed()?.textContent).toBe("Week");
    expect(document.querySelector(".rs-toolbar")?.textContent).toMatch(/Dec 13/);
    expect(onDateChange).not.toHaveBeenCalled();
  });

  it("says so when there are no resources, in the labels' language", () => {
    const { rerender } = render(<ResourceScheduler resources={[]} />);
    expect(screen.getByText("No resources to show")).toBeTruthy();
    rerender(<ResourceScheduler resources={[]} labels={{ noResources: "Keine Ressourcen" }} />);
    expect(screen.getByText("Keine Ressourcen")).toBeTruthy();
    rerender(<ResourceScheduler resources={ann} />);
    expect(screen.queryByText("No resources to show")).toBeNull();
  });

  it("names a dragged-out event with the newEvent label", () => {
    const onEventCreate = vi.fn();
    render(
      <ResourceScheduler
        resources={ann}
        initialView={ViewType.Day}
        labels={{ newEvent: "Neuer Termin" }}
        onEventCreate={onEventCreate}
      />
    );
    const slot = document.querySelector("[data-rs-slot]")!;
    fireEvent.mouseDown(slot, { button: 0 });
    fireEvent.mouseUp(window);
    expect(onEventCreate).toHaveBeenCalledTimes(1);
    expect(onEventCreate.mock.calls[0][0].title).toBe("Neuer Termin");
  });

  it("shows resize handles on touch screens, where there is no hover", () => {
    render(
      <ResourceScheduler
        resources={[
          {
            id: "a",
            name: "Ann",
            events: [{ id: "e", title: "Standup", startDate: new Date(2026, 9, 14, 9), endDate: new Date(2026, 9, 14, 10) }],
          },
        ]}
        initialView={ViewType.Day}
        onEventResize={() => {}}
      />
    );
    const handles = document.querySelectorAll("[data-rs-resize]");
    expect(handles.length).toBeGreaterThan(0);
    handles.forEach((h) => expect(h.className).toContain("pointer-coarse:opacity-100"));
  });

  it("does not repeat the Today button's text as its accessible name", () => {
    render(<ResourceScheduler resources={ann} />);
    const today = screen.getByRole("button", { name: "Today" });
    expect(today.hasAttribute("aria-label")).toBe(false);
  });
});
