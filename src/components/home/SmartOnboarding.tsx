import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle } from "lucide-react";
import { EventConfig } from "@/services/eventsApi";

interface SmartOnboardingProps {
  events: EventConfig[];
}

export function SmartOnboarding({ events }: SmartOnboardingProps) {
  const navigate = useNavigate();

  // Heuristic: Show if user has < 2 events (assuming new user)
  // Real logic might also check templates count, etc.
  if (events.length >= 2) return null;

  const steps = [
    {
      id: 'create_event',
      label: "Create your first event",
      done: events.length > 0,
      action: () => navigate('/admin/events/create'),
      cta: "Start"
    },
    {
      id: 'playground',
      label: "Test AI templates in Playground",
      done: false, // Hard to track without specific user meta, assume false for onboarding view
      action: () => navigate('/admin/playground'),
      cta: "Try"
    },
    {
      id: 'explore',
      label: "Explore top templates",
      done: false,
      action: () => navigate('/admin/marketplace'),
      cta: "Browse"
    }
  ];

  return (
    <Card className="bg-zinc-900 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border-indigo-500/30 mb-8">
      <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Here's how to get started</h3>
          <p className="text-sm text-indigo-200/70">Complete these steps to launch your first AI experience.</p>
        </div>

        <div className="flex-1 w-full md:w-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {steps.map((step) => (
            <div 
              key={step.id} 
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                step.done 
                  ? "bg-emerald-500/10 border-emerald-500/20" 
                  : "bg-zinc-900/40 border-white/5 hover:bg-zinc-900/60 cursor-pointer"
              }`}
              onClick={!step.done ? step.action : undefined}
            >
              {step.done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-zinc-600 shrink-0" />
              )}
              
              <div className="flex-1">
                <p className={`text-sm font-medium ${step.done ? "text-emerald-100 line-through opacity-70" : "text-zinc-200"}`}>
                  {step.label}
                </p>
              </div>

              {!step.done && (
                <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 bg-white/5 hover:bg-white/10 text-zinc-300">
                  {step.cta}
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

