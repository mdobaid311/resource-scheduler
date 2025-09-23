import { useState } from "react";
import { ResourceScheduler } from "./components/ResourceScheduler";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import {
  Event,
  Resource,
  ViewType,
} from "./components/ResourceScheduler/types";

const App = () => {
  const [eventsCreated, setEventsCreated] = useState(0);
  const [eventsDropped, setEventsDropped] = useState(0);
  const [lastAction, setLastAction] = useState<string>("");
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

  // Handler functions
  const handleDateChange = (date: Date) => {
    setLastAction(`Date changed to: ${date.toDateString()}`);
    console.log("Date changed:", date);
  };

  const handleEventClick = (event: Event, resource: Resource) => {
    setLastAction(`Event clicked: ${event.title} (${resource.name})`);
    console.log("Event clicked:", event, resource);
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
    console.log("Event created:", newEvent, resourceId);
  };

  const handleEventDrop = (
    event: Event,
    fromResourceId: string,
    toResourceId: string,
    newStartDate: Date,
    newEndDate: Date
  ) => {
    // First remove the event from the original resource
    const updatedResources = resources.map((resource) =>
      resource.id === fromResourceId
        ? {
            ...resource,
            events: resource.events.filter((e) => e.id !== event.id),
          }
        : resource
    );

    // Then add it to the new resource with updated dates
    const updatedEvent = {
      ...event,
      startDate: newStartDate,
      endDate: newEndDate,
    };

    const finalResources = updatedResources.map((resource) =>
      resource.id === toResourceId
        ? {
            ...resource,
            events: [...resource.events, updatedEvent],
          }
        : resource
    );

    setResources(finalResources);
    setEventsDropped((prev) => prev + 1);
    setLastAction(`Event moved from ${fromResourceId} to ${toResourceId}`);
    console.log(
      "Event dropped:",
      event,
      fromResourceId,
      toResourceId,
      newStartDate,
      newEndDate
    );
  };

  const handleViewChange = (view: ViewType) => {
    setLastAction(`View changed to: ${view}`);
    console.log("View changed:", view);
  };

  const handleClearStats = () => {
    setEventsCreated(0);
    setEventsDropped(0);
    setLastAction("Stats cleared");
  };

  // Function to reset to initial data
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

  // Custom popover renderer
  const renderEventPopover = (
    event: Event,
    resource: Resource,
    closePopover: () => void
  ) => (
    <div className="space-y-2 p-2">
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-lg">{event.title}</h3>
        <Button variant="outline" size="sm" onClick={closePopover}>
          ×
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: event.color }}
        ></div>
        <span className="text-sm text-muted-foreground">{resource.name}</span>
        <Badge variant="outline">{resource.role}</Badge>
      </div>
      <p className="text-sm">{event.description}</p>
      <div className="text-sm">
        <div>Start: {event.startDate.toLocaleString()}</div>
        <div>End: {event.endDate.toLocaleString()}</div>
      </div>
      <Button size="sm" className="w-full">
        Edit Event
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Resource Scheduler Demo
          </h1>
          <p className="text-muted-foreground">
            A fully customizable resource scheduling component for React
            applications
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Scheduler Preview</CardTitle>
                <CardDescription>
                  Drag to create events, click on events to view details, and
                  drag events to reschedule or reassign
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] border rounded-lg">
                  <ResourceScheduler
                    resources={resources}
                    allowViewChange={true}
                    dateColumnWidth="100px"
                    initialDate={new Date("2025-09-10")}
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
                  <TabsList>
                    <TabsTrigger value="installation">Installation</TabsTrigger>
                    <TabsTrigger value="usage">Usage</TabsTrigger>
                    <TabsTrigger value="props">API Reference</TabsTrigger>
                  </TabsList>
                  <TabsContent value="installation">
                    <Card>
                      <CardHeader>
                        <CardTitle>Installation</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                          {`npm install resource-scheduler
# or
yarn add resource-scheduler
# or
pnpm add resource-scheduler`}
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="usage">
                    <Card>
                      <CardHeader>
                        <CardTitle>Basic Usage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                          {`import { ResourceScheduler, ViewType } from 'resource-scheduler';
import { useState } from 'react';

function App() {
  const [resources, setResources] = useState([
    {
      id: "1",
      name: "John Doe",
      events: [
        {
          id: "e1",
          startDate: new Date("2025-09-10T10:00:00"),
          endDate: new Date("2025-09-10T12:00:00"),
          title: "Team Meeting",
          color: "#3b82f6",
        },
      ],
    },
  ]);

  const handleEventCreate = (eventData, resourceId) => {
    const newEvent = {
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

  return (
    <div style={{ height: '600px' }}>
      <ResourceScheduler
        resources={resources}
        initialView={ViewType.Week}
        onEventCreate={handleEventCreate}
      />
    </div>
  );
}`}
                        </pre>
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
                          <div>
                            <h4 className="font-medium">
                              resources: Resource[]
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Array of resources to display in the scheduler
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium">initialDate?: Date</h4>
                            <p className="text-sm text-muted-foreground">
                              Initial date to display (defaults to current date)
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium">
                              initialView?: ViewType
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Initial view type (Day, Week, Month, Quarter,
                              Year)
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium">
                              onEventCreate?: function
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Callback when a new event is created by dragging
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium">
                              onEventDrop?: function
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Callback when an event is moved to a new time or
                              resource
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium">
                              renderEventPopover?: function
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Custom function to render event details popover
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
            <Card>
              <CardHeader>
                <CardTitle>Interaction Stats</CardTitle>
                <CardDescription>
                  Track your interactions with the scheduler
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Events Created</span>
                  <Badge variant="secondary">{eventsCreated}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Events Moved</span>
                  <Badge variant="secondary">{eventsDropped}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Last Action</p>
                  <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    {lastAction || "No actions yet"}
                  </p>
                </div>
                <div className="flex gap-2">
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

            <Card>
              <CardHeader>
                <CardTitle>Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-sm">
                    Multiple view types (Day, Week, Month, Quarter, Year)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-sm">Drag to create events</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-sm">
                    Drag to move events between resources
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-sm">Customizable event popovers</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-sm">Responsive design</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-sm">Customizable styling</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Try These Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>1. Drag on empty slots to create new events</p>
                <p>2. Click on existing events to view details</p>
                <p>
                  3. Drag events to move them to different times or resources
                </p>
                <p>
                  4. Use the view selector to change between different time
                  views
                </p>
                <p>5. Use navigation buttons to move through time</p>
                <p>6. Click "Today" to return to the current date</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
