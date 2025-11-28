/**
 * TemplateStationAssignment Component
 * 
 * Allows assigning templates to specific stations.
 * Templates can be assigned to "all" stations or specific station IDs.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Users,
  Camera,
  Gamepad2,
  Eye,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Station {
  id: string;
  name: string;
  type: 'registration' | 'booth' | 'playground' | 'viewer';
}

interface TemplateStationAssignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  stations: Station[];
  currentAssignment: 'all' | string[];
  onSave: (assignment: 'all' | string[]) => void;
}

const STATION_TYPE_ICONS: Record<Station['type'], React.ElementType> = {
  registration: Users,
  booth: Camera,
  playground: Gamepad2,
  viewer: Eye,
};

const STATION_TYPE_COLORS: Record<Station['type'], string> = {
  registration: 'text-blue-400',
  booth: 'text-purple-400',
  playground: 'text-green-400',
  viewer: 'text-orange-400',
};

export function TemplateStationAssignment({
  open,
  onOpenChange,
  templateName,
  stations,
  currentAssignment,
  onSave,
}: TemplateStationAssignmentProps) {
  const [assignmentMode, setAssignmentMode] = React.useState<'all' | 'specific'>(
    currentAssignment === 'all' ? 'all' : 'specific'
  );
  const [selectedStations, setSelectedStations] = React.useState<string[]>(
    currentAssignment === 'all' ? [] : currentAssignment
  );

  React.useEffect(() => {
    if (open) {
      setAssignmentMode(currentAssignment === 'all' ? 'all' : 'specific');
      setSelectedStations(currentAssignment === 'all' ? [] : currentAssignment);
    }
  }, [open, currentAssignment]);

  const handleToggleStation = (stationId: string) => {
    setSelectedStations(prev => 
      prev.includes(stationId)
        ? prev.filter(id => id !== stationId)
        : [...prev, stationId]
    );
  };

  const handleSave = () => {
    if (assignmentMode === 'all') {
      onSave('all');
    } else {
      onSave(selectedStations);
    }
    onOpenChange(false);
  };

  // Filter out registration stations (they don't use AI templates)
  const assignableStations = stations.filter(s => s.type !== 'registration');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Layers className="w-5 h-5 text-indigo-400" />
            Assign to Stations
          </DialogTitle>
          <DialogDescription>
            Choose which stations can use "{templateName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Assignment Mode */}
          <RadioGroup
            value={assignmentMode}
            onValueChange={(value: 'all' | 'specific') => setAssignmentMode(value)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-700/30 border border-slate-600">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="flex-1 cursor-pointer">
                <div className="font-medium text-white">All Stations</div>
                <p className="text-xs text-slate-400">
                  This template will be available at all booth stations
                </p>
              </Label>
              {assignmentMode === 'all' && (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              )}
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-700/30 border border-slate-600">
              <RadioGroupItem value="specific" id="specific" />
              <Label htmlFor="specific" className="flex-1 cursor-pointer">
                <div className="font-medium text-white">Specific Stations</div>
                <p className="text-xs text-slate-400">
                  Choose which stations can use this template
                </p>
              </Label>
              {assignmentMode === 'specific' && selectedStations.length > 0 && (
                <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-400">
                  {selectedStations.length} selected
                </Badge>
              )}
            </div>
          </RadioGroup>

          {/* Station Selection (only when specific mode) */}
          {assignmentMode === 'specific' && (
            <div className="space-y-3">
              <Label className="text-sm text-slate-400">Select Stations</Label>
              
              {assignableStations.length === 0 ? (
                <div className="text-center py-6 text-slate-500 border border-dashed border-slate-600 rounded-lg">
                  <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No booth stations configured</p>
                  <p className="text-xs">Add stations in the Album Tracking section</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {assignableStations.map((station) => {
                    const Icon = STATION_TYPE_ICONS[station.type];
                    const isSelected = selectedStations.includes(station.id);
                    
                    return (
                      <div
                        key={station.id}
                        onClick={() => handleToggleStation(station.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                          isSelected
                            ? "bg-indigo-500/10 border-indigo-500/50"
                            : "bg-slate-700/30 border-slate-600 hover:border-slate-500"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleStation(station.id)}
                        />
                        <Icon className={cn("w-5 h-5", STATION_TYPE_COLORS[station.type])} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{station.name}</p>
                          <p className="text-xs text-slate-400 capitalize">{station.type}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {assignableStations.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStations(assignableStations.map(s => s.id))}
                    className="border-slate-600 text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStations([])}
                    className="border-slate-600 text-xs"
                  >
                    Clear All
                  </Button>
                </div>
              )}
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
            disabled={assignmentMode === 'specific' && selectedStations.length === 0}
          >
            Save Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TemplateStationAssignment;

