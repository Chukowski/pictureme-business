import { useNavigate } from "react-router-dom";
import { 
  Gamepad2, Plus, LayoutTemplate, Users, 
  ShoppingBag, BookOpen, ArrowRight 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ToolsGrid() {
  const navigate = useNavigate();

  const tools = [
    {
      label: "Playground",
      description: "Test AI prompts",
      icon: Gamepad2,
      path: "/admin/playground",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "group-hover:border-amber-500/30",
    },
    {
      label: "Event Creator",
      description: "New session",
      icon: Plus,
      path: "/admin/events/create",
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "group-hover:border-indigo-500/30",
    },
    {
      label: "Templates",
      description: "Manage designs",
      icon: LayoutTemplate,
      path: "/admin/events", // No direct template manager yet, usually inside events
      color: "text-pink-400",
      bg: "bg-pink-500/10",
      border: "group-hover:border-pink-500/30",
    },
    {
      label: "Staff Dashboard",
      description: "Manage team",
      icon: Users,
      path: "/admin/events", // Needs event context usually
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "group-hover:border-emerald-500/30",
    },
    {
      label: "Marketplace",
      description: "Get assets",
      icon: ShoppingBag,
      path: "/admin/marketplace",
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "group-hover:border-purple-500/30",
    },
    {
      label: "Albums",
      description: "View galleries",
      icon: BookOpen,
      path: "/admin/events", // Albums live under events now
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "group-hover:border-blue-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
      {tools.map((tool, index) => (
        <Card 
          key={index}
          className={`bg-zinc-900/40 border-white/5 transition-all duration-300 cursor-pointer group hover:bg-zinc-900 hover:-translate-y-1 hover:shadow-lg ${tool.border}`}
          onClick={() => navigate(tool.path)}
        >
          <CardContent className="p-4 flex flex-col items-center text-center h-full justify-center space-y-3">
            <div className={`p-3 rounded-xl ${tool.bg} ${tool.color} mb-1 transition-transform group-hover:scale-110`}>
              <tool.icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-medium text-sm text-zinc-200 group-hover:text-white">{tool.label}</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">{tool.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

