import { useNavigate } from "react-router-dom";
import { User } from "@/services/eventsApi";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Crown, Zap } from "lucide-react";
import { getPlanDisplayName } from "@/lib/planFeatures";

interface PlanInsightsCardProps {
  user: User | null;
}

export function PlanInsightsCard({ user }: PlanInsightsCardProps) {
  const navigate = useNavigate();
  
  const tokensUsed = (user?.tokens_total || 0) - (user?.tokens_remaining || 0);
  const progress = ((user?.tokens_remaining || 0) / (user?.tokens_total || 1000)) * 100;
  const isBusiness = user?.role?.startsWith('business') && user.role !== 'business_pending';

  const handleUpgradeClick = () => {
    if (isBusiness) {
      navigate('/admin/settings/business?tab=billing&showPlans=true');
    } else {
      navigate('/creator/billing');
    }
  };

  return (
    <Card className="bg-gradient-to-br from-zinc-900 to-black border-white/10 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
      
      <CardContent className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Current Plan</p>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">{getPlanDisplayName(user?.role)}</h3>
              {user?.role?.includes('business') && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-0 text-[10px]">
                  PRO
                </Badge>
              )}
            </div>
          </div>
          <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5">
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Monthly Tokens</span>
            <span className="text-white font-medium">
              {user?.tokens_remaining?.toLocaleString()} / {user?.tokens_total?.toLocaleString() || '∞'}
            </span>
          </div>
          <Progress value={progress} className="h-2 bg-zinc-800" indicatorClassName="bg-gradient-to-r from-indigo-500 to-purple-500" />
          <p className="text-[10px] text-zinc-500 text-right">Resets on {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3 h-3 text-purple-400" />
            <span className="text-xs text-zinc-300 font-medium">Next Level Benefits</span>
          </div>
          <ul className="space-y-1.5 mb-4">
            <li className="text-[10px] text-zinc-400 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-zinc-600" /> Custom branding removal
            </li>
            <li className="text-[10px] text-zinc-400 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-zinc-600" /> 2x Faster generation
            </li>
          </ul>
          
          <Button 
            size="sm" 
            className="w-full bg-white text-black hover:bg-zinc-200"
            onClick={handleUpgradeClick}
          >
            Upgrade Plan <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
