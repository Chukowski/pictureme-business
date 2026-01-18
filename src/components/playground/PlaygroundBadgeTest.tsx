import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Sparkles, Loader2,
  Save, QrCode, Camera, Move, RotateCcw, User, Calendar, Type, Palette,
  Smartphone, Monitor, Tablet, Grid3X3,
  ZoomIn, ZoomOut, History, Download, Image as ImageIcon,
  Eraser, Minimize2, ChevronDown, ChevronUp, Maximize2, PanelRight, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { User as UserType, EventConfig, updateEvent } from "@/services/eventsApi";
import { processImageWithAI, downloadImageAsBase64 } from "@/services/aiProcessor";
import { BadgeTemplateConfig, CustomElementPositions, DEFAULT_ELEMENT_POSITIONS } from "@/components/templates/BadgeTemplateEditor";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePlayground } from "./PlaygroundContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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
  const { setPreview, setPreviewToolbar, triggerNewAsset } = usePlayground();
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

  const [history, setHistory] = useState<string[]>([]);
  const [activeRightTab, setActiveRightTab] = useState<'preview' | 'history'>('preview');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);

  // Derived State
  const selectedEvent = events.find(e => e._id === selectedEventId);
  const badgeConfig = selectedEvent?.badgeTemplate || { enabled: false } as BadgeTemplateConfig;

  useEffect(() => {
    if (selectedEvent?.badgeTemplate?.positions) {
      setElementPositions(selectedEvent.badgeTemplate.positions);
    }
    if (selectedEvent) {
      setBadgePreview(prev => ({ ...prev, eventName: selectedEvent.title }));
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
    if (!testImageBase64 || testImageBase64.length < 100) {
      toast.error("Please upload or select a test image first");
      return;
    }

    if (!badgeConfig.aiPipeline?.enabled) {
      toast.error("AI Pipeline is not enabled for this badge template");
      return;
    }

    setIsBadgeProcessing(true);
    try {
      console.log("🎨 Processing badge with AI, image length:", testImageBase64.length);

      const result = await processImageWithAI({
        userPhotoBase64: testImageBase64,
        backgroundPrompt: badgeConfig.aiPipeline.prompt || "Enhance this portrait photo, professional lighting, clear background",
        aiModel: badgeConfig.aiPipeline.model || "fal-ai/nano-banana/edit",
        aspectRatio: "1:1" as any,
        includeBranding: false,
        eventId: selectedEvent?.postgres_event_id,
        eventSlug: selectedEvent?.slug,
        userSlug: selectedEvent?.user_slug,
        billingContext: 'playground-badge',
      });

      const outputUrl = result.imageUrl
        || (result as any).processedImageUrl
        || (result as any).url;

      if (!outputUrl) {
        throw new Error("AI returned no image URL");
      }

      setBadgeProcessedImage(outputUrl);
      setHistory(prev => [outputUrl, ...prev]);
      triggerNewAsset(true);
      toast.success("Badge photo enhanced!");
    } catch (error: any) {
      console.error("Badge AI Processing error:", error);
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
      <Card className="bg-card/50 border-white/10 overflow-hidden shadow-lg">
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
      <Card className="bg-card/50 border-white/10 overflow-hidden shadow-lg">
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
      <Card className="bg-card/50 border-white/10 overflow-hidden shadow-lg">
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
  const [isHudExpanded, setIsHudExpanded] = useState(true);

  const CanvasOverlay = (
    <div className="absolute inset-0 pointer-events-none z-10">
      <motion.div
        drag
        initial={{ top: 16, right: 16 }}
        whileDrag={{ scale: 1.02, cursor: "grabbing" }}
        className="absolute pointer-events-auto z-50"
      >
        <div className={cn(
          "bg-[#101112]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/5 transition-all duration-300",
          isHudExpanded ? "w-80" : "w-auto"
        )}>
          {/* Header */}
          <div className={cn(
            "px-4 py-2 flex items-center justify-between bg-black/40 backdrop-blur-md cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors",
            !isHudExpanded && "border-0"
          )}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              {isHudExpanded && (
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
                  {isVisualEditorMode ? 'Visual Editor' : 'Live Preview'}
                </span>
              )}
              {!isHudExpanded && (
                <div className="flex items-center gap-3 pr-2">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Badge Editor</span>
                  <div className="w-px h-4 bg-white/10" />
                  <span className="text-[10px] text-zinc-500">{isVisualEditorMode ? 'Editing' : 'Previewing'}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg"
                onClick={() => setIsHudExpanded(!isHudExpanded)}
              >
                {isHudExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>

              {isHudExpanded && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6 rounded-lg",
                    isVisualEditorMode ? "text-cyan-400 bg-cyan-500/10" : "text-zinc-500 hover:text-white hover:bg-white/5"
                  )}
                  onClick={() => setIsVisualEditorMode(!isVisualEditorMode)}
                  title={isVisualEditorMode ? "Exit Editor" : "Enter Visual Editor"}
                >
                  <Move className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          <motion.div
            initial={false}
            animate={{ height: isHudExpanded ? "auto" : 0, opacity: isHudExpanded ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {isVisualEditorMode ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 bg-[#101112]/30 p-1.5 rounded border border-white/5">
                      <Type className="w-3 h-3 text-zinc-500" />
                      <input type="color" value={textStyles.nameColor} onChange={e => setTextStyles(p => ({ ...p, nameColor: e.target.value }))} className="w-4 h-4 rounded border-0 bg-transparent cursor-pointer flex-1" />
                    </div>
                    <div className="flex items-center gap-2 bg-[#101112]/30 p-1.5 rounded border border-white/5">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      <input type="color" value={textStyles.dateTimeColor} onChange={e => setTextStyles(p => ({ ...p, dateTimeColor: e.target.value }))} className="w-4 h-4 rounded border-0 bg-transparent cursor-pointer flex-1" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={savePositionsToTemplate} disabled={isSavingPositions} className="flex-1 h-8 text-[10px] bg-cyan-600 hover:bg-cyan-700">
                      {isSavingPositions ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                      Save Template
                    </Button>
                    <Button size="sm" variant="outline" onClick={resetPositions} className="h-8 w-8 p-0 border-white/10 text-zinc-400">
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-[10px] text-zinc-500">Live preview of current settings.</p>
                  <p className="text-[10px] text-zinc-600 mt-1">Enable Editor to adjust layout.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );

  // --- Right Panel Content (Badge Preview) ---
  const PreviewPanel = (
    <div
      className="h-full flex flex-col items-center justify-center bg-card/50 relative overflow-hidden"
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

  // --- Right Sidebar Content ---
  useEffect(() => {
    const Toolbar = (
      <div className="flex items-center justify-between w-full px-1">
        <div className="flex items-center bg-card p-0.5 rounded-lg border border-white/5">
          <button
            onClick={() => setActiveRightTab('preview')}
            className={cn(
              "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
              activeRightTab === 'preview' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Badge Designer
          </button>
          <button
            onClick={() => setActiveRightTab('history')}
            className={cn(
              "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
              activeRightTab === 'history' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Generated Assets
          </button>
        </div>

        {activeRightTab === 'preview' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-card rounded-lg p-0.5 border border-white/5">
              <button onClick={() => setPreviewDevice('mobile')} className={cn("p-1 rounded", previewDevice === 'mobile' ? "bg-zinc-700 text-white" : "text-zinc-500")}><Smartphone className="w-3.5 h-3.5" /></button>
              <button onClick={() => setPreviewDevice('tablet')} className={cn("p-1 rounded", previewDevice === 'tablet' ? "bg-zinc-700 text-white" : "text-zinc-500")}><Tablet className="w-3.5 h-3.5" /></button>
              <button onClick={() => setPreviewDevice('desktop')} className={cn("p-1 rounded", previewDevice === 'desktop' ? "bg-zinc-700 text-white" : "text-zinc-500")}><Monitor className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom(z => Math.max(z - 10, 50))} className="text-zinc-500 hover:text-white"><ZoomOut className="w-3.5 h-3.5" /></button>
              <span className="text-[10px] text-zinc-500 w-8 text-center font-mono">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(z + 10, 150))} className="text-zinc-500 hover:text-white"><ZoomIn className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        )}
      </div>
    );

    const Preview = (
      <div className="h-full flex flex-col relative group">
        {activeRightTab === 'preview' ? (
          <div className="flex-1 flex flex-col relative">
            {CanvasOverlay}
            <div className={cn(
              "flex-1 flex items-center justify-center relative overflow-hidden bg-[#050505] transition-all duration-500",
              showGrid && "bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:20px_20px]"
            )}>
              <div
                className="transition-transform duration-300 ease-out origin-center"
                style={{ transform: `scale(${zoom / 100})` }}
              >
                <div className={cn(
                  "relative bg-[#101112] border-[8px] border-zinc-800 shadow-2xl overflow-hidden transition-all duration-500",
                  previewDevice === 'mobile' ? "w-[375px] h-[812px] rounded-[3.5rem]" :
                    previewDevice === 'tablet' ? "w-[768px] h-[1024px] rounded-[2rem]" :
                      "w-[1280px] h-[800px] rounded-xl border-[12px]" // Desktop
                )}>
                  {/* Notch / Header for Mobile */}
                  {previewDevice === 'mobile' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-zinc-800 rounded-b-2xl z-50 flex items-center justify-center">
                      <div className="w-16 h-1 rounded-full bg-[#101112]/40" />
                    </div>
                  )}

                  <div className="w-full h-full bg-card overflow-hidden">
                    {PreviewPanel}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6 bg-card overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                Generated Assets
              </h3>
              <span className="text-[10px] text-zinc-500">{history.length} assets created</span>
            </div>

            {history.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {history.map((url, i) => (
                  <div key={i} className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-cyan-500/50 transition-all shadow-lg hover:shadow-cyan-500/10">
                    <img src={url} alt={`Result ${i}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                      <Button size="sm" variant="secondary" className="h-8 w-full text-[10px] bg-white text-black hover:bg-zinc-200" onClick={() => {
                        setBadgeProcessedImage(url);
                        setActiveRightTab('preview');
                      }}>
                        Apply to Preview
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 w-full text-[10px] border-white/20 text-white" onClick={() => window.open(url, '_blank')}>
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[50dvh] text-center px-6">
                <div className="w-16 h-16 rounded-3xl bg-zinc-800/50 flex items-center justify-center mb-6 border border-white/5">
                  <ImageIcon className="w-8 h-8 opacity-20" />
                </div>
                <h4 className="text-white font-medium mb-1">No Assets Yet</h4>
                <p className="text-xs text-zinc-500 max-w-[200px]">Enhanced photos will appear here as you generate them.</p>
              </div>
            )}
          </div>
        )}
      </div>
    );

    setPreview(Preview);
    setPreviewToolbar(Toolbar);
  }, [setPreview, setPreviewToolbar, PreviewPanel, CanvasOverlay, previewDevice, zoom, showGrid, activeRightTab, history, badgeConfig]);

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10">
      {ControlsPanel}
    </div>
  );
}
