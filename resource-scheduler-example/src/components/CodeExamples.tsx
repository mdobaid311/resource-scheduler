// CodeExamples.tsx
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useState } from "react";
import { TabsContent } from "./ui/tabs";

const CodeExamples = () => {
  const [lastCopied, setLastCopied] = useState<string>("");

  const installationCode = `npm install resource-scheduler
# or
yarn add resource-scheduler
# or
pnpm add resource-scheduler

import "resource-scheduler/dist/resource-scheduler.css";`;

  const usageCode = `import { useState } from "react";
import { 
  ResourceScheduler, 
  ViewType, 
  type Event, 
  type Resource 
} from "resource-scheduler";
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

  const handleEventClick = (event: Event, resource: Resource) => {
    console.log("Event clicked:", event.title, "on", resource.name);
  };

  const handleDateChange = (date: Date) => {
    console.log("Date changed to:", date);
  };

  const handleViewChange = (view: ViewType) => {
    console.log("View changed to:", view);
  };

  return (
    <div style={{ height: '600px' }}>
      <ResourceScheduler
        resources={resources}
        initialDate={new Date()}
        initialView={ViewType.Week}
        onEventClick={handleEventClick}
        onDateChange={handleDateChange}
        onViewChange={handleViewChange}
        onEventCreate={handleEventCreate}
        onEventDrop={handleEventDrop}
        allowViewChange={true}
        resourceColumnWidth="200px"
        timeColumnWidth="60px"
        dateColumnWidth="100px"
      />
    </div>
  );
}`;

  const advancedUsageCode = `// Custom Event Popover Example
const renderEventPopover = (
  event: Event,
  resource: Resource,
  closePopover: () => void
) => (
  <div className="space-y-3 p-4 bg-white rounded-lg border shadow-lg">
    <div className="flex justify-between items-start">
      <h3 className="font-bold text-lg">{event.title}</h3>
      <button onClick={closePopover}>×</button>
    </div>
    <div className="flex items-center gap-2">
      <div 
        className="w-4 h-4 rounded-full"
        style={{ backgroundColor: event.color }}
      />
      <span>{resource.name}</span>
      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
        {resource.role}
      </span>
    </div>
    <p>{event.description}</p>
    <div className="text-sm text-gray-500">
      <div>Start: {event.startDate.toLocaleString()}</div>
      <div>End: {event.endDate.toLocaleString()}</div>
    </div>
    <button className="w-full bg-blue-500 text-white py-2 rounded">
      Edit Event
    </button>
  </div>
);

// Using timezone support
const resourcesWithTimezone: Resource[] = [
  {
    id: "1",
    name: "Remote Team",
    role: "Developer",
    timezone: "America/New_York",
    events: [...]
  }
];`;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setLastCopied(type);
      setTimeout(() => setLastCopied(""), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const CodeBlock = ({
    code,
    type,
    title,
  }: {
    code: string;
    type: string;
    title?: string;
  }) => (
    <div className="space-y-3">
      {title && <h4 className="font-semibold text-gray-900">{title}</h4>}
      <div className="relative">
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
          {code}
        </pre>
        <Button
          size="sm"
          className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600"
          onClick={() => copyToClipboard(code, type)}
        >
          {lastCopied === type ? "Copied!" : "Copy"}
        </Button>
      </div>
    </div>
  );

  const ApiReference = () => (
    <div className="space-y-4">
      {[
        {
          prop: "resources: Resource[]",
          description: "Array of resources with their events",
        },
        {
          prop: "initialDate?: Date",
          description: "Initial date to display (defaults to current date)",
        },
        {
          prop: "initialView?: ViewType",
          description: "Initial view type - Day, Week, Month, Quarter, Year",
        },
        {
          prop: "onEventClick?: (event: Event, resource: Resource) => void",
          description: "Callback when an event is clicked",
        },
        {
          prop: "onDateChange?: (date: Date) => void",
          description: "Callback when the current date changes",
        },
        {
          prop: "onViewChange?: (view: ViewType) => void",
          description: "Callback when the view type changes",
        },
        {
          prop: "onEventCreate?: (event: Omit<Event, 'id'>, resourceId: string) => void",
          description: "Callback when a new event is created by dragging",
        },
        {
          prop: "onEventDrop?: (event: Event, fromResourceId: string, toResourceId: string, newStartDate: Date, newEndDate: Date) => void",
          description:
            "Callback when an event is moved to a new time or resource",
        },
        {
          prop: "renderEventPopover?: (event: Event, resource: Resource, closePopover: () => void) => React.ReactNode",
          description: "Custom renderer for event popovers",
        },
        {
          prop: "resourceColumnWidth?: string",
          description: "Width of the resource column (default: '200px')",
        },
        {
          prop: "timeColumnWidth?: string",
          description: "Width of the time column (default: '60px')",
        },
        {
          prop: "dateColumnWidth?: string",
          description: "Width of the date column (default: '100px')",
        },
        {
          prop: "allowViewChange?: boolean",
          description: "Whether to show view change controls (default: true)",
        },
      ].map((item, index) => (
        <div key={index} className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900">{item.prop}</h4>
          <p className="text-gray-600 text-sm mt-1">{item.description}</p>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <TabsContent value="installation">
        <Card>
          <CardHeader>
            <CardTitle>Installation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CodeBlock code={installationCode} type="installation" />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="usage">
        <Card>
          <CardHeader>
            <CardTitle>Basic Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <CodeBlock
              code={usageCode}
              type="usage"
              title="Basic Implementation"
            />
            <CodeBlock
              code={advancedUsageCode}
              type="advanced-usage"
              title="Advanced Features"
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="props">
        <Card>
          <CardHeader>
            <CardTitle>API Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <ApiReference />
          </CardContent>
        </Card>
      </TabsContent>
    </>
  );
};

export default CodeExamples;
