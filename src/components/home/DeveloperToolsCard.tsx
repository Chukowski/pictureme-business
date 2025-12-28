import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Terminal, Key, Webhook, BookOpen } from "lucide-react";
import { User } from "@/services/eventsApi";

interface DeveloperToolsCardProps {
  user: User | null;
}

export function DeveloperToolsCard({ user }: DeveloperToolsCardProps) {
  // Only show for business users with higher tiers (mock logic: any business role)
  const isBusiness = user?.role?.startsWith('business');
  
  if (!isBusiness) return null;

  return (
    <Card className="bg-card/20 border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          API & Developer Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button variant="ghost" className="w-full justify-start h-8 text-xs text-zinc-400 hover:text-white hover:bg-white/5">
          <Key className="w-3.5 h-3.5 mr-2" />
          API Keys
        </Button>
        <Button variant="ghost" className="w-full justify-start h-8 text-xs text-zinc-400 hover:text-white hover:bg-white/5">
          <Webhook className="w-3.5 h-3.5 mr-2" />
          Webhooks
        </Button>
        <Button variant="ghost" className="w-full justify-start h-8 text-xs text-zinc-400 hover:text-white hover:bg-white/5">
          <BookOpen className="w-3.5 h-3.5 mr-2" />
          Documentation
        </Button>
      </CardContent>
    </Card>
  );
}

