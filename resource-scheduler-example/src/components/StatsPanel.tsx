// StatsPanel.tsx
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface StatsPanelProps {
  stats: {
    eventsCreated: number;
    eventsDropped: number;
    lastAction: string;
  };
  onClearStats: () => void;
  onResetData: () => void;
}

const StatsPanel = ({ stats, onClearStats, onResetData }: StatsPanelProps) => {
  return (
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
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            {stats.eventsCreated}
          </Badge>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-700">Events Moved</span>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            {stats.eventsDropped}
          </Badge>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Last Action</p>
          <div className="p-3 bg-gray-50 rounded-lg border">
            <p className="text-sm text-gray-600">
              {stats.lastAction || "No actions yet"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClearStats}>
            Clear Stats
          </Button>
          <Button variant="outline" className="flex-1" onClick={onResetData}>
            Reset Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsPanel;
