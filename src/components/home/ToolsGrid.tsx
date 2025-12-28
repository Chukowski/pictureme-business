import { useNavigate } from "react-router-dom";
import { 
  Gamepad2, Plus, Users, 
  ShoppingBag, BookOpen 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EventConfig } from "@/services/eventsApi";
import { toast } from "sonner";

interface ToolsGridProps {
  activeEvent?: EventConfig;
  isBusinessUser?: boolean;
}

export function ToolsGrid({ activeEvent, isBusinessUser = false }: ToolsGridProps) {
  const navigate = useNavigate();

  const handleStaffClick = () => {
    if (activeEvent) {
      navigate(`/admin/events/${activeEvent._id}/live?tab=staff`);
    } else {
       toast.info("No active event. Redirecting to events list.");
       navigate("/admin/events");
    }
  };

  const tools = [
    {
      label: "Playground",
      description: "Test AI prompts",
      icon: Gamepad2,
      onClick: () => navigate("/admin/playground"),
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "group-hover:border-amber-500/30",
    },
    {
      label: "Event Creator",
      description: "New session",
      icon: Plus,
      onClick: () => navigate("/admin/events/create"),
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "group-hover:border-indigo-500/30",
    },
    isBusinessUser && {
      label: "Staff Dashboard",
      description: "Manage team",
      icon: Users,
      onClick: handleStaffClick,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "group-hover:border-emerald-500/30",
    },
    {
      label: "Marketplace",
      description: "Templates & Assets",
      icon: ShoppingBag,
      onClick: () => navigate("/admin/marketplace"),
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "group-hover:border-purple-500/30",
    },
    {
      label: "My Events",
      description: "View galleries",
      icon: BookOpen,
      onClick: () => navigate("/admin/events"), // Renamed "Albums" to "My Events" to be more accurate
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "group-hover:border-blue-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
      {tools.filter(Boolean).map((tool, index) => {
        const item = tool!;
        return (
          <Card 
            key={index}
            className={`bg-card/40 border-white/5 transition-all duration-300 cursor-pointer group hover:bg-card hover:-translate-y-1 hover:shadow-lg ${item.border}`}
            onClick={item.onClick}
          >
            <CardContent className="p-4 flex flex-col items-center text-center h-full justify-center space-y-3">
              <div className={`p-3 rounded-xl ${item.bg} ${item.color} mb-1 transition-transform group-hover:scale-110`}>
                <item.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-zinc-200 group-hover:text-white">{item.label}</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">{item.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
