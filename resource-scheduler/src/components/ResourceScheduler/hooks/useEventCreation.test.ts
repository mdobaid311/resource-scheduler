import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ViewType } from "../types";
import { useEventCreation } from "./useEventCreation";

const slot = (hour: number) => new Date(2026, 2, 10, hour);
const releaseMouse = () => window.dispatchEvent(new MouseEvent("mouseup"));

describe("useEventCreation", () => {
  it("creates a one-slot event on a plain click", () => {
    const onCreate = vi.fn();
    const { result } = renderHook(() =>
      useEventCreation(onCreate, ViewType.Day)
    );

    act(() => result.current.handleMouseDown(slot(9), "r1"));
    act(releaseMouse);

    expect(onCreate).toHaveBeenCalledTimes(1);
    const [event, resourceId] = onCreate.mock.calls[0];
    expect(resourceId).toBe("r1");
    expect(event.startDate).toEqual(slot(9));
    expect(event.endDate).toEqual(slot(10));
  });

  it("includes the last dragged slot", () => {
    const onCreate = vi.fn();
    const { result } = renderHook(() =>
      useEventCreation(onCreate, ViewType.Day)
    );

    act(() => result.current.handleMouseDown(slot(9), "r1"));
    act(() => result.current.handleMouseEnter(slot(11), "r1"));
    act(releaseMouse);

    const [event] = onCreate.mock.calls[0];
    expect(event.startDate).toEqual(slot(9));
    expect(event.endDate).toEqual(slot(12));
  });

  it("finishes the selection when the mouse is released outside the grid", () => {
    const onCreate = vi.fn();
    const { result } = renderHook(() =>
      useEventCreation(onCreate, ViewType.Day)
    );

    act(() => result.current.handleMouseDown(slot(9), "r1"));
    act(releaseMouse);

    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragStart).toBeNull();
  });

  it("skips creation when the placement is rejected", () => {
    const onCreate = vi.fn();
    const checkPlacement = vi.fn(() => false);
    const { result } = renderHook(() =>
      useEventCreation(onCreate, ViewType.Day, checkPlacement)
    );

    act(() => result.current.handleMouseDown(slot(9), "r1"));
    act(() => result.current.handleMouseEnter(slot(10), "r1"));
    act(releaseMouse);

    expect(checkPlacement).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: slot(9), endDate: slot(11) }),
      { resourceId: "r1", start: slot(9), end: slot(11) }
    );
    expect(onCreate).not.toHaveBeenCalled();
    expect(result.current.isDragging).toBe(false);
  });

  it("creates the event when the placement is accepted", () => {
    const onCreate = vi.fn();
    const { result } = renderHook(() =>
      useEventCreation(onCreate, ViewType.Day, () => true)
    );

    act(() => result.current.handleMouseDown(slot(9), "r1"));
    act(releaseMouse);

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("does not create an event when the drag leaves the resource row", () => {
    const onCreate = vi.fn();
    const { result } = renderHook(() =>
      useEventCreation(onCreate, ViewType.Day)
    );

    act(() => result.current.handleMouseDown(slot(9), "r1"));
    act(() => result.current.handleMouseEnter(slot(10), "r2"));
    act(releaseMouse);

    expect(onCreate).not.toHaveBeenCalled();
    expect(result.current.isDragging).toBe(false);
  });

  describe("commitRange (keyboard selection)", () => {
    it("creates an event covering the first to last slot", () => {
      const onCreate = vi.fn();
      const { result } = renderHook(() => useEventCreation(onCreate, ViewType.Day));

      act(() => result.current.commitRange("r1", slot(9), slot(10)));

      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({ startDate: slot(9), endDate: slot(11) }),
        "r1"
      );
    });

    it("applies the same placement rules as the mouse", () => {
      const onCreate = vi.fn();
      const { result } = renderHook(() =>
        useEventCreation(onCreate, ViewType.Day, () => false)
      );

      act(() => result.current.commitRange("r1", slot(9), slot(9)));

      expect(onCreate).not.toHaveBeenCalled();
    });
  });
});
