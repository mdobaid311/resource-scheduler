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

const Scheduler = () => {
  const [eventsCreated, setEventsCreated] = useState(0);
  const [eventsDropped, setEventsDropped] = useState(0);
  const [lastAction, setLastAction] = useState<string>("");

  // Helper to get a date relative to today
  const getRelativeDate = (
    daysOffset: number,
    hours: number,
    minutes: number
  ) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + daysOffset);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const [resources, setResources] = useState<Resource[]>([
    {
      id: "1",
      name: "John Doe",
      role: "Frontend Developer",
      events: [
        {
          id: "e1",
          startDate: getRelativeDate(0, 10, 0),
          endDate: getRelativeDate(0, 12, 0),
          title: "Team Meeting",
          color: "#3b82f6",
          description: "Weekly team sync",
        },
        {
          id: "e2",
          startDate: getRelativeDate(1, 14, 0),
          endDate: getRelativeDate(1, 16, 0),
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
          startDate: getRelativeDate(0, 13, 0),
          endDate: getRelativeDate(0, 15, 0),
          title: "User Research",
          color: "#8b5cf6",
          description: "User testing session",
        },
        {
          id: "e4",
          startDate: getRelativeDate(2, 9, 0),
          endDate: getRelativeDate(2, 11, 0),
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
          startDate: getRelativeDate(1, 10, 0),
          endDate: getRelativeDate(1, 12, 30),
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
          startDate: getRelativeDate(2, 14, 0),
          endDate: getRelativeDate(2, 16, 0),
          title: "Client Demo",
          color: "#ec4899",
          description: "Quarterly review with client",
        },
      ],
    },
  ]);

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
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Resource Scheduler Demo
          </h1>
          <p className="text-gray-600 text-lg">
            A fully customizable resource scheduling component for React
            applications
          </p>
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
