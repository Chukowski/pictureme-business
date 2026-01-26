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
  if (events.length >= 2) return null;

  const steps = [
    {
      id: 'create_event',
      label: "Create your first event",
      done: events.length > 0,
      action: () => navigate('/business/events/create'),
      cta: "Start"
    },
    {
      id: 'playground',
      label: "Test AI templates in Playground",
      done: false,
      action: () => navigate('/business/playground'),
      cta: "Try"
    },
    {
      id: 'explore',
      label: "Explore top templates",
      done: false,
      action: () => navigate('/business/marketplace'),
      cta: "Browse"
    }
  ];

  return (
    <Card className="bg-card bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border-indigo-500/30 mb-8">
      <CardContent className="p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-bold text-white">Here's how to get started</h3>
            <p className="text-sm text-indigo-200/70">Complete these steps to launch your first AI experience.</p>
          </div>

          <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-4">
            {steps.map((step) => (
              <div 
                key={step.id} 
                className={`flex-1 flex flex-col justify-between p-4 rounded-xl border transition-all h-28 min-w-0 sm:min-w-[200px] relative overflow-hidden ${
                  step.done 
                    ? "bg-emerald-500/10 border-emerald-500/20" 
                    : "bg-card/40 border-white/5 hover:bg-card/60 cursor-pointer group"
                }`}
                onClick={!step.done ? step.action : undefined}
              >
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                   <Circle className="w-12 h-12 fill-current" />
                </div>

                <div className="flex items-start justify-between mb-2 relative z-10">
                  {step.done ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-zinc-600 shrink-0 group-hover:text-indigo-400 transition-colors" />
                  )}
                  
                   {!step.done && (
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 group-hover:text-white transition-colors">
                      {step.cta}
                    </span>
                  )}
                </div>
                
                <div className="relative z-10">
                  <p className={`text-sm font-medium leading-tight ${step.done ? "text-emerald-100 line-through opacity-70" : "text-zinc-200 group-hover:text-white"}`}>
                    {step.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
