import React, { useState, useRef, useEffect, useMemo } from "react";
import { BadgeTemplateConfig, CustomElementPositions, DEFAULT_ELEMENT_POSITIONS } from "@/components/templates/BadgeTemplateEditor";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Move, RotateCcw, User, Grid3X3, Maximize2, QrCode, Image as ImageIcon, ChevronDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface BadgeVisualEditorProps {
  config: BadgeTemplateConfig;
  onChange: (config: BadgeTemplateConfig) => void;
  eventName?: string;
  albumCode?: string;
  className?: string;
}

const EXAMPLE_PHOTOS = [
  { label: 'Placeholder (Default)', value: '', ratio: '1:1' },
  { label: 'Portrait (9:16)', value: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1964&auto=format&fit=crop', ratio: '9:16' },
  { label: 'Landscape (16:9)', value: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=2574&auto=format&fit=crop', ratio: '16:9' },
  { label: 'Square (1:1)', value: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=1887&auto=format&fit=crop', ratio: '1:1' },
  { label: 'Group Photo', value: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2532&auto=format&fit=crop', ratio: '4:3' },
];

export function BadgeVisualEditor({
  config,
  onChange,
  eventName = "Event Name",
  albumCode = "SAMPLE-CODE",
  className,
}: BadgeVisualEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [resizingElement, setResizingElement] = useState<string | null>(null);
  
  // Store drag offsets to prevent jumping
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const [showGrid, setShowGrid] = useState(false);
  const [scale, setScale] = useState(1);
  const [examplePhoto, setExamplePhoto] = useState<string>('');
  
  const [elementPositions, setElementPositions] = useState<CustomElementPositions>(
    config.customPositions || DEFAULT_ELEMENT_POSITIONS
  );

  // Sync local state when config changes externally
  useEffect(() => {
    if (config.customPositions) {
      setElementPositions(config.customPositions);
    }
  }, [config.customPositions]);

  // Badge Dimensions
  const aspectRatioStyles = useMemo(() => ({
    portrait: { width: 300, height: 400 }, // 3:4
    landscape: { width: 400, height: 300 }, // 4:3
    square: { width: 350, height: 350 }, // 1:1
  }), []);
  
  const dims = aspectRatioStyles[config.layout];

  // Handle auto-scaling to fit container
  useEffect(() => {
    const updateScale = () => {
      if (!editorRef.current) return;
      
      const parent = editorRef.current;
      const parentWidth = parent.clientWidth;
      const parentHeight = parent.clientHeight;
      const padding = 48; // Space for UI elements (more padding for comfort)
      
      const badgeDims = aspectRatioStyles[config.layout];
      
      // Calculate max scale that fits in parent with padding
      const scaleX = (parentWidth - padding) / badgeDims.width;
      const scaleY = (parentHeight - padding) / badgeDims.height;
      
      // Use the smaller scale to fit entirely
      // Cap at 1.5x to avoid blurriness, min 0.4x for visibility
      const newScale = Math.min(Math.min(scaleX, scaleY), 1.5);
      setScale(Math.max(newScale, 0.4));
    };

    // Initial calculation
    updateScale();
    
    // Add resize listener
    const observer = new ResizeObserver(updateScale);
    if (editorRef.current) {
      observer.observe(editorRef.current);
    }
    
    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      observer.disconnect();
    };
  }, [config.layout, editorRef.current, aspectRatioStyles]);

  const handleDragStart = (element: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!containerRef.current) return;
    
    // Calculate the offset between mouse and element center
    // This ensures the element doesn't jump to center on mouse cursor
    const currentPos = elementPositions[element as keyof CustomElementPositions];
    const rect = containerRef.current.getBoundingClientRect();
    
    // Current element center in pixels relative to viewport
    // x is percentage from left, y is percentage from top
    const elementCenterX = rect.left + (currentPos?.x || 50) / 100 * rect.width;
    const elementCenterY = rect.top + (currentPos?.y || 50) / 100 * rect.height;
    
    // Offset from center
    const offsetX = e.clientX - elementCenterX;
    const offsetY = e.clientY - elementCenterY;
    
    setDragOffset({ x: offsetX, y: offsetY });
    setDraggingElement(element);
  };

  const handleResizeStart = (element: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setResizingElement(element);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if ((!draggingElement && !resizingElement) || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    
    // DRAGGING
    if (draggingElement) {
      // Calculate new position subtracting the initial offset
      // This keeps the mouse relative position to element constant
      const targetX = e.clientX - dragOffset.x;
      const targetY = e.clientY - dragOffset.y;
      
      // Convert to percentage relative to container
      let x = ((targetX - rect.left) / rect.width) * 100;
      let y = ((targetY - rect.top) / rect.height) * 100;

      // Clamp to 0-100
      x = Math.max(0, Math.min(100, x));
      y = Math.max(0, Math.min(100, y));

      setElementPositions((prev) => ({
        ...prev,
        [draggingElement]: { ...prev[draggingElement as keyof CustomElementPositions], x, y },
      }));
    }

    // RESIZING
    if (resizingElement) {
       const currentPos = elementPositions[resizingElement as keyof CustomElementPositions];
       if (!currentPos) return;

       // Check if it's a text element (resize font) or box element (resize width)
       const isText = ['name', 'eventName', 'dateTime', 'albumCode', 'customField1', 'customField2'].includes(resizingElement);

       if (isText) {
         // For text, we change fontSize
         // We can use distance from center to determine scale
         // Center X in pixels
         const centerX = rect.left + (currentPos.x / 100) * rect.width;
         // Mouse distance from center X
         const dist = Math.abs(e.clientX - centerX);
         // Convert to a percentage of badge width roughly
         // Base font size is roughly 6% height. 
         // Let's scale fontSize proportional to width changes.
         // Dist * 2 is width in pixels if centered.
         // Width% = (dist * 2 / rect.width) * 100.
         
         // Map width% directly to a reasonable font size range
         // e.g. 50% width -> ~5% font size
         const widthPercent = (dist * 2 / rect.width) * 100;
         const newFontSize = Math.max(1, Math.min(20, widthPercent / 8)); // heuristic divider
         
         setElementPositions((prev) => ({
          ...prev,
          [resizingElement]: { ...prev[resizingElement as keyof CustomElementPositions], fontSize: newFontSize },
        }));
       } else {
         // Box resizing (QR, Photo)
         // Calculate new width based on mouse position relative to element's start (center)
         
         // Get mouse pos in percentage
         let mouseX = ((e.clientX - rect.left) / rect.width) * 100;
         
         // Width is roughly: (MouseX - CenterX) * 2 if dragging right edge
         let newWidth = Math.abs(mouseX - currentPos.x) * 2;
         
         // Constrain min size
         newWidth = Math.max(5, Math.min(100, newWidth));

         setElementPositions((prev) => ({
          ...prev,
          [resizingElement]: { ...prev[resizingElement as keyof CustomElementPositions], width: newWidth },
        }));
       }
    }
  };

  const handleMouseUp = () => {
    if (draggingElement || resizingElement) {
      // Commit changes to parent config on drag/resize end
      onChange({
        ...config,
        useCustomPositions: true,
        customPositions: elementPositions,
      });
      setDraggingElement(null);
      setResizingElement(null);
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const resetPositions = () => {
    const reset = { ...DEFAULT_ELEMENT_POSITIONS };
    setElementPositions(reset);
    onChange({
      ...config,
      useCustomPositions: false,
      customPositions: reset,
    });
  };

  // Helper to get element size (percentage) ensuring aspect ratio for QR/Photo
  const getElementSize = (type: 'photo' | 'qrCode', fallbackSize: number) => {
    const pos = elementPositions[type];
    const widthPercent = pos?.width || fallbackSize;
    
    // Calculate height percentage that maintains 1:1 aspect ratio
    // H_px = W_px
    // H_% * BadgeH = W_% * BadgeW
    // H_% = W_% * (BadgeW / BadgeH)
    const badgeRatio = dims.width / dims.height;
    const heightPercent = widthPercent * badgeRatio;
    
    return { width: `${widthPercent}%`, height: `${heightPercent}%` };
  };

  // Mock data for preview with real current date/time
  const now = new Date();
  const previewData = {
    name: "John Doe",
    date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    eventName: eventName,
    albumCode: albumCode,
  };
  // Show date and time on separate lines or combined based on layout
  const dateTimeText = `${previewData.date}\n${previewData.time}`;

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/2c70787a-617e-4831-a3a3-a75ccfa621a2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'BadgeVisualEditor.tsx:dateTime',message:'Rendering date/time element',data:{dateTimeText,showDateTime:config.fields.showDateTime,layout:config.layout,badgeWidth:dims.width},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  const renderResizeHandle = (element: string) => (
    <div 
      className="absolute bottom-0 right-0 w-6 h-6 bg-white/10 hover:bg-white/90 rounded-full cursor-se-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2 translate-y-1/2 border border-black/10 shadow-sm z-50"
      onMouseDown={(e) => handleResizeStart(element, e)}
    >
      <Maximize2 className="w-3 h-3 text-black" />
    </div>
  );

  return (
    <Card className={cn("flex flex-col overflow-hidden bg-zinc-950 border-zinc-800 h-full w-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-zinc-900/50 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 gap-1">
            <Move className="w-3 h-3" /> Visual Editor
          </Badge>
          
          {/* Example Photo Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-zinc-400 hover:text-white text-xs ml-2">
                <ImageIcon className="w-3.5 h-3.5" />
                Preview Photo
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-zinc-900 border-zinc-800">
              {EXAMPLE_PHOTOS.map((photo) => (
                <DropdownMenuItem 
                  key={photo.label} 
                  onClick={() => setExamplePhoto(photo.value)}
                  className="text-zinc-300 focus:text-white focus:bg-zinc-800 cursor-pointer"
                >
                  <span className="w-20">{photo.label}</span>
                  <Badge variant="secondary" className="ml-2 text-[10px] bg-zinc-800 text-zinc-500">{photo.ratio}</Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowGrid(!showGrid)}
                  className={cn("h-7 w-7", showGrid ? "text-indigo-400 bg-indigo-500/10" : "text-zinc-400")}
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Grid</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={resetPositions} className="h-7 w-7 text-zinc-400 hover:text-white">
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset Layout</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Editor Area */}
      <div 
        ref={editorRef}
        className="flex-1 bg-zinc-900/30 p-4 flex items-center justify-center relative overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={containerRef}
          className={cn(
            "relative shadow-2xl transition-all bg-white origin-center will-change-transform",
            config.photoPlacement.shape === 'circle' ? "" : "rounded-xl",
            showGrid && "after:absolute after:inset-0 after:bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] after:bg-[size:20px_20px] after:pointer-events-none"
          )}
          style={{
            width: dims.width,
            height: dims.height,
            transform: `scale(${scale})`,
            backgroundColor: config.backgroundColor || '#1e293b',
            backgroundImage: config.backgroundUrl ? `url(${config.backgroundUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Draggable Elements */}
          
          {/* Photo */}
          <div
            className={cn(
              "absolute flex items-center justify-center group cursor-move z-10",
              draggingElement === 'photo' && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent z-50",
              resizingElement === 'photo' && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent z-50"
            )}
            style={{
              left: `${elementPositions.photo?.x || 50}%`,
              top: `${elementPositions.photo?.y || 20}%`,
              transform: 'translate(-50%, -50%)',
              ...getElementSize('photo', config.photoPlacement?.size === 'small' ? 25 : config.photoPlacement?.size === 'large' ? 45 : 35)
            }}
            onMouseDown={(e) => handleDragStart('photo', e)}
          >
            <div className={cn(
              "w-full h-full bg-zinc-200 border-2 border-white/30 overflow-hidden shadow-lg relative",
              config.photoPlacement?.shape === 'circle' && "rounded-full",
              config.photoPlacement?.shape === 'rounded' && "rounded-xl",
              config.photoPlacement?.shape === 'square' && "rounded-none"
            )}>
              {examplePhoto ? (
                <img 
                  src={examplePhoto} 
                  alt="Example subject" 
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 text-zinc-300">
                  <User className="w-1/2 h-1/2" />
                </div>
              )}
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/10 transition-colors flex items-center justify-center">
                <Move className="w-4 h-4 text-indigo-500 opacity-0 group-hover:opacity-100" />
              </div>
            </div>
            
            {renderResizeHandle('photo')}
          </div>

          {/* Name */}
          {config.fields.showName && (
            <div
              className={cn(
                "absolute whitespace-nowrap cursor-move group border border-transparent hover:border-indigo-500/50 px-2 py-1 rounded z-20",
                draggingElement === 'name' && "border-indigo-500 bg-indigo-500/10 z-50"
              )}
              style={{
                left: `${elementPositions.name?.x || 50}%`,
                top: `${elementPositions.name?.y || 55}%`,
                transform: elementPositions.name?.textAlign === 'left' 
                  ? 'translate(0, -50%)' 
                  : elementPositions.name?.textAlign === 'right'
                    ? 'translate(-100%, -50%)'
                    : 'translate(-50%, -50%)',
                color: config.textStyle?.nameColor || '#ffffff',
                fontFamily: config.textStyle?.fontFamily,
                fontSize: `${(elementPositions.name?.fontSize || config.textStyle?.nameFontSize || 6) * 3}px`, 
                fontWeight: 'bold',
              }}
              onMouseDown={(e) => handleDragStart('name', e)}
            >
              {previewData.name}
              {renderResizeHandle('name')}
            </div>
          )}

          {/* Event Name */}
          {config.fields.showEventName && (
            <div
              className={cn(
                "absolute whitespace-nowrap cursor-move group border border-transparent hover:border-indigo-500/50 px-2 py-1 rounded z-20",
                draggingElement === 'eventName' && "border-indigo-500 bg-indigo-500/10 z-50"
              )}
              style={{
                left: `${elementPositions.eventName?.x || 50}%`,
                top: `${elementPositions.eventName?.y || 62}%`,
                transform: elementPositions.eventName?.textAlign === 'left' 
                  ? 'translate(0, -50%)' 
                  : elementPositions.eventName?.textAlign === 'right'
                    ? 'translate(-100%, -50%)'
                    : 'translate(-50%, -50%)',
                color: config.textStyle?.eventNameColor || 'rgba(255,255,255,0.8)',
                fontSize: `${(elementPositions.eventName?.fontSize || config.textStyle?.eventNameFontSize || 3.5) * 3}px`,
              }}
              onMouseDown={(e) => handleDragStart('eventName', e)}
            >
              {previewData.eventName}
              {renderResizeHandle('eventName')}
            </div>
          )}

          {/* Date Time */}
          {config.fields.showDateTime && (
            <div
              className={cn(
                "absolute cursor-move group border border-transparent hover:border-indigo-500/50 px-2 py-1 rounded z-20",
                draggingElement === 'dateTime' && "border-indigo-500 bg-indigo-500/10 z-50"
              )}
              style={{
                left: `${elementPositions.dateTime?.x || 50}%`,
                top: `${elementPositions.dateTime?.y || 68}%`,
                transform: elementPositions.dateTime?.textAlign === 'left' 
                  ? 'translate(0, -50%)' 
                  : elementPositions.dateTime?.textAlign === 'right'
                    ? 'translate(-100%, -50%)'
                    : 'translate(-50%, -50%)',
                color: config.textStyle?.dateTimeColor || 'rgba(255,255,255,0.6)',
                fontSize: `${(elementPositions.dateTime?.fontSize || config.textStyle?.dateTimeFontSize || 2.8) * 3}px`,
                textAlign: elementPositions.dateTime?.textAlign || 'center',
              }}
              onMouseDown={(e) => handleDragStart('dateTime', e)}
            >
              <div>{previewData.date}</div>
              <div>{previewData.time}</div>
              {renderResizeHandle('dateTime')}
            </div>
          )}

          {/* Album Code */}
          {config.fields.showAlbumCode && (
            <div
              className={cn(
                "absolute whitespace-nowrap cursor-move group border border-transparent hover:border-indigo-500/50 px-2 py-1 rounded z-20",
                draggingElement === 'albumCode' && "border-indigo-500 bg-indigo-500/10 z-50"
              )}
              style={{
                left: `${elementPositions.albumCode?.x || 50}%`,
                top: `${elementPositions.albumCode?.y || 75}%`,
                transform: elementPositions.albumCode?.textAlign === 'left' 
                  ? 'translate(0, -50%)' 
                  : elementPositions.albumCode?.textAlign === 'right'
                    ? 'translate(-100%, -50%)'
                    : 'translate(-50%, -50%)',
                color: config.textStyle?.dateTimeColor || 'rgba(255,255,255,0.6)',
                fontSize: `${(elementPositions.albumCode?.fontSize || config.textStyle?.dateTimeFontSize || 2.8) * 3}px`,
                fontFamily: config.textStyle?.fontFamily,
              }}
              onMouseDown={(e) => handleDragStart('albumCode', e)}
            >
              {previewData.albumCode}
              {renderResizeHandle('albumCode')}
            </div>
          )}

          {/* QR Code */}
          {config.qrCode.enabled && (
            <div
              className={cn(
                "absolute cursor-move group bg-white p-1 rounded-md shadow-sm z-20",
                draggingElement === 'qrCode' && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent z-50",
                resizingElement === 'qrCode' && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent z-50"
              )}
              style={{
                left: `${elementPositions.qrCode?.x || 50}%`,
                top: `${elementPositions.qrCode?.y || 88}%`,
                transform: 'translate(-50%, -50%)',
                ...getElementSize('qrCode', config.qrCode.size === 'small' ? 15 : config.qrCode.size === 'large' ? 25 : 20)
              }}
              onMouseDown={(e) => handleDragStart('qrCode', e)}
            >
              <div className="w-full h-full relative">
                 <QrCode className="w-full h-full text-black" />
                 <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/10 transition-colors" />
              </div>
              
              {renderResizeHandle('qrCode')}
            </div>
          )}

          {/* Bleed Lines (Optional Visual Guide) */}
          <div className="absolute inset-0 border border-dashed border-red-500/30 pointer-events-none m-1" />
        </div>
      </div>
    </Card>
  );
}
