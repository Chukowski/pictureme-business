import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, UserPlus, Monitor, Image, Copy, ExternalLink, Check, QrCode, AlertTriangle, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LiveStationsProps {
  event?: any;
  mode?: 'grid' | 'sidebar';
}

export function LiveStations({ event, mode = 'grid' }: LiveStationsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrStation, setQrStation] = useState<any | null>(null);

  const stations = [
    { 
      id: 'registration', 
      name: 'Registration', 
      status: 'online', 
      activity: 'Idle', 
      lastActive: '2m ago',
      version: 'v2.4.1',
      icon: UserPlus, 
      color: 'text-blue-400', 
      bg: 'bg-blue-500/10' 
    },
    { 
      id: 'booth', 
      name: 'Main Booth', 
      status: 'active', 
      activity: 'Taking Photos', 
      queue: 3, 
      lastActive: 'Just now',
      version: 'v3.0.0',
      icon: Camera, 
      color: 'text-purple-400', 
      bg: 'bg-purple-500/10' 
    },
    { 
      id: 'viewer', 
      name: 'Gallery Station', 
      status: 'online', 
      activity: '2 active viewers', 
      lastActive: '1m ago',
      version: 'v2.4.1',
      icon: Image, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10' 
    },
    { 
      id: 'bigscreen', 
      name: 'Big Screen', 
      status: 'online', 
      activity: 'Displaying Feed', 
      lastActive: '5m ago',
      version: 'v1.2.0',
      icon: Monitor, 
      color: 'text-amber-400', 
      bg: 'bg-amber-500/10' 
    },
  ];

  const getStationUrl = (type: string) => {
    if (!event?.slug) return '';
    const baseUrl = window.location.origin;
    
    // URL mapping for different station types
    let path = type;
    if (type === 'bigscreen') {
      path = 'bigscreen';
    } else if (type === 'booth') {
      path = 'booth';
    } else if (type === 'registration') {
      path = 'registration';
    } else if (type === 'viewer') {
      path = 'viewer';
    }

    // Prefer short URL format with event ID if available
    if (event?.postgres_event_id || event?.id) {
      const eventId = event.postgres_event_id || event.id;
      return `${baseUrl}/e/${eventId}/${event.slug}/${path}`;
    }
    
    // Fallback to user slug format
    if (event?.user_slug) {
      return `${baseUrl}/${event.user_slug}/${event.slug}/${path}`;
    }
    
    return '';
  };

  const handleCopy = (id: string, type: string) => {
    const url = getStationUrl(type);
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Station link copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpen = (type: string) => {
    const url = getStationUrl(type);
    window.open(url, '_blank');
  };

  const StationCard = ({ station }: { station: typeof stations[0] }) => (
    <Card className={`bg-card border-white/10 hover:border-white/20 transition-all group overflow-hidden relative ${mode === 'sidebar' ? 'mb-3' : ''}`}>
      {/* Status Indicator Line */}
      <div className={`absolute top-0 left-0 w-1 h-full ${station.status === 'active' ? 'bg-purple-500' : station.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
      
      <CardContent className="p-4 pl-6">
        <div className="flex items-center justify-between mb-2">
          <div className={`p-2 rounded-lg ${station.bg} ${station.color}`}>
            <station.icon className="w-5 h-5" />
          </div>
          <Badge variant="outline" className={`
            border-0 text-[10px] px-2 py-0.5
            ${station.status === 'active' ? 'bg-purple-500/10 text-purple-400' : 
              station.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 
              'bg-red-500/10 text-red-400'}
          `}>
            {station.status}
          </Badge>
        </div>
        
        <div className="mb-3">
          <h3 className="font-medium text-white text-sm">{station.name}</h3>
          <div className="flex items-center justify-between mt-1">
             <p className="text-xs text-zinc-400 truncate max-w-[120px]">{station.activity}</p>
             {station.queue && (
                <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  {station.queue} in queue
                </span>
             )}
          </div>
        </div>

        {/* Hover Details (Expanded) - Only visible in sidebar mode via tooltip or implicit expansion if desired, but for now we keep it simple. 
            The requirement says "Expand stations on hover". 
            Let's add an expanded view overlay or drawer. 
            For simplicity in this step, let's use the group-hover to show more details.
        */}
        <div className="hidden group-hover:block absolute inset-0 bg-card/95 z-10 p-4 pl-6 animate-in fade-in zoom-in-95 duration-200">
           <div className="flex items-center justify-between mb-2">
             <h3 className="font-bold text-white text-sm">{station.name}</h3>
             <Badge variant="outline" className="text-[10px] border-white/20 text-zinc-400">{station.version}</Badge>
           </div>
           
           <div className="space-y-2 mb-3">
             <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Last Active</span>
                <span className="text-zinc-300 flex items-center gap-1"><Clock className="w-3 h-3" /> {station.lastActive}</span>
             </div>
             <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">URL</span>
                <span className="text-zinc-300 truncate max-w-[100px] opacity-50">.../{station.id}</span>
             </div>
             <div className="flex items-center gap-1 text-[10px] text-amber-500/80">
                <AlertTriangle className="w-3 h-3" /> No recent errors
             </div>
           </div>

           <div className="flex items-center gap-1 pt-2 border-t border-white/10">
              <Button size="sm" variant="ghost" onClick={() => handleCopy(station.id, station.id)} className="h-6 flex-1 text-[10px] text-zinc-400 hover:text-white">Copy</Button>
              <Button size="sm" variant="ghost" onClick={() => handleOpen(station.id)} className="h-6 flex-1 text-[10px] text-zinc-400 hover:text-white">Open</Button>
           </div>
        </div>

        {/* Standard Action Buttons (when not hovered) */}
        <div className="flex items-center gap-1 pt-3 border-t border-white/5 group-hover:invisible">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => handleCopy(station.id, station.id)}
            className="h-7 flex-1 text-[10px] text-zinc-400 hover:text-white hover:bg-white/5"
          >
            {copiedId === station.id ? <Check className="w-3 h-3 mr-1.5" /> : <Copy className="w-3 h-3 mr-1.5" />}
            Link
          </Button>
          <div className="w-px h-3 bg-white/10" />
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setQrStation(station)}
            className="h-7 px-2 text-zinc-400 hover:text-white hover:bg-white/5"
            title="Show QR"
          >
            <QrCode className="w-3.5 h-3.5" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => handleOpen(station.id)}
            className="h-7 px-2 text-zinc-400 hover:text-white hover:bg-white/5"
            title="Open Station"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className={mode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" : "flex flex-col h-full overflow-y-auto pr-1"}>
        {mode === 'sidebar' && <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider px-1 mb-3">Stations</h3>}
        {stations.map(station => (
           <StationCard key={station.id} station={station} />
        ))}
      </div>

      <Dialog open={!!qrStation} onOpenChange={() => setQrStation(null)}>
        <DialogContent className="bg-card border-white/10 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan to Open {qrStation?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <div className="p-4 bg-white rounded-xl">
              {qrStation && (
                <QRCodeSVG 
                  value={getStationUrl(qrStation.id)} 
                  size={200}
                />
              )}
            </div>
            <p className="text-sm text-zinc-400 text-center break-all px-4 bg-card/50 p-2 rounded border border-white/5">
              {qrStation && getStationUrl(qrStation.id)}
            </p>
            <Button variant="outline" onClick={() => {
              if (qrStation) handleCopy(qrStation.id, qrStation.id);
            }} className="mt-2 border-white/10 hover:bg-white/5 text-zinc-300">
              <Copy className="w-4 h-4 mr-2" /> Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
