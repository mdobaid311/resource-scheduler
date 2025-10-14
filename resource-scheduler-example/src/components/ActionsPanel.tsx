// ActionsPanel.tsx
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const ActionsPanel = () => {
  const actions = [
    "Drag on empty slots to create new events",
    "Click on existing events to view details",
    "Drag events to move them to different times or resources",
    "Use the view selector to change between different time views",
    "Use navigation buttons to move through time",
    'Click "Today" to return to the current date',
  ];

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Try These Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => (
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
  );
};

export default ActionsPanel;