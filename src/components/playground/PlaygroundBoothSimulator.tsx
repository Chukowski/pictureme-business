import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Play, Camera, UserPlus, Gamepad2, Images, ExternalLink, Rocket, Smartphone, Monitor, Tablet, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { User as UserType, EventConfig } from "@/services/eventsApi";
import { usePlayground } from "./PlaygroundContext";
import { cn } from "@/lib/utils";

interface PlaygroundBoothSimulatorProps {
  events: EventConfig[];
  currentUser: UserType;
}

export function PlaygroundBoothSimulator({ events, currentUser }: PlaygroundBoothSimulatorProps) {
  const { setPreview, setPreviewToolbar, triggerNewAsset } = usePlayground();
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [entryPoint, setEntryPoint] = useState<'registration' | 'booth' | 'playground' | 'viewer'>('booth');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);

  const selectedEvent = events.find(e => e._id === selectedEventId);

  const getUrl = (mock: boolean = false) => {
    if (!selectedEvent || !currentUser) return '';
    const baseUrl = window.location.origin;
    const path = entryPoint === 'booth' ? 'booth' : entryPoint;
    return `${baseUrl}/${currentUser.slug}/${selectedEvent.slug}/${path}${mock ? '?mock=1' : ''}`;
  };

  const launchSimulator = (mock: boolean) => {
    window.open(getUrl(mock), '_blank');
  };

  // --- Left Panel ---
  const ControlsPanel = (
    <div className="space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Booth Simulator</h2>
        <p className="text-zinc-400">Run a complete end-to-end simulation of the visitor experience.</p>
      </div>

      {/* Step 1: Event Selection */}
      <Card className="bg-card/50 border-white/10 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold">1</div>
          <span className="text-base font-medium text-zinc-200">Select Event</span>
        </div>
        <CardContent className="p-6">
          <Select value={selectedEventId} onValueChange={(val) => {
            setSelectedEventId(val);
            triggerNewAsset(true);
          }}>
            <SelectTrigger className="h-10 bg-zinc-800 border-zinc-700 text-sm text-zinc-200">
              <SelectValue placeholder="Choose event" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {events.map(e => (
                <SelectItem key={e._id} value={e._id} className="text-zinc-200">{e.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Step 2: Entry Point */}
      <Card className="bg-card/50 border-white/10 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 text-xs font-bold">2</div>
          <span className="text-base font-medium text-zinc-200">Choose Entry Point</span>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'registration', label: 'Registration', icon: UserPlus, desc: 'Visitor Check-in' },
              { id: 'booth', label: 'Booth', icon: Camera, desc: 'Main Camera' },
              { id: 'playground', label: 'Playground', icon: Gamepad2, desc: 'AI Station' },
              { id: 'viewer', label: 'Viewer', icon: Images, desc: 'Gallery' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setEntryPoint(item.id as any)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center ${entryPoint === item.id
                  ? 'bg-pink-500/10 border-pink-500/50 text-pink-400 shadow-md'
                  : 'bg-zinc-800/30 border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 hover:border-white/5'
                  }`}
              >
                <item.icon className="w-6 h-6 mb-2 opacity-80" />
                <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
                <span className="text-[10px] text-zinc-500 mt-1">{item.desc}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Launch Actions */}
      <div className="sticky bottom-0 pt-4 pb-8 bg-card z-20 border-t border-white/5 mt-8">
        <Card className="bg-gradient-to-br from-zinc-900 to-[#101112] border-white/10 border-t-2 border-t-pink-500 shadow-2xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-pink-500/50">3</div>
              <h3 className="text-lg font-bold text-white">Launch Simulator</h3>
            </div>
            <Button
              className="w-full h-12 bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-900/20 rounded-xl font-medium text-base transition-all hover:scale-[1.02]"
              disabled={!selectedEvent}
              onClick={() => launchSimulator(false)}
            >
              <Rocket className="w-4 h-4 mr-2 fill-current" />
              Start Live Session
            </Button>
            <Button
              variant="outline"
              className="w-full h-10 border-pink-500/20 text-pink-400 hover:bg-pink-500/10 rounded-xl text-sm"
              disabled={!selectedEvent}
              onClick={() => launchSimulator(true)}
            >
              <Gamepad2 className="w-4 h-4 mr-2" />
              Start Mock Session (No Tokens)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const CanvasOverlay = selectedEvent && (
    <div className="absolute top-4 right-4 z-50 pointer-events-auto">
      <Badge variant="outline" className="bg-[#101112]/60 backdrop-blur text-zinc-300 border-white/10 px-3 py-1.5 text-xs uppercase tracking-wider shadow-lg">
        Live Preview: {entryPoint}
      </Badge>
    </div>
  )

  // --- Right Panel ---
  const PreviewPanel = (
    <div className="h-full flex flex-col bg-card relative">
      {selectedEvent ? (
        <iframe
          src={getUrl(true)}
          className="w-full h-full border-0"
          title="Simulator Preview"
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
          <Camera className="w-16 h-16 mb-6 opacity-20" />
          <p className="text-lg font-medium text-zinc-500">Simulator Idle</p>
          <p className="text-sm text-zinc-600 mt-2">Select an event to start simulation</p>
        </div>
      )}
    </div>
  );

  // --- Right Sidebar Content ---
  useEffect(() => {
    const Toolbar = (
      <div className="flex items-center justify-between w-full px-1">
        <div className="flex items-center bg-card p-0.5 rounded-lg border border-white/5">
          <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white">Simulator Preview</span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setPreviewKey(k => k + 1)} className="text-zinc-500 hover:text-white p-1" title="Refresh Session"><RefreshCw className="w-3.5 h-3.5" /></button>
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
  }, [setPreview, setPreviewToolbar, PreviewPanel, CanvasOverlay, previewDevice, zoom, showGrid, entryPoint, selectedEventId, previewKey]);

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10">
      {ControlsPanel}
    </div>
  );
}
