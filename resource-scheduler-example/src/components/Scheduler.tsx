import { useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import {
  ResourceScheduler,
  ViewType,
  type Event,
  type Resource,
} from "resource-scheduler";
import CalenderIcon from "./CalenderIcon";
import npmIcon from "../assets/npm-icon.svg";
import { sampleResources } from "../sampleData";

const Scheduler = () => {
  const [eventsCreated, setEventsCreated] = useState(0);
  const [eventsDropped, setEventsDropped] = useState(0);
  const [lastAction, setLastAction] = useState<string>("");

  const [resources, setResources] = useState<Resource[]>(sampleResources);

  // Handler functions
  const handleDateChange = (date: Date) => {
    setLastAction(`Date changed to: ${date.toDateString()}`);
  };

  const handleEventClick = (event: Event, resource: Resource) => {
    setLastAction(`Event clicked: ${event.title} (${resource.name})`);
  };

  const handleEventCreate = (
    eventData: Omit<Event, "id">,
    resourceId: string
  ) => {
    const newEvent: Event = {
      ...eventData,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setResources((prevResources) =>
      prevResources.map((resource) =>
        resource.id === resourceId
          ? { ...resource, events: [...resource.events, newEvent] }
          : resource
      )
    );

    setEventsCreated((prev) => prev + 1);
    setLastAction(`Event created on resource: ${resourceId}`);
  };

  const handleEventDrop = (
    event: Event,
    fromResourceId: string,
    toResourceId: string,
    newStartDate: Date,
    newEndDate: Date
  ) => {
    setResources((prevResources) => {
      return prevResources.map((resource: Resource) => {
        if (resource.id === fromResourceId) {
          return {
            ...resource,
            events: resource.events.filter((e: Event) => e.id !== event.id),
          };
        }
        if (resource.id === toResourceId) {
          return {
            ...resource,
            events: [
              ...resource.events,
              {
                ...event,
                startDate: newStartDate,
                endDate: newEndDate,
              },
            ],
          };
        }
        return resource;
      });
    });
    setEventsDropped((prev) => prev + 1);
    setLastAction(`Event moved from ${fromResourceId} to ${toResourceId}`);
  };

  const handleViewChange = (view: ViewType) => {
    setLastAction(`View changed to: ${view}`);
  };

  const handleClearStats = () => {
    setEventsCreated(0);
    setEventsDropped(0);
    setLastAction("Stats cleared");
  };

  const handleResetData = () => {
    setResources([
      {
        id: "1",
        name: "John Doe",
        role: "Frontend Developer",
        events: [
          {
            id: "e1",
            startDate: new Date("2025-09-10T10:00:00"),
            endDate: new Date("2025-09-10T12:00:00"),
            title: "Team Meeting",
            color: "#3b82f6",
            description: "Weekly team sync",
          },
          {
            id: "e2",
            startDate: new Date("2025-09-11T14:00:00"),
            endDate: new Date("2025-09-11T16:00:00"),
            title: "Code Review",
            color: "#10b981",
            description: "PR review session",
          },
        ],
      },
      {
        id: "2",
        name: "Jane Smith",
        role: "UX Designer",
        events: [
          {
            id: "e3",
            startDate: new Date("2025-09-10T13:00:00"),
            endDate: new Date("2025-09-10T15:00:00"),
            title: "User Research",
            color: "#8b5cf6",
            description: "User testing session",
          },
          {
            id: "e4",
            startDate: new Date("2025-09-12T09:00:00"),
            endDate: new Date("2025-09-12T11:00:00"),
            title: "Design Workshop",
            color: "#f59e0b",
            description: "New feature design",
          },
        ],
      },
      {
        id: "3",
        name: "Mike Johnson",
        role: "Backend Developer",
        events: [
          {
            id: "e5",
            startDate: new Date("2025-09-11T10:00:00"),
            endDate: new Date("2025-09-11T12:30:00"),
            title: "API Development",
            color: "#ef4444",
            description: "New endpoints implementation",
          },
        ],
      },
      {
        id: "4",
        name: "Sarah Wilson",
        role: "Project Manager",
        events: [
          {
            id: "e6",
            startDate: new Date("2025-09-12T14:00:00"),
            endDate: new Date("2025-09-12T16:00:00"),
            title: "Client Demo",
            color: "#ec4899",
            description: "Quarterly review with client",
          },
        ],
      },
    ]);
    setEventsCreated(0);
    setEventsDropped(0);
    setLastAction("Data reset to initial state");
  };

  // Copy to clipboard function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setLastAction("Code copied to clipboard!");
    });
  };

  // Custom popover renderer
  const renderEventPopover = (
    event: Event,
    resource: Resource,
    closePopover: () => void
  ) => (
    <div className="space-y-3 p-4 bg-white rounded-lg border shadow-lg">
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-lg text-gray-900">{event.title}</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={closePopover}
          className="h-8 w-8 p-0 hover:bg-gray-100"
        >
          ×
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
          style={{ backgroundColor: event.color }}
        ></div>
        <span className="text-sm font-medium text-gray-700">
          {resource.name}
        </span>
        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
          {resource.role}
        </Badge>
      </div>
      <p className="text-sm text-gray-600">{event.description}</p>
      <div className="text-sm space-y-1 text-gray-500">
        <div>Start: {event.startDate.toLocaleString()}</div>
        <div>End: {event.endDate.toLocaleString()}</div>
      </div>
      <Button size="sm" className="w-full">
        Edit Event
      </Button>
    </div>
  );

  // Code snippets
  const installationCode = `npm install resource-scheduler
# or
yarn add resource-scheduler
# or
pnpm add resource-scheduler

import "resource-scheduler/dist/resource-scheduler.css";`;

  const usageCode = `import { useState } from "react";
import { ResourceScheduler, ViewType, type Event, type Resource } from "resource-scheduler";
import "resource-scheduler/dist/resource-scheduler.css";

function App() {
  const [resources, setResources] = useState<Resource[]>([
    {
      id: "1",
      name: "John Doe",
      role: "Frontend Developer",
      events: [
        {
          id: "e1",
          startDate: new Date("2025-09-10T10:00:00"),
          endDate: new Date("2025-09-10T12:00:00"),
          title: "Team Meeting",
          color: "#3b82f6",
          description: "Weekly team sync",
        },
      ],
    },
  ]);

  const handleEventCreate = (eventData: Omit<Event, "id">, resourceId: string) => {
    const newEvent: Event = {
      ...eventData,
      id: \`event-\${Date.now()}\`,
    };

    setResources(prev => 
      prev.map(resource => 
        resource.id === resourceId 
          ? { ...resource, events: [...resource.events, newEvent] }
          : resource
      )
    );
  };

  const handleEventDrop = (
    event: Event,
    fromResourceId: string,
    toResourceId: string,
    newStartDate: Date,
    newEndDate: Date
  ) => {
    setResources(prev => 
      prev.map(resource => {
        if (resource.id === fromResourceId) {
          return {
            ...resource,
            events: resource.events.filter(e => e.id !== event.id),
          };
        }
        if (resource.id === toResourceId) {
          return {
            ...resource,
            events: [
              ...resource.events,
              { ...event, startDate: newStartDate, endDate: newEndDate },
            ],
          };
        }
        return resource;
      })
    );
  };

  return (
    <div style={{ height: '600px' }}>
      <ResourceScheduler
        resources={resources}
        initialView={ViewType.Week}
        onEventCreate={handleEventCreate}
        onEventDrop={handleEventDrop}
      />
    </div>
  );
}`;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="container mx-auto max-w-7xl">
        <header className="mb-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full ">
              <CalenderIcon />
            </span>
            <span className="text-xs uppercase tracking-widest font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
              v1.0
            </span>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3 drop-shadow-sm">
            Resource Scheduler Demo
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-4">
            A <span className="font-semibold text-blue-600">responsive</span>{" "}
            resource scheduling component for React applications.
            <br />
            <span className="inline-block mt-2 text-sm text-gray-500">
              Drag, drop, and manage events with ease.
            </span>
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            <a
              href="https://github.com/mdobaid311/resource-scheduler"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-[#24292f] text-white rounded-lg font-medium shadow hover:bg-[#1b1f23] transition"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.73 1.27 3.4.97.11-.76.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98.01 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.7.42.36.79 1.09.79 2.2 0 1.59-.01 2.87-.01 3.26 0 .31.21.68.8.56C20.71 21.39 24 17.08 24 12c0-6.27-5.23-11.5-12-11.5z" />
              </svg>
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/resource-scheduler"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-white border border-blue-600 text-blue-600 rounded-lg font-medium shadow hover:bg-blue-50 transition"
            >
              <img src={npmIcon} alt="NPM" className="w-5 h-5 mr-2" />
              NPM
            </a>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card className="shadow-sm border">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Scheduler Preview</CardTitle>
                <CardDescription className="text-gray-600">
                  Drag to create events, click on events to view details, and
                  drag events to reschedule or reassign
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] border rounded-lg bg-white">
                  <ResourceScheduler
                    resources={resources}
                    allowViewChange={true}
                    dateColumnWidth="100px"
                    initialDate={new Date()}
                    initialView={ViewType.Week}
                    onDateChange={handleDateChange}
                    onEventClick={handleEventClick}
                    onEventCreate={handleEventCreate}
                    onEventDrop={handleEventDrop}
                    onViewChange={handleViewChange}
                    renderEventPopover={renderEventPopover}
                    resourceColumnWidth="200px"
                    timeColumnWidth="60px"
                  />
                </div>

                <Tabs defaultValue="installation" className="mt-8">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="installation">Installation</TabsTrigger>
                    <TabsTrigger value="usage">Usage</TabsTrigger>
                    <TabsTrigger value="props">API Reference</TabsTrigger>
                  </TabsList>

                  <TabsContent value="installation">
                    <Card>
                      <CardHeader>
                        <CardTitle>Installation</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="relative">
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                            {installationCode}
                          </pre>
                          <Button
                            size="sm"
                            className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600"
                            onClick={() => copyToClipboard(installationCode)}
                          >
                            Copy
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="usage">
                    <Card>
                      <CardHeader>
                        <CardTitle>Basic Usage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="relative">
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                            {usageCode}
                          </pre>
                          <Button
                            size="sm"
                            className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600"
                            onClick={() => copyToClipboard(usageCode)}
                          >
                            Copy
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="props">
                    <Card>
                      <CardHeader>
                        <CardTitle>API Reference</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-semibold text-gray-900">
                              resources: Resource[]
                            </h4>
                            <p className="text-gray-600 text-sm mt-1">
                              Array of resources to display in the scheduler
                            </p>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-semibold text-gray-900">
                              initialDate?: Date
                            </h4>
                            <p className="text-gray-600 text-sm mt-1">
                              Initial date to display (defaults to current date)
                            </p>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-semibold text-gray-900">
                              initialView?: ViewType
                            </h4>
                            <p className="text-gray-600 text-sm mt-1">
                              Initial view type (Day, Week, Month, Quarter,
                              Year)
                            </p>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-semibold text-gray-900">
                              onEventCreate?: function
                            </h4>
                            <p className="text-gray-600 text-sm mt-1">
                              Callback when a new event is created by dragging
                            </p>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-semibold text-gray-900">
                              onEventDrop?: function
                            </h4>
                            <p className="text-gray-600 text-sm mt-1">
                              Callback when an event is moved to a new time or
                              resource
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-sm border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Interaction Stats</CardTitle>
                <CardDescription>
                  Track your interactions with the scheduler
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Events Created</span>
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-700"
                  >
                    {eventsCreated}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Events Moved</span>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700"
                  >
                    {eventsDropped}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Last Action
                  </p>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-sm text-gray-600">
                      {lastAction || "No actions yet"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleClearStats}
                  >
                    Clear Stats
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleResetData}
                  >
                    Reset Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Multiple view types (Day, Week, Month, Quarter, Year)",
                  "Drag to create events",
                  "Drag to move events between resources",
                  "Customizable event popovers",
                  "Responsive design",
                  "Customizable styling",
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-sm border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Try These Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Drag on empty slots to create new events",
                  "Click on existing events to view details",
                  "Drag events to move them to different times or resources",
                  "Use the view selector to change between different time views",
                  "Use navigation buttons to move through time",
                  'Click "Today" to return to the current date',
                ].map((action, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-medium flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {action}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scheduler;
