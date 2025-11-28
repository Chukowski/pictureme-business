/**
 * StationList Component
 * 
 * List/edit interface for stations in AdminEventForm.
 * Allows adding, removing, reordering, and editing stations.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Edit2,
  Users,
  Camera,
  Gamepad2,
  Eye,
  QrCode,
  Copy,
  ExternalLink,
  Check,
  Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStationUrl, copyToClipboard, openInNewTab } from '@/lib/eventUrl';
import { toast } from 'sonner';

export interface Station {
  id: string;
  name: string;
  type: 'registration' | 'booth' | 'playground' | 'viewer';
  qrCode?: string;
  requiresScanner?: boolean;
}

interface StationListProps {
  stations: Station[];
  onChange: (stations: Station[]) => void;
  onEdit?: (station: Station) => void;
  disabled?: boolean;
  className?: string;
  // URL generation props
  userSlug?: string;
  eventSlug?: string;
  showUrls?: boolean;
}

const STATION_TYPE_CONFIG: Record<Station['type'], { 
  label: string; 
  icon: React.ElementType; 
  color: string;
  description: string;
}> = {
  registration: { 
    label: 'Registration', 
    icon: Users, 
    color: 'bg-blue-500',
    description: 'Creates album + badge for visitors'
  },
  booth: { 
    label: 'Photo Booth', 
    icon: Camera, 
    color: 'bg-purple-500',
    description: 'Scans badge + generates AI photo'
  },
  playground: { 
    label: 'Playground', 
    icon: Gamepad2, 
    color: 'bg-green-500',
    description: 'Interactive preview station'
  },
  viewer: { 
    label: 'Viewer', 
    icon: Eye, 
    color: 'bg-orange-500',
    description: 'Displays album feed'
  },
};

export function StationList({ 
  stations, 
  onChange, 
  onEdit,
  disabled = false,
  className,
  userSlug,
  eventSlug,
  showUrls = false
}: StationListProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  
  const handleCopyUrl = async (station: Station) => {
    if (!userSlug || !eventSlug) return;
    
    const url = getStationUrl({
      userSlug,
      eventSlug,
      stationId: station.id,
      stationType: station.type,
    });
    
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedId(station.id);
      toast.success('URL copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      toast.error('Failed to copy URL');
    }
  };

  const handleOpenUrl = (station: Station) => {
    if (!userSlug || !eventSlug) return;
    
    const url = getStationUrl({
      userSlug,
      eventSlug,
      stationId: station.id,
      stationType: station.type,
    });
    
    openInNewTab(url);
  };

  const getStationDisplayUrl = (station: Station): string => {
    if (!userSlug || !eventSlug) return '';
    return getStationUrl({
      userSlug,
      eventSlug,
      stationId: station.id,
      stationType: station.type,
    });
  };
  
  const handleAdd = (type: Station['type']) => {
    const config = STATION_TYPE_CONFIG[type];
    const newStation: Station = {
      id: `station-${Date.now()}`,
      name: `${config.label} ${stations.filter(s => s.type === type).length + 1}`,
      type,
      requiresScanner: type !== 'registration', // Registration creates, others scan
    };
    onChange([...stations, newStation]);
  };

  const handleRemove = (id: string) => {
    onChange(stations.filter(s => s.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newStations = [...stations];
    [newStations[index - 1], newStations[index]] = [newStations[index], newStations[index - 1]];
    onChange(newStations);
  };

  const handleMoveDown = (index: number) => {
    if (index === stations.length - 1) return;
    const newStations = [...stations];
    [newStations[index], newStations[index + 1]] = [newStations[index + 1], newStations[index]];
    onChange(newStations);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Station List */}
      {stations.length === 0 ? (
        <Card className="bg-slate-800/30 border-slate-700 border-dashed">
          <CardContent className="py-8 text-center">
            <QrCode className="w-12 h-12 mx-auto mb-3 text-slate-500" />
            <p className="text-slate-400 mb-4">No stations configured yet</p>
            <p className="text-xs text-slate-500">
              Add stations to create a multi-station workflow
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {stations.map((station, index) => {
            const config = STATION_TYPE_CONFIG[station.type];
            const Icon = config.icon;
            
            return (
              <Card 
                key={station.id} 
                className={cn(
                  "bg-slate-800/50 border-slate-700",
                  disabled && "opacity-50"
                )}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Drag Handle */}
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => handleMoveUp(index)}
                        disabled={disabled || index === 0}
                      >
                        <GripVertical className="w-4 h-4 text-slate-500 rotate-90" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => handleMoveDown(index)}
                        disabled={disabled || index === stations.length - 1}
                      >
                        <GripVertical className="w-4 h-4 text-slate-500 rotate-90" />
                      </Button>
                    </div>

                    {/* Station Icon */}
                    <div className={cn("p-2 rounded-lg", `${config.color}/20`)}>
                      <Icon className={cn("w-5 h-5", `text-${config.color.replace('bg-', '')}-400`)} />
                    </div>

                    {/* Station Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">
                          {station.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                        {station.requiresScanner && (
                          <Badge variant="secondary" className="text-xs">
                            <QrCode className="w-3 h-3 mr-1" />
                            Scanner
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {config.description}
                      </p>
                      
                      {/* Station URL */}
                      {showUrls && userSlug && eventSlug && (
                        <div className="flex items-center gap-2 mt-2">
                          <Link2 className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          <Input
                            value={getStationDisplayUrl(station)}
                            readOnly
                            className="h-7 text-xs bg-slate-900/50 border-slate-700 text-slate-400 font-mono"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0"
                            onClick={() => handleCopyUrl(station)}
                            disabled={disabled}
                          >
                            {copiedId === station.id ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0"
                            onClick={() => handleOpenUrl(station)}
                            disabled={disabled}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(station)}
                          disabled={disabled}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(station.id)}
                        disabled={disabled}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Station Buttons */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATION_TYPE_CONFIG) as Station['type'][]).map((type) => {
          const config = STATION_TYPE_CONFIG[type];
          const Icon = config.icon;
          
          return (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => handleAdd(type)}
              disabled={disabled}
              className="border-slate-600 hover:bg-slate-700"
            >
              <Icon className="w-4 h-4 mr-2" />
              Add {config.label}
            </Button>
          );
        })}
      </div>

      {/* Info Note */}
      <p className="text-xs text-slate-500">
        <strong>Note:</strong> Each station scans the visitor's badge QR code. 
        Only the Registration station creates new albums.
      </p>
    </div>
  );
}

export default StationList;

