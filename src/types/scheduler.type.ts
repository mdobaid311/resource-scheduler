export interface Event {
  id: string;
  title: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  startDate: Date;
  endDate: Date;
  color?: string;
}

export interface Resource {
  id: string;
  name: string;
  role?: string;
  timezone?: string;
  events: Event[];
}
