/**
 * StationEditor Component
 * 
 * Modal/Form for editing a single station's properties.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Camera, 
  Gamepad2, 
  Eye, 
  QrCode,
  Settings,
  Copy,
  ExternalLink,
  Check,
  Link2
} from 'lucide-react';
import { getStationUrl, copyToClipboard, openInNewTab } from '@/lib/eventUrl';
import { toast } from 'sonner';
import type { Station } from './StationList';

interface StationEditorProps {
  station: Station | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (station: Station) => void;
  // URL generation props
  userSlug?: string;
  eventSlug?: string;
}

const STATION_TYPES = [
  { value: 'registration', label: 'Registration', icon: Users, description: 'Creates album + badge' },
  { value: 'booth', label: 'Photo Booth', icon: Camera, description: 'AI photo generation' },
  { value: 'playground', label: 'Playground', icon: Gamepad2, description: 'Interactive preview' },
  { value: 'viewer', label: 'Viewer', icon: Eye, description: 'Album display' },
] as const;

export function StationEditor({ 
  station, 
  open, 
  onOpenChange, 
  onSave,
  userSlug,
  eventSlug
}: StationEditorProps) {
  const [formData, setFormData] = useState<Station>({
    id: '',
    name: '',
    type: 'booth',
    requiresScanner: true,
  });
  const [copied, setCopied] = useState(false);

  const stationUrl = userSlug && eventSlug && formData.id ? getStationUrl({
    userSlug,
    eventSlug,
    stationId: formData.id,
    stationType: formData.type,
  }) : '';

  const handleCopyUrl = async () => {
    if (!stationUrl) return;
    const success = await copyToClipboard(stationUrl);
    if (success) {
      setCopied(true);
      toast.success('URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy URL');
    }
  };

  const handleOpenUrl = () => {
    if (!stationUrl) return;
    openInNewTab(stationUrl);
  };

  useEffect(() => {
    if (station) {
      setFormData(station);
    } else {
      setFormData({
        id: `station-${Date.now()}`,
        name: '',
        type: 'booth',
        requiresScanner: true,
      });
    }
  }, [station, open]);

  const handleSave = () => {
    if (!formData.name.trim()) {
      return;
    }
    onSave(formData);
    onOpenChange(false);
  };

  const selectedType = STATION_TYPES.find(t => t.value === formData.type);
  const Icon = selectedType?.icon || Camera;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Settings className="w-5 h-5" />
            {station ? 'Edit Station' : 'New Station'}
          </DialogTitle>
          <DialogDescription>
            Configure the station settings for your multi-station flow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Station Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Station Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Booth, Registration Desk"
              className="bg-slate-700/50 border-slate-600"
            />
          </div>

          {/* Station Type */}
          <div className="space-y-2">
            <Label>Station Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: Station['type']) => {
                setFormData({ 
                  ...formData, 
                  type: value,
                  requiresScanner: value !== 'registration'
                });
              }}
            >
              <SelectTrigger className="bg-slate-700/50 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATION_TYPES.map((type) => {
                  const TypeIcon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="w-4 h-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-xs text-slate-400">{selectedType.description}</p>
            )}
          </div>

          {/* Type Preview Card */}
          <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-indigo-500/20">
                <Icon className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <p className="font-medium text-white">{selectedType?.label}</p>
                <div className="flex items-center gap-2 mt-1">
                  {formData.type === 'registration' ? (
                    <Badge variant="secondary" className="text-xs">
                      Creates Albums
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <QrCode className="w-3 h-3 mr-1" />
                      Scans Badge
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Scanner Toggle (only for non-registration) */}
          {formData.type !== 'registration' && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="scanner">Requires Badge Scanner</Label>
                <p className="text-xs text-slate-400">
                  Station will prompt to scan visitor's badge QR
                </p>
              </div>
              <Switch
                id="scanner"
                checked={formData.requiresScanner ?? true}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, requiresScanner: checked })
                }
              />
            </div>
          )}

          {/* Station URL (only shown when editing existing station) */}
          {stationUrl && station && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Station URL
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={stationUrl}
                  readOnly
                  className="flex-1 bg-slate-900/50 border-slate-600 text-slate-400 font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUrl}
                  className="border-slate-600 flex-shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleOpenUrl}
                  className="border-slate-600 flex-shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Share this URL with staff to access this station
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-slate-600"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.name.trim()}
          >
            {station ? 'Save Changes' : 'Add Station'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StationEditor;

