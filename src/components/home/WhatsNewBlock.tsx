import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Zap, ArrowRight, Sparkles, Box, Lightbulb, Info, ChevronRight } from "lucide-react";
import { HomeContentResponse, Announcement } from "@/services/contentApi";
import { cn } from "@/lib/utils";

interface WhatsNewBlockProps {
  content: HomeContentResponse | null;
}

// Helper for Announcement Item
const AnnouncementItem = ({ item, onImageClick }: { item: Announcement; onImageClick: () => void }) => {
  const navigate = useNavigate();
  const hasImage = !!item.image_url;

  const handleAction = () => {
    if (hasImage) {
      onImageClick();
      return;
    }
    if (!item.cta_url) return;
    if (item.cta_url.startsWith('/')) {
      navigate(item.cta_url);
    } else {
      window.open(item.cta_url, '_blank');
    }
  };

  return (
    <div 
      className={`group relative flex gap-3 p-3 rounded-lg transition-colors cursor-pointer border overflow-hidden ${
        hasImage 
          ? 'border-white/10 hover:border-white/20' 
          : 'border-transparent hover:border-white/5 hover:bg-white/5'
      }`}
      onClick={handleAction}
    >
      {/* Background Image with Overlay */}
      {hasImage && (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundImage: `url(${item.image_url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />
        </>
      )}

      {/* Content */}
      <div className={`relative z-10 mt-1 h-2 w-2 rounded-full shrink-0 ${hasImage ? 'bg-[#D1F349]' : 'bg-indigo-500'}`} />
      <div className="relative z-10 space-y-1">
        <div className="flex items-center gap-2">
          <h4 className={`text-sm font-medium transition-colors ${
            hasImage ? 'text-white group-hover:text-[#D1F349]' : 'text-zinc-200 group-hover:text-white'
          }`}>
            {item.title}
          </h4>
          <span className="text-[10px] text-zinc-500">{new Date(item.created_at).toLocaleDateString()}</span>
        </div>
        <p className={`text-xs line-clamp-2 ${hasImage ? 'text-zinc-200' : 'text-zinc-400'}`}>
          {item.content}
        </p>
      </div>
    </div>
  );
};

export function WhatsNewBlock({ content }: WhatsNewBlockProps) {
  const [activeTab, setActiveTab] = useState("features");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const navigate = useNavigate();

  // Filter content based on type (following WhatsNewCard logic)
  const features = content?.announcements?.filter(a => a.type === 'new_feature' || a.type === 'update') || [];
  const tips = content?.announcements?.filter(a => a.type === 'pro_tip') || [];
  const alerts = content?.announcements?.filter(a => a.type === 'alert' || a.type === 'maintenance') || [];

  const handleCTA = (url?: string) => {
    if (!url) return;
    if (url.startsWith('/')) {
      navigate(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <Card className="bg-card/30 border-white/10 h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            What's New
          </div>
          {alerts.length > 0 && (
            <Badge variant="destructive" className="h-5 text-[10px] px-1.5 bg-red-500/10 text-red-400 border-red-500/20">
              {alerts.length} New
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <Tabs defaultValue="features" className="flex-1 flex flex-col" onValueChange={setActiveTab}>
          <TabsList className="w-full bg-card/50 border border-white/5 p-0.5 h-8 mb-4">
            <TabsTrigger value="features" className="flex-1 text-[10px] h-7 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500">Features</TabsTrigger>
            <TabsTrigger value="tips" className="flex-1 text-[10px] h-7 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500">Tips</TabsTrigger>
            <TabsTrigger value="alerts" className="flex-1 text-[10px] h-7 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500">Alerts</TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-[220px]">
            <TabsContent value="features" className="mt-0 space-y-1 h-full animate-in fade-in slide-in-from-bottom-1">
              {features.length > 0 ? (
                features.slice(0, 4).map(item => <AnnouncementItem key={item.id} item={item} onImageClick={() => setSelectedAnnouncement(item)} />)
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2 py-8">
                  <Box className="w-8 h-8 opacity-20" />
                  <p className="text-xs">No new features yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tips" className="mt-0 space-y-1 h-full animate-in fade-in slide-in-from-bottom-1">
              {tips.length > 0 ? (
                tips.slice(0, 4).map(item => <AnnouncementItem key={item.id} item={item} onImageClick={() => setSelectedAnnouncement(item)} />)
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2 py-8">
                  <Lightbulb className="w-8 h-8 opacity-20" />
                  <p className="text-xs">No tips available</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="alerts" className="mt-0 space-y-1 h-full animate-in fade-in slide-in-from-bottom-1">
              {alerts.length > 0 ? (
                alerts.map(item => <AnnouncementItem key={item.id} item={item} onImageClick={() => setSelectedAnnouncement(item)} />)
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2 py-8">
                  <Info className="w-8 h-8 opacity-20" />
                  <p className="text-xs">All systems operational</p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>

      {/* Image Modal */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <DialogContent className="bg-card border-white/10 text-white max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl font-bold">
              {selectedAnnouncement?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedAnnouncement?.image_url && (
            <div className="relative w-full">
              <img 
                src={selectedAnnouncement.image_url} 
                alt={selectedAnnouncement.title}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
          )}
          <div className="p-6 pt-4 space-y-4">
            <p className="text-sm text-zinc-300 leading-relaxed">
              {selectedAnnouncement?.content}
            </p>
            {selectedAnnouncement?.cta_url && (
              <Button
                onClick={() => {
                  handleCTA(selectedAnnouncement.cta_url);
                  setSelectedAnnouncement(null);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 font-semibold"
              >
                {selectedAnnouncement.cta_label || 'Learn More'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

