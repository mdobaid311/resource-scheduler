import { useState } from "react";
import type { SlotSelection } from "@scheduler/types";

/** The "your own create dialog" that onSlotSelect makes possible. */
export function SlotForm({
  slot,
  nameOf,
  onCreate,
  onCancel,
}: {
  slot: SlotSelection;
  nameOf: (resourceId: string) => string;
  onCreate: (title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const time = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return (
    <form
      className="demo-form"
      onSubmit={(e) => {
        e.preventDefault();
        onCreate(title.trim() || "Untitled");
      }}
    >
      <span>
        {nameOf(slot.resourceId)}, {time(slot.start)} to {time(slot.end)}
      </span>
      <input
        autoFocus
        type="text"
        placeholder="Title"
        aria-label="Event title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button type="submit">Create</button>
      <button type="button" className="secondary" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}
