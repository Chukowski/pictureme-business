import { useState } from "react";
import { PlaygroundSplitView } from "./PlaygroundSplitView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Camera, UserPlus, Gamepad2, Images, ExternalLink } from "lucide-react";
import { User as UserType, EventConfig } from "@/services/eventsApi";

interface PlaygroundBoothSimulatorProps {
  events: EventConfig[];
  currentUser: UserType;
}

export function PlaygroundBoothSimulator({ events, currentUser }: PlaygroundBoothSimulatorProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [entryPoint, setEntryPoint] = useState<'registration' | 'booth' | 'playground' | 'viewer'>('booth');

  const selectedEvent = events.find(e => e._id === selectedEventId);

  const getUrl = (mock: boolean = false) => {
    if (!selectedEvent || !currentUser) return '';
    const baseUrl = window.location.origin;
    const path = entryPoint === 'booth' ? 'booth' : entryPoint; // simplify if needed
    return `${baseUrl}/${currentUser.slug}/${selectedEvent.slug}/${path}${mock ? '?mock=1' : ''}`;
  };

  const launchSimulator = (mock: boolean) => {
    window.open(getUrl(mock), '_blank');
  };

  // --- Left Panel ---
  const ControlsPanel = (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Booth Simulator</h2>
        <p className="text-zinc-400">Test the full visitor experience flow.</p>
      </div>

      {/* Step 1 */}
      <div className="relative pl-8 pb-8 border-l border-zinc-800 last:border-0">
        <div className="absolute left-0 top-0 -translate-x-1/2 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400">1</div>
        <Card className="bg-zinc-900/50 border-white/10">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-medium text-zinc-200">Select Event</h3>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
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
      </div>

      {/* Step 2 */}
      <div className="relative pl-8 pb-8 border-l border-zinc-800 last:border-0">
        <div className="absolute left-0 top-0 -translate-x-1/2 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400">2</div>
        <Card className="bg-zinc-900/50 border-white/10">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-medium text-zinc-200">Entry Point</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'registration', label: 'Registration', icon: UserPlus },
                { id: 'booth', label: 'Booth', icon: Camera },
                { id: 'playground', label: 'Playground', icon: Gamepad2 },
                { id: 'viewer', label: 'Viewer', icon: Images },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setEntryPoint(item.id as any)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                    entryPoint === item.id
                      ? 'bg-pink-500/10 border-pink-500/50 text-pink-400'
                      : 'bg-zinc-800/50 border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                  }`}
                >
                  <item.icon className="w-5 h-5 mb-2" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step 3 */}
      <div className="relative pl-8">
        <div className="absolute left-0 top-0 -translate-x-1/2 w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold shadow-lg shadow-pink-500/20">3</div>
        <Card className="bg-zinc-900/50 border-white/10 border-t-2 border-t-pink-500">
          <CardContent className="p-4 space-y-4">
            <h3 className="text-sm font-medium text-zinc-200">Launch Simulator</h3>
            <Button
              className="w-full h-12 bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-900/20"
              disabled={!selectedEvent}
              onClick={() => launchSimulator(false)}
            >
              <Play className="w-4 h-4 mr-2 fill-current" />
              Start Live Session
            </Button>
            <Button
              variant="outline"
              className="w-full border-pink-500/20 text-pink-400 hover:bg-pink-500/10"
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

  // --- Right Panel ---
  const PreviewPanel = (
    <div className="h-full flex flex-col bg-zinc-900 relative">
      {selectedEvent ? (
        <>
          <div className="absolute top-4 right-4 z-10">
            <Badge variant="outline" className="bg-black/50 backdrop-blur text-zinc-300 border-white/10">
              Live Preview: {entryPoint}
            </Badge>
          </div>
          <iframe
            src={getUrl(true)}
            className="w-full h-full border-0"
            title="Simulator Preview"
          />
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
          <Camera className="w-12 h-12 mb-4 opacity-20" />
          <p>Configure simulator to start</p>
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

