// FeaturesPanel.tsx
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const FeaturesPanel = () => {
  const features = [
    "Multiple view types (Day, Week, Month, Quarter, Year)",
    "Drag to create events on empty slots",
    "Drag to move events between resources and times",
    "Customizable event popovers with render props",
    "Timezone support for resources",
    "Responsive grid layout",
    "Customizable column widths",
    "Event click handlers",
    "Date and view change callbacks",
    "Flexible event data structure",
  ];

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Features</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
            <span className="text-sm text-gray-700">{feature}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default FeaturesPanel;