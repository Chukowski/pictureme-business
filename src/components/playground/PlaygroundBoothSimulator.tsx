import { useState } from "react";
import { PlaygroundSplitView } from "./PlaygroundSplitView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Camera, UserPlus, Gamepad2, Images, ExternalLink, Rocket } from "lucide-react";
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
           <Select value={selectedEventId} onValueChange={setSelectedEventId}>
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
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center ${
                  entryPoint === item.id
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

  return (
    <PlaygroundSplitView 
      leftPanel={ControlsPanel} 
      rightPanel={PreviewPanel} 
      canvasOverlay={CanvasOverlay}
    />
  );
}
