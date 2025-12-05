import { useState } from "react";
import { PlaygroundSplitView } from "./PlaygroundSplitView";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Link2, Globe, UserPlus, Camera, Gamepad2, 
  Images, Copy, Check, ExternalLink, Info, Eye 
} from "lucide-react";
import { toast } from "sonner";
import { User as UserType, EventConfig } from "@/services/eventsApi";
import { ENV } from "@/config/env";

interface PlaygroundEventPreviewProps {
  events: EventConfig[];
  currentUser: UserType;
}

export function PlaygroundEventPreview({ events, currentUser }: PlaygroundEventPreviewProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [activeStation, setActiveStation] = useState<'main' | 'registration' | 'booth' | 'playground' | 'viewer'>('main');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

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
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Event Preview</h2>
        <p className="text-zinc-400">Explore and test all stations of your event.</p>
      </div>

      {/* 1. Select Event */}
      <Card className="bg-zinc-900/50 border-white/10">
        <CardHeader className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
          <CardTitle className="text-sm font-medium text-zinc-200">1. Select Event</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="h-9 bg-zinc-800 border-zinc-700 text-xs text-zinc-200">
              <SelectValue placeholder="Choose event to preview" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {events.map(e => (
                <SelectItem key={e._id} value={e._id} className="text-xs text-zinc-200">{e.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedEvent && (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700">
                <span className="text-[10px] text-zinc-500 uppercase">Status</span>
                <div className="mt-1">
                  <Badge variant="outline" className={selectedEvent.is_active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'text-zinc-400'}>
                    {selectedEvent.is_active ? 'Active' : 'Draft'}
                  </Badge>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700">
                <span className="text-[10px] text-zinc-500 uppercase">Templates</span>
                <div className="mt-1 text-sm font-medium text-zinc-200">
                  {selectedEvent.templates?.length || 0} Active
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Station Links */}
      <Card className="bg-zinc-900/50 border-white/10">
        <CardHeader className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
          <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-zinc-400" />
            2. Stations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {selectedEvent ? (
            [
              { key: 'main', label: 'Main Page', icon: Globe },
              { key: 'registration', label: 'Registration', icon: UserPlus },
              { key: 'booth', label: 'Booth', icon: Camera },
              { key: 'viewer', label: 'Viewer', icon: Images },
            ].map(({ key, label, icon: Icon }) => {
              const url = getStationUrl(key);
              const isCopied = copiedUrl === url;
              const isActive = activeStation === key;
              
              return (
                <div 
                  key={key} 
                  className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                    isActive ? 'bg-zinc-800 border border-zinc-700' : 'bg-transparent border border-transparent hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 overflow-hidden cursor-pointer" onClick={() => setActiveStation(key as any)}>
                    <div className={`p-1.5 rounded-md ${isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium block ${isActive ? 'text-white' : 'text-zinc-200'}`}>{label}</span>
                      <span className={`text-[10px] font-mono truncate block ${isActive ? 'text-zinc-400' : 'text-zinc-500'}`}>{url}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyUrl(url, label)}
                      className="h-7 w-7 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openStation(url)}
                      className="h-7 w-7 p-0 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-700"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
              <p className="text-sm text-zinc-400">Select an event to see stations</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <div className="p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-medium text-indigo-300">Preview Tip</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          The preview on the right loads the actual station. You can interact with it as a user. 
          For full screen testing, use the "Open" button next to each station.
        </p>
      </div>
    </div>
  );

  // --- Right Panel ---
  const PreviewPanel = (
    <div className="h-full flex flex-col bg-zinc-900">
      {selectedEvent ? (
        <iframe
          src={getStationUrl(activeStation)}
          className="w-full h-full border-0"
          title="Station Preview"
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
          <Eye className="w-12 h-12 mb-4 opacity-20" />
          <p>Select an event to preview</p>
        </div>
      )}
    </div>
  );

  return (
    <PlaygroundSplitView 
      leftPanel={ControlsPanel} 
      rightPanel={PreviewPanel} 
    />
  );
}

