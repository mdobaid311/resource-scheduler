import { DndProvider } from "react-dnd";
import { Resource } from "./types/scheduler.type";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ResourceScheduler } from "./components/ResourceScheduler";

const App = () => {
  const resources: Resource[] = [
    {
      id: "1",
      name: "Resource 1",
      events: [
        {
          id: "e1",
          startDate: new Date("2025-09-10T10:00:00"),
          endDate: new Date("2025-09-10T12:00:00"),
          title: "Event 1",
          color: "blue",
        },
        {
          id: "e2",
          startDate: new Date("2025-09-11T10:00:00"),
          endDate: new Date("2025-09-11T12:00:00"),
          title: "Event 1",
          color: "blue",
        },
        {
          id: "e3",
          startDate: new Date("2025-09-12T10:00:00"),
          endDate: new Date("2025-09-13T12:00:00"),
          title: "Event 1",
          color: "blue",
        },
      ],
    },
  ];

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <DndProvider backend={HTML5Backend}>
        <ResourceScheduler resources={resources} />
      </DndProvider>
    </div>
  );
};

export default App;
