import { useNavigate } from "react-router-dom";
import { Plus, Gamepad2, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventConfig } from "@/services/eventsApi";
import { toast } from "sonner";

interface UniversalActionBarProps {
  activeEvent?: EventConfig;
  isBusinessUser?: boolean;
}

export function UniversalActionBar({ activeEvent, isBusinessUser = false }: UniversalActionBarProps) {
  const navigate = useNavigate();

  const handleStaffDashboard = () => {
    if (activeEvent) {
      navigate(`/admin/events/${activeEvent._id}/live?tab=staff`);
    } else {
      toast.info("No active event found. Please select an event from the list.");
      navigate("/admin/events");
    }
  };

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
    isBusinessUser
      ? {
          label: "Staff Dashboard",
          icon: Users,
          onClick: handleStaffDashboard,
          variant: "ghost" as const,
          className: "text-zinc-400 hover:text-white hover:bg-zinc-800",
        }
      : null,
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 py-4">
      {actions
        .filter(Boolean)
        .map((action, index) => {
          const item = action!;
          return (
            <Button
              key={index}
              size="sm"
              variant={item.variant}
              className={`h-9 px-4 text-xs font-medium rounded-full gap-2 ${item.className}`}
              onClick={item.onClick}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </Button>
          );
        })}
    </div>
  );
}
