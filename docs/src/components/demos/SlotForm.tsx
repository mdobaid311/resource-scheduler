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
      <label className="field">
        Title
        <input autoFocus type="text" placeholder="Untitled" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <button type="submit">Create</button>
      <button type="button" className="secondary" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}
