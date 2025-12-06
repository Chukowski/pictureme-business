import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCurrentUser } from "@/services/eventsApi";
import MarketplaceTab from "@/components/dashboard/MarketplaceTab";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CreatorTemplatesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = getCurrentUser();

  if (!currentUser) return null;

  // Map 'trending' query param to default active section if needed
  // MarketplaceTab handles its own state for now, but we could enhance it later to accept initial props

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/creator/dashboard')}
            className="text-zinc-400 hover:text-white hover:bg-white/5"
        >
            <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
            <h1 className="text-2xl font-bold text-white">Marketplace</h1>
            <p className="text-zinc-400 text-sm">Discover templates, models, and styles</p>
        </div>
      </div>

      {/* Main Content - Reuse MarketplaceTab */}
      <Card className="bg-zinc-900/50 border-white/5 overflow-hidden">
        <CardContent className="p-6">
             <MarketplaceTab currentUser={currentUser} />
        </CardContent>
      </Card>
    </div>
  );
}

