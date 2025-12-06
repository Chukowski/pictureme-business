import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight, Sparkles, Box, Lightbulb, Info } from "lucide-react";
import { HomeContentResponse, Announcement } from "@/services/contentApi";
import { cn } from "@/lib/utils";

interface WhatsNewBlockProps {
  content: HomeContentResponse | null;
}

// Helper for Announcement Item
const AnnouncementItem = ({ item }: { item: Announcement }) => {
  const navigate = useNavigate();
  
  const handleAction = () => {
    if (!item.cta_url) return;
    if (item.cta_url.startsWith('/')) {
      navigate(item.cta_url);
    } else {
      window.open(item.cta_url, '_blank');
    }
  };

  return (
    <div className="group flex gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5" onClick={handleAction}>
      <div className="mt-1 h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{item.title}</h4>
          <span className="text-[10px] text-zinc-500">{new Date(item.created_at).toLocaleDateString()}</span>
        </div>
        <p className="text-xs text-zinc-400 line-clamp-2">{item.content}</p>
      </div>
    </div>
  );
};

export function WhatsNewBlock({ content }: WhatsNewBlockProps) {
  const [activeTab, setActiveTab] = useState("features");

  // Filter content based on type (mock logic if API doesn't separate strictly yet)
  const features = content?.announcements?.filter(a => a.type === 'new_feature' || a.type === 'update') || [];
  const tips = content?.announcements?.filter(a => a.type === 'pro_tip') || [];
  const alerts = content?.announcements?.filter(a => a.type === 'alert' || a.type === 'maintenance') || [];

  return (
    <Card className="bg-zinc-900/30 border-white/10 h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            What's New
          </div>
          {alerts.length > 0 && (
            <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
              {alerts.length} Alerts
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <Tabs defaultValue="features" className="flex-1 flex flex-col" onValueChange={setActiveTab}>
          <TabsList className="w-full bg-zinc-900/50 border border-white/5 p-0.5 h-8 mb-4">
            <TabsTrigger value="features" className="flex-1 text-[10px] h-7 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500">Features</TabsTrigger>
            <TabsTrigger value="templates" className="flex-1 text-[10px] h-7 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500">Templates</TabsTrigger>
            <TabsTrigger value="tips" className="flex-1 text-[10px] h-7 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500">Pro Tips</TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-[200px]">
            <TabsContent value="features" className="mt-0 space-y-1 h-full">
              {features.length > 0 ? (
                features.slice(0, 4).map(item => <AnnouncementItem key={item.id} item={item} />)
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2 py-8">
                  <Box className="w-8 h-8 opacity-20" />
                  <p className="text-xs">No new features yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="templates" className="mt-0 space-y-1 h-full">
              {content?.featured_templates && content.featured_templates.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {content.featured_templates.slice(0, 4).map(t => (
                    <div key={t.id} className="aspect-video bg-zinc-800 rounded-lg border border-white/5 relative group cursor-pointer overflow-hidden">
                      {t.thumbnail_url && (
                        <img src={t.thumbnail_url} alt={t.template_name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                      )}
                      <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/80 to-transparent">
                        <span className="text-[10px] font-medium text-white truncate w-full">{t.template_name || 'Template'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2 py-8">
                  <Sparkles className="w-8 h-8 opacity-20" />
                  <p className="text-xs">No templates featured</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tips" className="mt-0 space-y-1 h-full">
              {tips.length > 0 ? (
                tips.slice(0, 4).map(item => <AnnouncementItem key={item.id} item={item} />)
              ) : (
                // Static Tip Fallback
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-4 h-4 text-purple-400 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-purple-200">Better Prompts</h4>
                      <p className="text-xs text-purple-300/70 mt-1 leading-relaxed">
                        Use specific lighting keywords like "cinematic lighting" or "golden hour" to drastically improve AI output quality.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
        
        {alerts.length > 0 && (
          <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-md p-2 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-amber-400 mt-0.5" />
            <p className="text-[10px] text-amber-200/80 leading-tight">
              {alerts[0].content}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

