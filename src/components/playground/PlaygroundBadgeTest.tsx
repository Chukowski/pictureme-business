import { useState, useRef, useEffect } from "react";
import { PlaygroundSplitView } from "./PlaygroundSplitView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, Sparkles, Loader2, 
  Save, QrCode, Camera, Move, Maximize2,
  RotateCcw, User, Calendar, Type, Palette
} from "lucide-react";
import { toast } from "sonner";
import { User as UserType, EventConfig, updateEvent } from "@/services/eventsApi";
import { processImageWithAI, downloadImageAsBase64 } from "@/services/aiProcessor";
import { BadgeTemplateConfig, CustomElementPositions, DEFAULT_ELEMENT_POSITIONS } from "@/components/templates/BadgeTemplateEditor";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Constants
const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face",
];

interface PlaygroundBadgeTestProps {
  events: EventConfig[];
  currentUser: UserType;
  onReloadEvents: () => Promise<void>;
}

export function PlaygroundBadgeTest({ events, currentUser, onReloadEvents }: PlaygroundBadgeTestProps) {
  // State
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [testImage, setTestImage] = useState<string | null>(null);
  const [testImageBase64, setTestImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const badgeEditorRef = useRef<HTMLDivElement>(null);

  // Badge State
  const [badgePreview, setBadgePreview] = useState({
    name: 'John Doe',
    eventName: 'Sample Event',
    date: new Date().toLocaleDateString(),
    customField1: '',
    customField2: '',
  });
  const [badgeProcessedImage, setBadgeProcessedImage] = useState<string | null>(null);
  const [isBadgeProcessing, setIsBadgeProcessing] = useState(false);
  
  // Visual Editor State
  const [isVisualEditorMode, setIsVisualEditorMode] = useState(false);
  const [elementPositions, setElementPositions] = useState<CustomElementPositions>({ ...DEFAULT_ELEMENT_POSITIONS });
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [isSavingPositions, setIsSavingPositions] = useState(false);
  
  const [textStyles, setTextStyles] = useState({
    nameColor: '#ffffff',
    eventNameColor: 'rgba(255,255,255,0.8)',
    dateTimeColor: 'rgba(255,255,255,0.6)',
  });

  // Derived State
  const selectedEvent = events.find(e => e._id === selectedEventId);
  const badgeConfig = selectedEvent?.badgeTemplate || { enabled: false } as BadgeTemplateConfig;

  useEffect(() => {
    if (selectedEvent?.badgeTemplate?.positions) {
      setElementPositions(selectedEvent.badgeTemplate.positions);
    }
    if (selectedEvent) {
        setBadgePreview(prev => ({...prev, eventName: selectedEvent.title}));
    }
  }, [selectedEvent]);

  // Handlers
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setTestImage(result);
        setTestImageBase64(result);
        setBadgeProcessedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const useSampleImage = async (url: string) => {
    setTestImage(url);
    setTestImageBase64(null);
    setBadgeProcessedImage(null);
    try {
      const base64 = await downloadImageAsBase64(url);
      setTestImageBase64(base64);
    } catch (error) {
      toast.error("Failed to load sample image");
    }
  };

  const processBadgeWithAI = async () => {
    if (!testImageBase64 || !badgeConfig.aiPipeline?.enabled) return;
    
    setIsBadgeProcessing(true);
    try {
      const result = await processImageWithAI({
        imageBase64: testImageBase64,
        prompt: badgeConfig.aiPipeline.prompt || "Enhance this portrait photo, professional lighting, clear background",
        modelKey: badgeConfig.aiPipeline.model as any || "nanoBanana",
        aspectRatio: "1:1",
      });
      setBadgeProcessedImage(result.imageUrl);
      toast.success("Badge photo enhanced!");
    } catch (error: any) {
      toast.error(error.message || "Failed to process badge photo");
    } finally {
      setIsBadgeProcessing(false);
    }
  };

  // Drag and Drop Logic
  const handleDragStart = (element: string, e: React.MouseEvent) => {
    if (!isVisualEditorMode) return;
    setDraggingElement(element);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingElement || !badgeEditorRef.current || !isVisualEditorMode) return;
    
    const rect = badgeEditorRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setElementPositions(prev => ({
      ...prev,
      [draggingElement]: { x, y }
    }));
  };

  const handleMouseUp = () => {
    setDraggingElement(null);
  };

  const savePositionsToTemplate = async () => {
    if (!selectedEvent) return;
    setIsSavingPositions(true);
    try {
      await updateEvent(selectedEvent._id, {
        badgeTemplate: {
          ...badgeConfig,
          positions: elementPositions
        }
      });
      await onReloadEvents();
      toast.success("Badge layout saved to template!");
      setIsVisualEditorMode(false);
    } catch (error) {
      toast.error("Failed to save layout");
    } finally {
      setIsSavingPositions(false);
    }
  };

  const resetPositions = () => {
    setElementPositions(DEFAULT_ELEMENT_POSITIONS);
  };

  // --- Left Panel Content ---
  const ControlsPanel = (
    <div className="space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Badge Test</h2>
        <p className="text-zinc-400">Design, test, and refine visitor badge layouts.</p>
      </div>

      {/* 1. Configuration Section */}
      <Card className="bg-zinc-900/50 border-white/10 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-bold">1</div>
          <span className="text-base font-medium text-zinc-200">Configuration</span>
        </div>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">Event</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="h-10 bg-zinc-800 border-zinc-700 text-sm text-zinc-200 focus:ring-cyan-500/20">
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {events.map(e => (
                  <SelectItem key={e._id} value={e._id} className="text-zinc-200">{e.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEvent && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 border border-white/5">
              <span className="text-sm text-zinc-300">Template Status</span>
              <Badge variant={badgeConfig.enabled ? 'default' : 'secondary'} className={badgeConfig.enabled ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : ''}>
                {badgeConfig.enabled ? 'Active' : 'Disabled'}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Visitor Info */}
      <Card className="bg-zinc-900/50 border-white/10 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">2</div>
          <span className="text-base font-medium text-zinc-200">Visitor Data</span>
        </div>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-500 uppercase tracking-wider">Name</Label>
            <Input 
              value={badgePreview.name} 
              onChange={(e) => setBadgePreview(prev => ({ ...prev, name: e.target.value }))}
              className="h-9 text-sm bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
            />
          </div>
          {badgeConfig.fields?.customField1 && (
            <div className="space-y-1">
              <Label className="text-xs text-zinc-500 uppercase tracking-wider">{badgeConfig.fields.customField1}</Label>
              <Input 
                value={badgePreview.customField1} 
                onChange={(e) => setBadgePreview(prev => ({ ...prev, customField1: e.target.value }))}
                className="h-9 text-sm bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Photo Source */}
      <Card className="bg-zinc-900/50 border-white/10 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 text-xs font-bold">3</div>
          <span className="text-base font-medium text-zinc-200">Photo</span>
        </div>
        <CardContent className="p-6 space-y-6">
          <div 
            className="border-2 border-dashed border-zinc-700 rounded-xl p-6 text-center cursor-pointer hover:border-zinc-500 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {testImage ? (
              <img src={testImage} alt="Profile" className="w-20 h-20 mx-auto rounded-full object-cover ring-4 ring-zinc-800" />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                   <Upload className="w-5 h-5 text-zinc-400" />
                </div>
                <span className="text-sm text-zinc-400">Upload photo</span>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {SAMPLE_IMAGES.map((url, i) => (
              <button key={i} onClick={() => useSampleImage(url)} className="aspect-square rounded-lg overflow-hidden border border-transparent hover:border-white/20 hover:scale-105 transition-all">
                <img src={url} alt="Sample" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {badgeConfig.aiPipeline?.enabled && (
            <Button 
              onClick={processBadgeWithAI} 
              disabled={!testImageBase64 || isBadgeProcessing}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/20"
            >
              {isBadgeProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2 fill-current" />}
              Enhance Photo
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // --- Canvas Overlay Controls ---
  const CanvasOverlay = isVisualEditorMode ? (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
      <Card className="bg-zinc-950/90 backdrop-blur-xl border-white/10 shadow-2xl w-[400px]">
         <div className="p-3 space-y-3">
           <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                 <Move className="w-4 h-4 text-cyan-400" />
                 <span className="text-xs font-bold text-white uppercase tracking-wider">Visual Editor</span>
              </div>
              <div className="flex gap-1">
                <TooltipProvider>
                   <Tooltip>
                     <TooltipTrigger asChild>
                       <Button size="icon" variant="ghost" onClick={resetPositions} className="h-6 w-6 text-zinc-400 hover:text-white">
                         <RotateCcw className="w-3 h-3" />
                       </Button>
                     </TooltipTrigger>
                     <TooltipContent>Reset Layout</TooltipContent>
                   </Tooltip>
                </TooltipProvider>
                <Button size="sm" onClick={savePositionsToTemplate} disabled={isSavingPositions} className="h-6 text-[10px] bg-cyan-600 hover:bg-cyan-700 px-2">
                  {isSavingPositions ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsVisualEditorMode(false)} className="h-6 text-[10px] px-2 text-zinc-400">
                   Exit
                </Button>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 bg-black/30 p-1.5 rounded border border-white/5">
                 <Type className="w-3 h-3 text-zinc-500" />
                 <span className="text-[10px] text-zinc-400 w-12">Name</span>
                 <input type="color" value={textStyles.nameColor} onChange={e => setTextStyles(p => ({...p, nameColor: e.target.value}))} className="w-4 h-4 rounded border-0 bg-transparent cursor-pointer flex-1"/>
              </div>
              <div className="flex items-center gap-2 bg-black/30 p-1.5 rounded border border-white/5">
                 <Calendar className="w-3 h-3 text-zinc-500" />
                 <span className="text-[10px] text-zinc-400 w-12">Date</span>
                 <input type="color" value={textStyles.dateTimeColor} onChange={e => setTextStyles(p => ({...p, dateTimeColor: e.target.value}))} className="w-4 h-4 rounded border-0 bg-transparent cursor-pointer flex-1"/>
              </div>
              <div className="flex items-center gap-2 bg-black/30 p-1.5 rounded border border-white/5 col-span-2">
                 <Palette className="w-3 h-3 text-zinc-500" />
                 <span className="text-[10px] text-zinc-400 w-12">Event</span>
                 <input type="color" value={textStyles.eventNameColor} onChange={e => setTextStyles(p => ({...p, eventNameColor: e.target.value}))} className="w-4 h-4 rounded border-0 bg-transparent cursor-pointer flex-1"/>
              </div>
           </div>
           <p className="text-[10px] text-zinc-500 text-center">
             Drag elements on the badge to reposition.
           </p>
         </div>
      </Card>
    </div>
  ) : (
     <div className="absolute top-4 right-4 pointer-events-auto">
        <Button
          size="sm"
          variant="secondary"
          className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 shadow-xl"
          onClick={() => setIsVisualEditorMode(true)}
        >
          <Move className="w-3 h-3 mr-2" />
          Edit Layout
        </Button>
     </div>
  );

  // --- Right Panel Content (Badge Preview) ---
  const PreviewPanel = (
    <div 
      className="h-full flex flex-col items-center justify-center bg-zinc-900/50 relative overflow-hidden"
      onMouseMove={isVisualEditorMode ? handleMouseMove : undefined}
      onMouseUp={isVisualEditorMode ? handleMouseUp : undefined}
    >
      <div
        ref={badgeEditorRef}
        className={`relative shadow-2xl overflow-hidden transition-all ${isVisualEditorMode ? 'ring-2 ring-cyan-500/50 scale-95' : 'hover:scale-105'} duration-300`}
        style={{ 
          width: badgeConfig.layout === 'landscape' ? 320 : 240,
          height: badgeConfig.layout === 'landscape' ? 240 : badgeConfig.layout === 'square' ? 240 : 320,
          backgroundColor: badgeConfig.backgroundUrl ? undefined : (badgeConfig.backgroundColor || selectedEvent?.theme?.primaryColor || '#6366F1'),
          backgroundImage: badgeConfig.backgroundUrl ? `url(${badgeConfig.backgroundUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '16px',
          boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Elements Rendering - Same as before but cleaner code if possible */}
        {/* Photo */}
        <div
          className={`absolute flex items-center justify-center ${isVisualEditorMode ? 'cursor-move hover:ring-1 hover:ring-white/50' : ''} ${draggingElement === 'photo' ? 'ring-2 ring-cyan-400 z-50' : ''}`}
          style={{
            left: `${elementPositions.photo?.x || 50}%`,
            top: `${elementPositions.photo?.y || 20}%`,
            transform: 'translate(-50%, -50%)',
            width: `${badgeConfig.photoPlacement?.size === 'small' ? 22 : badgeConfig.photoPlacement?.size === 'large' ? 38 : 30}%`,
            height: `${badgeConfig.photoPlacement?.size === 'small' ? 22 : badgeConfig.photoPlacement?.size === 'large' ? 38 : 30}%`,
          }}
          onMouseDown={(e) => handleDragStart('photo', e)}
        >
          <div className={`w-full h-full bg-white/20 border-2 border-white/30 overflow-hidden shadow-lg ${badgeConfig.photoPlacement?.shape === 'circle' ? 'rounded-full' : 'rounded-xl'}`}>
            {(badgeProcessedImage || testImage) ? (
              <img src={badgeProcessedImage || testImage || ''} className="w-full h-full object-cover" draggable={false} />
            ) : (
              <User className="w-full h-full p-2 text-white/50" />
            )}
          </div>
        </div>

        {/* Name */}
        {badgeConfig.fields?.showName && (
          <div
            className={`absolute whitespace-nowrap ${isVisualEditorMode ? 'cursor-move hover:ring-1 hover:ring-white/50' : ''} ${draggingElement === 'name' ? 'ring-2 ring-cyan-400 z-50' : ''}`}
            style={{
              left: `${elementPositions.name?.x || 50}%`,
              top: `${elementPositions.name?.y || 55}%`,
              transform: 'translate(-50%, -50%)',
              color: textStyles.nameColor,
              fontWeight: 'bold',
              fontSize: '1.25rem',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}
            onMouseDown={(e) => handleDragStart('name', e)}
          >
            {badgePreview.name}
          </div>
        )}

        {/* Event Name */}
        {badgeConfig.fields?.showEventName && (
          <div
            className={`absolute whitespace-nowrap ${isVisualEditorMode ? 'cursor-move hover:ring-1 hover:ring-white/50' : ''} ${draggingElement === 'eventName' ? 'ring-2 ring-cyan-400 z-50' : ''}`}
            style={{
              left: `${elementPositions.eventName?.x || 50}%`,
              top: `${elementPositions.eventName?.y || 62}%`,
              transform: 'translate(-50%, -50%)',
              color: textStyles.eventNameColor,
              fontSize: '0.75rem',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
            onMouseDown={(e) => handleDragStart('eventName', e)}
          >
            {badgePreview.eventName}
          </div>
        )}

        {/* DateTime */}
        {badgeConfig.fields?.showDateTime && (
          <div
            className={`absolute whitespace-nowrap ${isVisualEditorMode ? 'cursor-move hover:ring-1 hover:ring-white/50' : ''} ${draggingElement === 'dateTime' ? 'ring-2 ring-cyan-400 z-50' : ''}`}
            style={{
              left: `${elementPositions.dateTime?.x || 50}%`,
              top: `${elementPositions.dateTime?.y || 68}%`,
              transform: 'translate(-50%, -50%)',
              color: textStyles.dateTimeColor,
              fontSize: '0.65rem',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}
            onMouseDown={(e) => handleDragStart('dateTime', e)}
          >
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {badgePreview.date}
            </div>
          </div>
        )}

        {/* QR Code */}
        {badgeConfig.qrCode?.enabled && (
          <div
            className={`absolute bg-white p-1.5 rounded-lg shadow-md ${isVisualEditorMode ? 'cursor-move hover:ring-1 hover:ring-white/50' : ''} ${draggingElement === 'qrCode' ? 'ring-2 ring-cyan-400 z-50' : ''}`}
            style={{
              left: `${elementPositions.qrCode?.x || 50}%`,
              top: `${elementPositions.qrCode?.y || 85}%`,
              transform: 'translate(-50%, -50%)',
              width: `${badgeConfig.qrCode?.size === 'small' ? 14 : badgeConfig.qrCode?.size === 'large' ? 24 : 18}%`,
              height: `${badgeConfig.qrCode?.size === 'small' ? 14 : badgeConfig.qrCode?.size === 'large' ? 24 : 18}%`,
            }}
            onMouseDown={(e) => handleDragStart('qrCode', e)}
          >
            <QrCode className="w-full h-full text-black" />
          </div>
        )}
      </div>
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
