import { useNavigate } from "react-router-dom";
import { Plus, Gamepad2, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UniversalActionBar() {
  const navigate = useNavigate();

  const actions = [
    {
      label: "Create Event",
      icon: Plus,
      onClick: () => navigate("/admin/events/create"),
      variant: "default" as const,
      className: "bg-white text-black hover:bg-zinc-200",
    },
    {
      label: "Open Playground",
      icon: Gamepad2,
      onClick: () => navigate("/admin/playground"),
      variant: "secondary" as const,
      className: "bg-zinc-800 text-zinc-200 hover:bg-zinc-700",
    },
    {
      label: "View My Events",
      icon: Calendar,
      onClick: () => navigate("/admin/events"),
      variant: "ghost" as const,
      className: "text-zinc-400 hover:text-white hover:bg-zinc-800",
    },
    // Staff dashboard link - redirecting to events as entry point for now
    {
      label: "Staff Dashboard",
      icon: Users,
      onClick: () => navigate("/admin/events"), 
      variant: "ghost" as const,
      className: "text-zinc-400 hover:text-white hover:bg-zinc-800",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 py-4">
      {actions.map((action, index) => (
        <Button
          key={index}
          size="sm"
          variant={action.variant}
          className={`h-9 px-4 text-xs font-medium rounded-full gap-2 ${action.className}`}
          onClick={action.onClick}
        >
          <action.icon className="w-3.5 h-3.5" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}

