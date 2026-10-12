import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceScheduler } from "./ResourceScheduler";
import { type Resource, ViewType } from "./types";
import { moveResource, reorderGroup } from "./utils/reorder";

beforeEach(() => {
  // jsdom has no layout engine: stub what the component asks the browser for.
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
  vi.setSystemTime(new Date(2026, 9, 7, 12));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const day = new Date(2026, 2, 10);
// Shown as: header A (36 px), Ann, Cy (60 px each), header B, Bob, Di.
const people = (): Resource[] => [
  { id: "ann", name: "Ann", events: [], group: "Ward A" },
  { id: "bob", name: "Bob", events: [], group: "Ward B" },
  { id: "cy", name: "Cy", events: [], group: "Ward A" },
  { id: "di", name: "Di", events: [] },
];
type Props = Partial<React.ComponentProps<typeof ResourceScheduler>>;
const base: Props = { initialDate: day, initialView: ViewType.Day, dayStartHour: 9, dayEndHour: 11 };
const show = (props: Props = {}) => render(<ResourceScheduler resources={people()} {...base} {...props} />);

// The app keeps the list and applies the helpers, as the docs show.
function Harness(props: Props) {
  const [list, setList] = useState(people());
  return (
    <ResourceScheduler
      resources={list}
      {...base}
      onGroupReorder={(key, before) => setList((l) => reorderGroup(l, key, before))}
      onResourceReorder={(id, before, group) => setList((l) => moveResource(l, id, before, group))}
      {...props}
    />
  );
}

const column = () => screen.getByText("Resources").parentElement!.parentElement!;
const header = (name: string, count: number) =>
  screen.getByRole("button", { name: new RegExp(`^${name}, ${count} resource`) });
const cell = (name: string) => screen.getByText(name).closest<HTMLElement>("[data-rs-row]")!;
const handleOf = (row: HTMLElement) => row.querySelector<HTMLElement>("[data-rs-handle]")!;
const handles = () => document.querySelectorAll("[data-rs-handle]");
const headerNames = () =>
  screen.getAllByRole("button", { name: /resource/ }).map((b) => b.textContent!.replace(/\d+$/, ""));
const status = () => screen.getByRole("status").textContent;
const altKey = (el: HTMLElement, key: "ArrowUp" | "ArrowDown") => fireEvent.keyDown(el, { key, altKey: true });

// Row boxes in px, from the heights the column gives its rows; the date header above them is 56 px.
const TOP = 56;
const rows = () =>
  [...column().children]
    .slice(1)
    .filter((el) => (el as HTMLElement).style.height)
    .map((el) => parseFloat((el as HTMLElement).style.height));
const topOf = (index: number) => TOP + rows().slice(0, index).reduce((a, b) => a + b, 0);

const press = (el: HTMLElement, y = 100) =>
  fireEvent.pointerDown(el, { button: 0, clientX: 10, clientY: y, pointerId: 1 });
const moveTo = (y: number) => fireEvent.pointerMove(window, { clientX: 10, clientY: y, pointerId: 1 });
const release = (y: number) => fireEvent.pointerUp(window, { clientX: 10, clientY: y, pointerId: 1 });

describe("reordering is opt in", () => {
  it("adds nothing without the callbacks", () => {
    show();
    expect(handles()).toHaveLength(0);
    expect(document.querySelector("[data-rs-row]")).toBeNull();
    expect(document.querySelector("[aria-keyshortcuts]")).toBeNull();
    expect(column().querySelector("[tabindex]")).toBeNull();
  });

  it("puts a handle on group headers only with onGroupReorder", () => {
    show({ onGroupReorder: vi.fn() });
    expect(handles()).toHaveLength(2);
    expect(header("Ward A", 2).querySelector("[data-rs-handle]")).toBeTruthy();
  });

  it("puts a handle on resource cells only with onResourceReorder", () => {
    show({ onResourceReorder: vi.fn() });
    expect(handles()).toHaveLength(4);
    expect(handleOf(cell("Ann"))).toBeTruthy();
    expect(header("Ward A", 2).querySelector("[data-rs-handle]")).toBeNull();
  });

  it("names the handle in the current language", () => {
    show({ onResourceReorder: vi.fn(), labels: { dragToReorder: "Ziehen zum Sortieren" } });
    expect(handleOf(cell("Ann")).getAttribute("title")).toBe("Ziehen zum Sortieren");
  });

  it("explains the keys to screen readers, and points the rows at the text", () => {
    show({ onGroupReorder: vi.fn(), onResourceReorder: vi.fn(), labels: { reorderHelp: "Alt plus arrows moves it." } });
    const help = screen.getByText("Alt plus arrows moves it.");
    expect(help.className).toContain("sr-only");
    expect(header("Ward A", 2).getAttribute("aria-describedby")).toBe(help.id);
    expect(header("Ward A", 2).getAttribute("aria-keyshortcuts")).toBe("Alt+ArrowUp Alt+ArrowDown");
    expect(cell("Ann").getAttribute("aria-describedby")).toBe(help.id);
  });

  it("does not stop a header from folding", () => {
    show({ onGroupReorder: vi.fn() });
    fireEvent.click(header("Ward A", 2));
    expect(header("Ward A", 2).getAttribute("aria-expanded")).toBe("false");
  });

  it("does not fold a group when its handle is clicked", () => {
    show({ onGroupReorder: vi.fn() });
    fireEvent.click(handleOf(header("Ward A", 2)));
    expect(header("Ward A", 2).getAttribute("aria-expanded")).toBe("true");
  });
});

describe("with the keyboard", () => {
  it("moves a group up with Alt+ArrowUp", () => {
    const onGroupReorder = vi.fn();
    show({ onGroupReorder });
    altKey(header("Ward B", 1), "ArrowUp");
    expect(onGroupReorder).toHaveBeenCalledWith("Ward B", "Ward A");
  });

  it("moves a group down with Alt+ArrowDown", () => {
    const onGroupReorder = vi.fn();
    show({ onGroupReorder });
    altKey(header("Ward A", 2), "ArrowDown");
    expect(onGroupReorder).toHaveBeenCalledWith("Ward A", null);
  });

  it("says so at the first place, and calls nothing", () => {
    const onGroupReorder = vi.fn();
    show({ onGroupReorder });
    altKey(header("Ward A", 2), "ArrowUp");
    expect(onGroupReorder).not.toHaveBeenCalled();
    expect(status()).toBe("Can't go any further.");
  });

  it("moves a resource up and down", () => {
    const onResourceReorder = vi.fn();
    show({ onResourceReorder });
    altKey(cell("Cy"), "ArrowUp");
    expect(onResourceReorder).toHaveBeenLastCalledWith("cy", "ann", "Ward A");
    altKey(cell("Ann"), "ArrowDown");
    expect(onResourceReorder).toHaveBeenLastCalledWith("ann", null, "Ward A");
  });

  it("carries a resource over the edge of its group", () => {
    const onResourceReorder = vi.fn();
    show({ onResourceReorder });
    altKey(cell("Bob"), "ArrowUp");
    expect(onResourceReorder).toHaveBeenLastCalledWith("bob", "bob", "Ward A"); // joins the end of A
    altKey(cell("Bob"), "ArrowDown");
    expect(onResourceReorder).toHaveBeenLastCalledWith("bob", "di", null); // leaves B
  });

  it("ignores plain arrows, other keys and keys pressed inside a cell", () => {
    const onResourceReorder = vi.fn();
    show({ onResourceReorder, components: { ResourceHeader: ({ resource }) => <input aria-label={resource.name} /> } });
    const row = screen.getByLabelText("Cy").closest<HTMLElement>("[data-rs-row]")!;
    fireEvent.keyDown(row, { key: "ArrowUp" });
    fireEvent.keyDown(row, { key: "Enter", altKey: true });
    fireEvent.keyDown(screen.getByLabelText("Cy"), { key: "ArrowUp", altKey: true });
    expect(onResourceReorder).not.toHaveBeenCalled();
  });

  it("is one tab stop for the resources, moved with the arrow keys", () => {
    show({ onResourceReorder: vi.fn() });
    const stops = () => [...column().querySelectorAll("[data-rs-row][tabindex='0']")];
    expect(stops()).toEqual([cell("Ann")]);
    cell("Ann").focus();
    fireEvent.keyDown(cell("Ann"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(cell("Cy"));
    expect(stops()).toEqual([cell("Cy")]);
    fireEvent.keyDown(cell("Cy"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(cell("Bob")); // steps over the header
    fireEvent.keyDown(cell("Bob"), { key: "ArrowUp" });
    expect(document.activeElement).toBe(cell("Cy"));
  });

  it("applies the move, announces it and keeps the focus on what moved", () => {
    render(<Harness />);
    header("Ward B", 1).focus();
    altKey(header("Ward B", 1), "ArrowUp");
    expect(headerNames()).toEqual(["Ward B", "Ward A"]);
    expect(status()).toBe("Ward B moved to position 1 of 2.");
    expect(document.activeElement).toBe(header("Ward B", 1));

    cell("Cy").focus();
    altKey(cell("Cy"), "ArrowUp");
    expect(status()).toBe("Cy moved to Ward A, position 1 of 2.");
    expect(document.activeElement).toBe(cell("Cy"));
  });

  it("announces in the language of the labels", () => {
    render(<Harness labels={{ announce: { reordered: (name, position, total) => `${name}: ${position}/${total}` } }} />);
    altKey(header("Ward B", 1), "ArrowUp");
    expect(status()).toBe("Ward B: 1/2");
  });

  it("says nothing when the app does not apply the move", () => {
    show({ onGroupReorder: vi.fn() });
    altKey(header("Ward B", 1), "ArrowUp");
    expect(status()).toBe("");
  });

  it("moves a folded group as one unit", () => {
    render(<Harness defaultCollapsedGroups={["Ward A"]} />);
    altKey(header("Ward A", 2), "ArrowDown");
    expect(headerNames()).toEqual(["Ward B", "Ward A"]);
    fireEvent.click(header("Ward A", 2));
    expect(cell("Ann")).toBeTruthy();
    expect(cell("Cy")).toBeTruthy();
    expect(headerNames()).toEqual(["Ward B", "Ward A"]);
  });

  it("works the same right to left", () => {
    const onGroupReorder = vi.fn();
    show({ onGroupReorder, dir: "rtl" });
    altKey(header("Ward B", 1), "ArrowUp");
    expect(onGroupReorder).toHaveBeenCalledWith("Ward B", "Ward A");
  });
});

describe("with the pointer", () => {
  it("drags a group to before another, with a drop line", () => {
    const onGroupReorder = vi.fn();
    show({ onGroupReorder });
    press(handleOf(header("Ward B", 1)), 300);
    moveTo(TOP + 5);
    const line = document.querySelector<HTMLElement>("[data-rs-drop-line]")!;
    expect(line).toBeTruthy();
    expect(line.style.top).toBe(`${TOP - 1}px`);
    expect(onGroupReorder).not.toHaveBeenCalled();
    release(TOP + 5);
    expect(onGroupReorder).toHaveBeenCalledWith("Ward B", "Ward A");
    expect(document.querySelector("[data-rs-drop-line]")).toBeNull();
  });

  it("drags a group to the end", () => {
    const onGroupReorder = vi.fn();
    show({ onGroupReorder });
    press(handleOf(header("Ward A", 2)), 80);
    moveTo(topOf(5) + 50);
    release(topOf(5) + 50);
    expect(onGroupReorder).toHaveBeenCalledWith("Ward A", null);
  });

  it("drags a resource before another, and into another group", () => {
    const onResourceReorder = vi.fn();
    show({ onResourceReorder });
    press(handleOf(cell("Cy")), 200);
    moveTo(topOf(1) + 5);
    expect(document.querySelector<HTMLElement>("[data-rs-drop-line]")!.style.top).toBe(`${topOf(1) - 1}px`);
    release(topOf(1) + 5);
    expect(onResourceReorder).toHaveBeenLastCalledWith("cy", "ann", "Ward A");

    press(handleOf(cell("Di")), 400);
    moveTo(topOf(4) + 5);
    release(topOf(4) + 5);
    expect(onResourceReorder).toHaveBeenLastCalledWith("di", "bob", "Ward B");
  });

  it("drops a resource on a group header to add it at the end of that group", () => {
    const onResourceReorder = vi.fn();
    show({ onResourceReorder, onGroupReorder: vi.fn() });
    press(handleOf(cell("Di")), 400);
    expect(header("Ward A", 2).className).not.toContain("ring-ocrs-primary");
    moveTo(topOf(0) + 5);
    expect(header("Ward A", 2).className).toContain("ring-ocrs-primary");
    release(topOf(0) + 5);
    expect(onResourceReorder).toHaveBeenCalledWith("di", null, "Ward A");
  });

  it("ignores a drop where it already is, and a click without a move", () => {
    const onGroupReorder = vi.fn();
    const onResourceReorder = vi.fn();
    show({ onGroupReorder, onResourceReorder });
    press(handleOf(cell("Cy")), 200);
    moveTo(topOf(2) + 30); // on its own row
    release(topOf(2) + 30);
    press(handleOf(header("Ward A", 2)), 80);
    moveTo(topOf(1) + 5); // inside its own group
    release(topOf(1) + 5);
    press(handleOf(header("Ward A", 2)), 80);
    release(80);
    expect(onGroupReorder).not.toHaveBeenCalled();
    expect(onResourceReorder).not.toHaveBeenCalled();
  });

  it("cancels with Escape", () => {
    const onGroupReorder = vi.fn();
    show({ onGroupReorder });
    press(handleOf(header("Ward B", 1)), 300);
    moveTo(TOP + 5);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.querySelector("[data-rs-drop-line]")).toBeNull();
    release(TOP + 5);
    expect(onGroupReorder).not.toHaveBeenCalled();
  });

  it("dims what is being dragged", () => {
    show({ onGroupReorder: vi.fn() });
    press(handleOf(header("Ward A", 2)), 80);
    moveTo(300);
    expect(header("Ward A", 2).className).toContain("opacity-50");
    release(300);
    expect(header("Ward A", 2).className).not.toContain("opacity-50");
  });

  it("applies a drag through the helpers", () => {
    render(<Harness />);
    press(handleOf(header("Ward B", 1)), 300);
    moveTo(TOP + 5);
    release(TOP + 5);
    expect(headerNames()).toEqual(["Ward B", "Ward A"]);
  });

  it("reaches rows that are not drawn when the list is virtualized", () => {
    const many: Resource[] = Array.from({ length: 150 }, (_, i) => ({
      id: `r${i}`,
      name: `Room ${i}`,
      events: [],
      group: i < 75 ? "North" : "South",
    }));
    const onResourceReorder = vi.fn();
    show({ resources: many, virtualize: true, onResourceReorder });
    expect(document.querySelector("[data-rs-row='r140']")).toBeNull(); // not drawn
    const south = 36 + 75 * 60 + 36; // header North, 75 rows, header South
    press(handleOf(cell("Room 0")), 100);
    moveTo(TOP + south + 65 * 60 + 5); // the upper half of r140
    release(TOP + south + 65 * 60 + 5);
    expect(onResourceReorder).toHaveBeenCalledWith("r0", "r140", "South");
  });
});

describe("together with the other props", () => {
  it.each<[string, Props]>([
    ["showUtilization", { showUtilization: true }],
    ["showColumnUtilization", { showColumnUtilization: true }],
    ["a ResourceHeader component", { components: { ResourceHeader: ({ resource }) => <b>{resource.name}</b> } }],
    ["a time zone", { timeZone: "Europe/Paris" }],
    ["right to left", { dir: "rtl" }],
  ])("reorders with %s", (_name, props) => {
    const onGroupReorder = vi.fn();
    const onResourceReorder = vi.fn();
    show({ onGroupReorder, onResourceReorder, ...props });
    altKey(header("Ward B", 1), "ArrowUp");
    altKey(cell("Cy"), "ArrowUp");
    expect(onGroupReorder).toHaveBeenCalledWith("Ward B", "Ward A");
    expect(onResourceReorder).toHaveBeenCalledWith("cy", "ann", "Ward A");
    press(handleOf(cell("Di")), 400);
    moveTo(topOf(4) + 5);
    release(topOf(4) + 5);
    expect(onResourceReorder).toHaveBeenLastCalledWith("di", "bob", "Ward B");
  });

  it("uses logical positions, so the handle and the line follow the reading direction", () => {
    show({ onResourceReorder: vi.fn(), dir: "rtl" });
    press(handleOf(cell("Cy")), 200);
    moveTo(topOf(1) + 5);
    const line = document.querySelector<HTMLElement>("[data-rs-drop-line]")!;
    const classes = [line.className, handleOf(cell("Ann")).className, cell("Ann").className].join(" ");
    expect(classes).toContain("inset-x-0");
    expect(classes).toContain("start-");
    expect(classes).not.toMatch(/\b(left|right|ml|mr|pl|pr)-/);
    release(topOf(1) + 5);
  });
});

describe("a flat list", () => {
  it("reorders resources without any groups", () => {
    const onResourceReorder = vi.fn();
    const flat: Resource[] = [
      { id: "a", name: "Aa", events: [] },
      { id: "b", name: "Bb", events: [] },
    ];
    show({ resources: flat, onResourceReorder });
    altKey(cell("Bb"), "ArrowUp");
    expect(onResourceReorder).toHaveBeenCalledWith("b", "a", null);
  });
});
