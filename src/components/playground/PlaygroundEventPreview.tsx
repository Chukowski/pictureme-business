import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Link2, Globe, UserPlus, Camera, Gamepad2,
  Images, Copy, Check, ExternalLink, Info, MapPin,
  Smartphone, Monitor, Tablet, ZoomIn, ZoomOut, Eye,
  Maximize2, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { User as UserType, EventConfig } from "@/services/eventsApi";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePlayground } from "./PlaygroundContext";
import { cn } from "@/lib/utils";

interface PlaygroundEventPreviewProps {
  events: EventConfig[];
  currentUser: UserType;
}

export function PlaygroundEventPreview({ events, currentUser }: PlaygroundEventPreviewProps) {
  const { setPreview, setPreviewToolbar, triggerNewAsset } = usePlayground();
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [activeStation, setActiveStation] = useState<'main' | 'registration' | 'booth' | 'playground' | 'viewer'>('main');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [previewKey, setPreviewKey] = useState(0); // To force refresh iframe

  const selectedEvent = events.find(e => e._id === selectedEventId);

  const getStationUrl = (type: string) => {
    if (!selectedEvent || !currentUser) return '';
    const baseUrl = window.location.origin;

    switch (type) {
      case 'main':
        return `${baseUrl}/${currentUser.slug}/${selectedEvent.slug}`;
      case 'registration':
        return `${baseUrl}/${currentUser.slug}/${selectedEvent.slug}/registration`;
      case 'booth':
        return `${baseUrl}/${currentUser.slug}/${selectedEvent.slug}/booth`;
      case 'playground':
        return `${baseUrl}/${currentUser.slug}/${selectedEvent.slug}/playground`;
      case 'viewer':
        return `${baseUrl}/${currentUser.slug}/${selectedEvent.slug}/viewer`;
      default:
        return `${baseUrl}/${currentUser.slug}/${selectedEvent.slug}`;
    }
  };

  const copyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast.success(`${label} URL copied`);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const openStation = (url: string) => {
    window.open(url, '_blank');
  };

  // --- Left Panel ---
  const ControlsPanel = (
    <div className="space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Event Preview</h2>
        <p className="text-zinc-400">Explore the complete visitor journey across all stations.</p>
      </div>

      {/* 1. Select Event */}
      <Card className="bg-card/50 border-white/10 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold">1</div>
          <span className="text-base font-medium text-zinc-200">Select Event</span>
        </div>
        <CardContent className="p-6 space-y-6">
          <Select value={selectedEventId} onValueChange={(val) => {
            setSelectedEventId(val);
            triggerNewAsset(true);
          }}>
            <SelectTrigger className="h-10 bg-zinc-800 border-zinc-700 text-sm text-zinc-200">
              <SelectValue placeholder="Choose event to preview" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {events.map(e => (
                <SelectItem key={e._id} value={e._id} className="text-zinc-200">{e.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedEvent && (
            <div className="flex gap-3">
              <div className="flex-1 p-3 rounded-xl bg-zinc-800/50 border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Status</span>
                <Badge variant="outline" className={selectedEvent.is_active ? 'bg-green-500/10 text-green-400 border-green-500/20 w-fit' : 'text-zinc-400 w-fit'}>
                  {selectedEvent.is_active ? 'Active' : 'Draft'}
                </Badge>
              </div>
              <div className="flex-1 p-3 rounded-xl bg-zinc-800/50 border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Templates</span>
                <span className="text-sm font-medium text-zinc-200">
                  {selectedEvent.templates?.length || 0} Active
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Station Links */}
      <Card className="bg-card/50 border-white/10 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">2</div>
          <span className="text-base font-medium text-zinc-200">Navigate Stations</span>
        </div>
        <CardContent className="p-4 space-y-2">
          {selectedEvent ? (
            [
              { key: 'main', label: 'Landing Page', icon: Globe, desc: 'Main entry point' },
              { key: 'registration', label: 'Registration', icon: UserPlus, desc: 'Check-in kiosk' },
              { key: 'booth', label: 'Photo Booth', icon: Camera, desc: 'Main capture flow' },
              { key: 'viewer', label: 'Live Gallery', icon: Images, desc: 'Public display' },
            ].map(({ key, label, icon: Icon, desc }) => {
              const url = getStationUrl(key);
              const isCopied = copiedUrl === url;
              const isActive = activeStation === key;

              return (
                <div
                  key={key}
                  className={`group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer border ${isActive ? 'bg-zinc-800 border-indigo-500/30 shadow-md' : 'bg-transparent border-transparent hover:bg-zinc-800/50 hover:border-white/5'
                    }`}
                  onClick={() => setActiveStation(key as any)}
                >
                  <div className="flex items-center gap-4 flex-1 overflow-hidden">
                    <div className={`p-2.5 rounded-lg transition-colors ${isActive ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-200'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium block mb-0.5 ${isActive ? 'text-white' : 'text-zinc-200'}`}>{label}</span>
                      <span className="text-xs text-zinc-500 block">{desc}</span>
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyUrl(url, label);
                            }}
                            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg"
                          >
                            {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy URL</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              openStation(url);
                            }}
                            className="h-8 w-8 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-700 rounded-lg"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open in New Tab</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl bg-card/30">
              <MapPin className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">Select an event to view stations</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const CanvasOverlay = selectedEvent && (
    <div className="absolute bottom-8 right-8 z-50 pointer-events-auto">
      <Button
        onClick={() => openStation(getStationUrl(activeStation))}
        className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 shadow-xl rounded-full px-6"
      >
        <Monitor className="w-4 h-4 mr-2" />
        Open Full Screen
      </Button>
    </div>
  );

  // --- Right Panel ---
  const PreviewPanel = (
    <div className="h-full flex flex-col bg-card relative group">
      {selectedEvent ? (
        <iframe
          src={getStationUrl(activeStation)}
          className="w-full h-full border-0"
          title="Station Preview"
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
          <Eye className="w-16 h-16 mb-6 opacity-20" />
          <p className="text-lg font-medium text-zinc-500">No Event Selected</p>
          <p className="text-sm text-zinc-600 mt-2">Select an event from the panel to start preview</p>
        </div>
      )}
    </div>
  );

  // --- Right Sidebar Content ---
  useEffect(() => {
    const Toolbar = (
      <div className="flex items-center justify-between w-full px-1">
        <div className="flex items-center bg-card p-0.5 rounded-lg border border-white/5">
          <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white">Live Station</span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setPreviewKey(k => k + 1)} className="text-zinc-500 hover:text-white p-1" title="Refresh Preview"><RefreshCw className="w-3.5 h-3.5" /></button>
          <Separator orientation="vertical" className="h-4 bg-white/10" />
          <div className="flex items-center bg-card rounded-lg p-0.5 border border-white/5">
            <button onClick={() => setPreviewDevice('mobile')} className={cn("p-1 rounded", previewDevice === 'mobile' ? "bg-zinc-700 text-white" : "text-zinc-500")}><Smartphone className="w-3.5 h-3.5" /></button>
            <button onClick={() => setPreviewDevice('tablet')} className={cn("p-1 rounded", previewDevice === 'tablet' ? "bg-zinc-700 text-white" : "text-zinc-500")}><Tablet className="w-3.5 h-3.5" /></button>
            <button onClick={() => setPreviewDevice('desktop')} className={cn("p-1 rounded", previewDevice === 'desktop' ? "bg-zinc-700 text-white" : "text-zinc-500")}><Monitor className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(z - 10, 50))} className="text-zinc-500 hover:text-white"><ZoomOut className="w-3.5 h-3.5" /></button>
            <span className="text-[10px] text-zinc-500 w-8 text-center font-mono">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(z + 10, 150))} className="text-zinc-500 hover:text-white"><ZoomIn className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>
    );

    const Preview = (
      <div className="h-full flex flex-col relative group">
        <div className="flex-1 flex flex-col relative">
          {CanvasOverlay}
          <div className={cn(
            "flex-1 flex items-center justify-center relative overflow-hidden bg-[#050505] transition-all duration-500",
            showGrid && "bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:20px_20px]"
          )}>
            <div
              className="transition-transform duration-300 ease-out origin-center"
              style={{ transform: `scale(${zoom / 100})` }}
            >
              <div className={cn(
                "relative bg-[#101112] border-[8px] border-zinc-800 shadow-2xl overflow-hidden transition-all duration-500",
                previewDevice === 'mobile' ? "w-[375px] h-[812px] rounded-[3.5rem]" :
                  previewDevice === 'tablet' ? "w-[768px] h-[1024px] rounded-[2rem]" :
                    "w-[1280px] h-[800px] rounded-xl border-[12px]" // Desktop
              )}>
                {/* Notch / Header for Mobile */}
                {previewDevice === 'mobile' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-zinc-800 rounded-b-2xl z-50 flex items-center justify-center">
                    <div className="w-16 h-1 rounded-full bg-[#101112]/40" />
                  </div>
                )}

                <div className="w-full h-full bg-card overflow-hidden">
                  {PreviewPanel}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    setPreview(Preview);
    setPreviewToolbar(Toolbar);
  }, [setPreview, setPreviewToolbar, PreviewPanel, CanvasOverlay, previewDevice, zoom, showGrid, activeStation, selectedEventId, previewKey]);

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10">
      {ControlsPanel}
    </div>
  );
}
