import { Lock, Crown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { hasFeature, getUpgradeMessage, type PlanFeatures } from "@/lib/planFeatures";

interface FeatureGateProps {
  feature: keyof PlanFeatures;
  userRole: string | undefined;
  children: React.ReactNode;
  /** If true, shows children but disabled. If false, hides children completely */
  showDisabled?: boolean;
  /** Custom message to show in tooltip */
  customMessage?: string;
  /** Callback when upgrade button is clicked */
  onUpgrade?: () => void;
}

/**
 * Component that gates features based on user plan
 * Shows a lock icon and upgrade message when feature is not available
 */
export function FeatureGate({
  feature,
  userRole,
  children,
  showDisabled = true,
  customMessage,
  onUpgrade,
}: FeatureGateProps) {
  const isAvailable = hasFeature(userRole, feature);

  if (isAvailable) {
    return <>{children}</>;
  }

  if (!showDisabled) {
    return null;
  }

  const message = customMessage || getUpgradeMessage(feature);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <div className="opacity-50 pointer-events-none select-none">
              {children}
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-[#101112]/20 backdrop-blur-[1px] rounded-lg">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/90 border border-white/10">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-zinc-300">Locked</span>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-card border-white/10 text-white max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="font-medium">Premium Feature</span>
            </div>
            <p className="text-xs text-zinc-400">{message}</p>
            {onUpgrade && (
              <Button 
                size="sm" 
                onClick={onUpgrade}
                className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs"
              >
                Upgrade Now
              </Button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Simple lock badge to show next to feature names
 */
export function FeatureLockBadge({
  feature,
  userRole,
}: {
  feature: keyof PlanFeatures;
  userRole: string | undefined;
}) {
  const isAvailable = hasFeature(userRole, feature);

  if (isAvailable) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 ml-2">
            <Lock className="w-3 h-3" />
            <span className="hidden sm:inline">Pro</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-card border-white/10 text-white">
          <p className="text-xs">{getUpgradeMessage(feature)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Hook-like function to check if feature is available
 * Use this for conditional rendering or disabling
 */
export function useFeatureCheck(userRole: string | undefined) {
  return {
    canUse: (feature: keyof PlanFeatures) => hasFeature(userRole, feature),
    getMessage: (feature: keyof PlanFeatures) => getUpgradeMessage(feature),
  };
}

