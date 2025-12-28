import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";
import { EventConfig } from "@/services/eventsApi";

interface CreatorSmartOnboardingProps {
  events: EventConfig[];
}

export function CreatorSmartOnboarding({ events }: CreatorSmartOnboardingProps) {
  const navigate = useNavigate();

  // Heuristic: Show if user has < 1 event (assuming new user)
  // Or maybe show until they have done all steps? For now, just hide if they have events to avoid clutter, 
  // or maybe keep it as a guide. Let's hide if they have > 2 events like business.
  if (events.length >= 2) return null;

  const steps = [
    {
      id: 'create_content',
      label: "Generate your first content",
      done: events.length > 0,
      action: () => navigate('/creator/create'),
      cta: "Create"
    },
    {
      id: 'my_booth',
      label: "View your personal booth",
      done: false, // Hard to track "viewed" without extra state, so maybe just keep it as a shortcut
      action: () => navigate('/creator/booth'),
      cta: "View"
    },
    {
      id: 'marketplace',
      label: "Explore templates",
      done: false,
      action: () => navigate('/creator/templates'),
      cta: "Browse"
    }
  ];

  return (
    <Card className="bg-card bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border-indigo-500/30">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-white">Get started with PictureMe</h3>
            <p className="text-xs sm:text-sm text-indigo-200/70">Complete these steps to creative journey.</p>
          </div>

          <div className="w-full flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 scrollbar-hide snap-x">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`snap-center flex-none w-48 sm:w-auto sm:flex-1 flex flex-col justify-between p-3 sm:p-4 rounded-xl border transition-all h-24 sm:h-28 relative overflow-hidden ${step.done
                    ? "bg-emerald-500/10 border-emerald-500/20"
                    : "bg-card/60 border-white/5 hover:bg-card/80 cursor-pointer group"
                  }`}
                onClick={!step.done ? step.action : undefined}
              >
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                  <Circle className="w-10 h-10 sm:w-12 sm:h-12 fill-current" />
                </div>

                <div className="flex items-start justify-between mb-2 relative z-10">
                  {step.done ? (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 shrink-0 group-hover:text-indigo-400 transition-colors" />
                  )}

                  {!step.done && (
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-zinc-500 group-hover:text-white transition-colors">
                      {step.cta}
                    </span>
                  )}
                </div>

                <div className="relative z-10">
                  <p className={`text-xs sm:text-sm font-medium leading-tight ${step.done ? "text-emerald-100 line-through opacity-70" : "text-zinc-200 group-hover:text-white"}`}>
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

