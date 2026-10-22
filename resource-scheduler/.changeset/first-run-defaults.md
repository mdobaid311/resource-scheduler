---
"resource-scheduler": minor
---

Friendlier first run. **Behaviour changes:** the scheduler (and `createSchedulerStore`) now opens on the week view when `initialView` is not given (it was the day view; pass `initialView={ViewType.Day}` to keep it), and switching views keeps the shown date instead of jumping back to today (`onDateChange` no longer fires on a view switch). Also new: an empty `resources` list shows "No resources to show" (`labels.noResources`), the title of an event made by dragging is `labels.newEvent`, resize handles are always visible on touch screens, and the Today button no longer repeats its text as an `aria-label`.
