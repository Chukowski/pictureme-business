import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, UserPlus, Monitor, Image, Copy, ExternalLink, Check, QrCode } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LiveStationsProps {
  event?: any;
}

export function LiveStations({ event }: LiveStationsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrStation, setQrStation] = useState<any | null>(null);

  const stations = [
    { id: 'registration', name: 'Registration', status: 'online', activity: 'Idle', icon: UserPlus },
    { id: 'booth', name: 'Main Booth', status: 'active', activity: 'Taking Photos', queue: 3, icon: Camera },
    { id: 'viewer', name: 'Gallery Station', status: 'online', activity: '2 active viewers', icon: Image },
    { id: 'bigscreen', name: 'Big Screen', status: 'online', activity: 'Displaying Feed', icon: Monitor },
  ];

  const getStationUrl = (type: string) => {
    if (!event?.user_slug || !event?.slug) return '';
    const baseUrl = window.location.origin;
    
    // URL mapping for different station types
    let path = type;
    if (type === 'bigscreen') {
      path = 'display'; // Big Screen maps to /:userSlug/:eventSlug/display
    } else if (type === 'booth') {
      path = 'booth'; // Main Booth maps to /:userSlug/:eventSlug/booth
    } else if (type === 'registration') {
      path = 'registration';
    } else if (type === 'viewer') {
      path = 'viewer';
    }

    // Construct URL: baseUrl / userSlug / eventSlug / path
    return `${baseUrl}/${event.user_slug}/${event.slug}/${path}`;
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

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stations.map(station => (
          <Card key={station.id} className="bg-zinc-900/50 border-white/10 hover:bg-zinc-900/80 transition-colors group">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg bg-zinc-800 ${station.status === 'active' ? 'text-purple-400 ring-1 ring-purple-500/30' : 'text-zinc-400'}`}>
                  <station.icon className="w-4 h-4" />
                </div>
                <Badge variant="outline" className={`
                  ${station.status === 'active' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                    station.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                    'bg-red-500/10 text-red-400 border-red-500/20'}
                `}>
                  {station.status}
                </Badge>
              </div>
              
              <div>
                <h3 className="font-medium text-white text-sm">{station.name}</h3>
                <p className="text-xs text-zinc-400 mt-1">{station.activity}</p>
                {station.queue && (
                   <p className="text-xs text-purple-400 mt-1 font-medium">{station.queue} in queue</p>
                )}
              </div>

              {/* Quick Actions Overlay (visible on hover or focus) */}
              <div className="flex gap-1 mt-4 pt-3 border-t border-white/5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleCopy(station.id, station.id)}
                  className="h-7 flex-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  {copiedId === station.id ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  Copy
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setQrStation(station)}
                  className="h-7 px-2 text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  <QrCode className="w-3 h-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleOpen(station.id)}
                  className="h-7 px-2 text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!qrStation} onOpenChange={() => setQrStation(null)}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-sm">
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
            <p className="text-sm text-zinc-400 text-center break-all px-4">
              {qrStation && getStationUrl(qrStation.id)}
            </p>
            <Button variant="outline" onClick={() => {
              if (qrStation) handleCopy(qrStation.id, qrStation.id);
            }} className="mt-2">
              <Copy className="w-4 h-4 mr-2" /> Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

