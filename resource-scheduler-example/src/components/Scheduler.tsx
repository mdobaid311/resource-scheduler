// Scheduler.tsx
import { ResourceScheduler, ViewType } from "resource-scheduler";
import { renderEventPopover } from "../utils/popoverRenderer.tsx";
import ActionsPanel from "./ActionsPanel";
import CodeExamples from "./CodeExamples";
import FeaturesPanel from "./FeaturesPanel";
import Header from "./Header";
import StatsPanel from "./StatsPanel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { useSchedulerActions } from "../hooks/useSchedulerActions.ts";

const Scheduler = () => {
  const {
    resources,
    stats,
    actions,
    handleEventCreate,
    handleEventDrop,
    handleClearStats,
    handleResetData,
  } = useSchedulerActions();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="container mx-auto max-w-7xl">
        <Header />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card className="shadow-sm border">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Scheduler Preview</CardTitle>
                <CardDescription className="text-gray-600">
                  Drag on empty slots to create events, click events for
                  details, and drag events to reschedule or reassign to
                  different resources
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
                    onDateChange={actions.handleDateChange}
                    onEventClick={actions.handleEventClick}
                    onEventCreate={handleEventCreate}
                    onEventDrop={handleEventDrop}
                    onViewChange={actions.handleViewChange}
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

                  <CodeExamples />
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Side panels remain the same */}
          <div className="lg:col-span-1 space-y-6">
            <StatsPanel
              stats={stats}
              onClearStats={handleClearStats}
              onResetData={handleResetData}
            />
            <FeaturesPanel />
            <ActionsPanel />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scheduler;
