/**
 * StationLinksCard Component
 * 
 * Displays all station URLs for an event with copy/open actions.
 * Used in event dashboard for quick staff access.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Link2,
  Copy,
  ExternalLink,
  CheckCircle2,
  QrCode,
  UserPlus,
  Camera,
  Gamepad2,
  Eye,
  Monitor,
} from 'lucide-react';
import { toast } from 'sonner';
import { getStationUrl, copyToClipboard, openInNewTab } from '@/lib/eventUrl';
import { AlbumStation } from '@/services/eventsApi';

interface StationLinksCardProps {
  userSlug: string;
  eventSlug: string;
  postgresEventId?: number;
  stations?: AlbumStation[];
  albumTrackingEnabled?: boolean;
}

// Default stations when album tracking is enabled but no custom stations defined
const defaultStations: AlbumStation[] = [
  { id: 'registration', name: 'Registration', type: 'registration', enabled: true },
  { id: 'booth', name: 'Photo Booth', type: 'booth', enabled: true },
  { id: 'playground', name: 'Playground', type: 'playground', enabled: true },
  { id: 'viewer', name: 'Viewer', type: 'viewer', enabled: true },
];

const stationIcons: Record<string, React.ReactNode> = {
  registration: <UserPlus className="w-4 h-4" />,
  booth: <Camera className="w-4 h-4" />,
  playground: <Gamepad2 className="w-4 h-4" />,
  viewer: <Eye className="w-4 h-4" />,
};

const stationColors: Record<string, string> = {
  registration: 'bg-green-500/20 text-green-400 border-green-500/30',
  booth: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  playground: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  viewer: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

export function StationLinksCard({
  userSlug,
  eventSlug,
  postgresEventId,
  stations,
  albumTrackingEnabled = false,
}: StationLinksCardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Use provided stations or defaults
  const displayStations = stations?.length ? stations : (albumTrackingEnabled ? defaultStations : []);

  // Helper to build URL with short format preference
  const buildUrl = (path: string) => {
    if (postgresEventId) {
      return `${window.location.origin}/e/${postgresEventId}/${eventSlug}/${path}`;
    }
    return `${window.location.origin}/${userSlug}/${eventSlug}/${path}`;
  };

  const handleCopy = async (station: AlbumStation) => {
    const url = buildUrl(station.type);
    
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedId(station.id);
      toast.success('URL copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      toast.error('Failed to copy URL');
    }
  };

  const handleOpen = (station: AlbumStation) => {
    const url = buildUrl(station.type);
    openInNewTab(url);
  };

  // Get big screen URL
  const bigScreenUrl = buildUrl('bigscreen');

  if (!albumTrackingEnabled && displayStations.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Link2 className="w-5 h-5 text-indigo-400" />
          Station Links
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Quick access URLs for each station. Share these with your staff.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayStations.map((station) => {
          const url = getStationUrl({
            userSlug,
            eventSlug,
            stationType: station.type,
            stationId: station.id,
          });
          
          return (
            <div
              key={station.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
            >
              {/* Station Type Badge */}
              <Badge
                variant="outline"
                className={`${stationColors[station.type] || 'bg-zinc-500/20 text-zinc-400'} flex items-center gap-1`}
              >
                {stationIcons[station.type]}
                {station.type}
              </Badge>
              
              {/* Station Name */}
              <span className="text-white font-medium min-w-[100px]">
                {station.name}
              </span>
              
              {/* URL Input */}
              <Input
                value={url}
                readOnly
                className="flex-1 bg-card border-zinc-700 text-zinc-400 text-sm font-mono"
              />
              
              {/* Actions */}
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(station)}
                  className="h-8 w-8"
                >
                  {copiedId === station.id ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpen(station)}
                  className="h-8 w-8"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {/* Big Screen Link */}
        {albumTrackingEnabled && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30">
            <Badge
              variant="outline"
              className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 flex items-center gap-1"
            >
              <Monitor className="w-4 h-4" />
              bigscreen
            </Badge>
            
            <span className="text-white font-medium min-w-[100px]">
              Big Screen
            </span>
            
            <Input
              value={bigScreenUrl}
              readOnly
              className="flex-1 bg-card border-zinc-700 text-zinc-400 text-sm font-mono"
            />
            
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  const success = await copyToClipboard(bigScreenUrl);
                  if (success) {
                    setCopiedId('bigscreen');
                    toast.success('URL copied to clipboard');
                    setTimeout(() => setCopiedId(null), 2000);
                  }
                }}
                className="h-8 w-8"
              >
                {copiedId === 'bigscreen' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openInNewTab(bigScreenUrl)}
                className="h-8 w-8"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* QR Code hint */}
        <p className="text-xs text-zinc-500 flex items-center gap-1 mt-2">
          <QrCode className="w-3 h-3" />
          Tip: Print QR codes for each station URL for easy device setup
        </p>
      </CardContent>
    </Card>
  );
}

export default StationLinksCard;

