import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/services/eventsApi";
import StudioTab from "@/components/dashboard/StudioTab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CreatorCreatePage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  if (!currentUser) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
            <h1 className="text-2xl font-bold text-white">Create Magic</h1>
            <p className="text-zinc-400 text-sm">Generate images and videos with AI</p>
        </div>
      </div>

      {/* Main Content - Reuse StudioTab */}
      <Card className="bg-card border-white/10 overflow-hidden">
        <CardContent className="p-0">
             <StudioTab currentUser={currentUser} />
        </CardContent>
      </Card>
    </div>
  );
}

