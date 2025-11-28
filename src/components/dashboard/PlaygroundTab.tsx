/**
 * PlaygroundTab Component
 * 
 * A testing environment for business users to:
 * - Preview and test event configurations
 * - Test templates with REAL AI processing (uses tokens)
 * - Preview and test badge designs with AI
 * - Test the photo booth flow
 * 
 * ⚠️ WARNING: All AI processing uses REAL tokens!
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { ENV } from "@/config/env";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Gamepad2,
  Camera,
  Image,
  QrCode,
  Play,
  RefreshCw,
  Download,
  Eye,
  Loader2,
  CheckCircle2,
  Upload,
  Palette,
  User,
  Calendar,
  Wand2,
  Monitor,
  Smartphone,
  ExternalLink,
  AlertTriangle,
  Coins,
  Copy,
  Check,
  Link2,
  Sparkles,
  X,
} from "lucide-react";
import { User as UserType, getUserEvents, EventConfig, Template, updateEvent } from "@/services/eventsApi";
import { processImageWithAI, downloadImageAsBase64, AI_MODELS, type AIModelKey } from "@/services/aiProcessor";
import { toast } from "sonner";
import { BadgeTemplateConfig, DEFAULT_BADGE_CONFIG, CustomElementPositions, DEFAULT_ELEMENT_POSITIONS } from "@/components/templates/BadgeTemplateEditor";
import { Move, Save, RotateCcw, Maximize2, MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { PromptHelper } from "@/components/PromptHelper";
import { Switch } from "@/components/ui/switch";

interface PlaygroundTabProps {
  currentUser: UserType;
}

// Sample test images for template testing - Individual portraits
const SAMPLE_IMAGES_INDIVIDUAL = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face",
];

// Sample test images for template testing - Group photos
const SAMPLE_IMAGES_GROUP = [
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop", // Group of friends
  "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&h=400&fit=crop", // Three women
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop", // Team meeting
  "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&h=400&fit=crop", // Family
];

// Combined for backwards compatibility
const SAMPLE_IMAGES = SAMPLE_IMAGES_INDIVIDUAL;

type PlaygroundMode = 'event' | 'template' | 'badge' | 'booth';
type ProcessingStatus = 'idle' | 'queued' | 'processing' | 'applying_branding' | 'complete' | 'error';

export default function PlaygroundTab({ currentUser }: PlaygroundTabProps) {
  const [mode, setMode] = useState<PlaygroundMode>('template');
  const [events, setEvents] = useState<EventConfig[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [testImage, setTestImage] = useState<string | null>(null);
  const [testImageBase64, setTestImageBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processedResult, setProcessedResult] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [tokensUsed, setTokensUsed] = useState(0);
  
  // Badge preview state
  const [badgePreview, setBadgePreview] = useState({
    name: 'John Doe',
    eventName: 'Sample Event',
    date: new Date().toLocaleDateString(),
    customField1: '',
    customField2: '',
  });
  const [badgeProcessedImage, setBadgeProcessedImage] = useState<string | null>(null);
  const [isBadgeProcessing, setIsBadgeProcessing] = useState(false);
  
  // Visual Editor state
  const [isVisualEditorMode, setIsVisualEditorMode] = useState(false);
  const [elementPositions, setElementPositions] = useState<CustomElementPositions>({ ...DEFAULT_ELEMENT_POSITIONS });
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [isSavingPositions, setIsSavingPositions] = useState(false);
  
  // Text style state for visual editor
  const [textStyles, setTextStyles] = useState({
    nameColor: '#ffffff',
    eventNameColor: 'rgba(255,255,255,0.8)',
    dateTimeColor: 'rgba(255,255,255,0.6)',
  });

  // AI Model selection
  const [selectedAiModel, setSelectedAiModel] = useState<AIModelKey>('nanoBanana');
  
  // Group photo toggle
  const [isGroupPhoto, setIsGroupPhoto] = useState(false);
  
  // Custom prompt mode
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const badgePreviewRef = useRef<HTMLDivElement>(null);
  const badgeEditorRef = useRef<HTMLDivElement>(null);
  const badgeSettingsInputRef = useRef<HTMLInputElement>(null);

  // Derived state
  const selectedEvent = events.find(e => e._id === selectedEventId) || null;
  const templates = selectedEvent?.templates?.filter(t => t.active) || [];
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || null;
  const badgeConfig: BadgeTemplateConfig = (selectedEvent as any)?.badgeTemplate || DEFAULT_BADGE_CONFIG;

  // Load events
  useEffect(() => {
    loadEvents();
  }, []);

  // Auto-select first event and template
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0]._id);
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    } else if (templates.length === 0) {
      setSelectedTemplateId('');
    }
  }, [templates, selectedTemplateId]);

  // Update badge preview when event changes
  useEffect(() => {
    if (selectedEvent) {
      setBadgePreview(prev => ({
        ...prev,
        eventName: selectedEvent.title,
      }));
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const data = await getUserEvents();
      setEvents(data);
    } catch (error) {
      console.error("Error loading events:", error);
      toast.error("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  };

  // Get proxied URL for S3 images to bypass CORS
  const getProxiedUrl = (url: string): string => {
    const s3Patterns = [
      's3.amazonaws.com/pictureme.now',
      'pictureme.now.s3.amazonaws.com'
    ];
    
    const needsProxy = s3Patterns.some(pattern => url.includes(pattern));
    
    if (needsProxy) {
      const apiUrl = ENV.API_URL || '';
      return `${apiUrl}/api/proxy/image?url=${encodeURIComponent(url)}`;
    }
    
    return url;
  };

  // Convert image URL to base64
  const imageUrlToBase64 = async (url: string): Promise<string> => {
    const proxiedUrl = getProxiedUrl(url);
    
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = proxiedUrl;
    });
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setTestImage(base64);
        setTestImageBase64(base64);
        setProcessedResult(null);
        setBadgeProcessedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Use sample image
  const useSampleImage = async (url: string) => {
    setTestImage(url);
    setProcessedResult(null);
    setBadgeProcessedImage(null);
    try {
      const base64 = await imageUrlToBase64(url);
      setTestImageBase64(base64);
    } catch (error) {
      console.error('Failed to convert image to base64:', error);
      toast.error('Failed to load sample image');
    }
  };

  // Process image with REAL AI
  const processWithAI = async () => {
    if (!testImageBase64 || !selectedTemplate) {
      toast.error("Please select an image and template first");
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('queued');
    setProcessingProgress(10);
    setProcessedResult(null);

    try {
      toast.info("Starting AI processing... This will use tokens.", { duration: 3000 });

      // Determine which prompt to use:
      // 1. Custom prompt if enabled and not empty
      // 2. Group prompt if group mode and available
      // 3. Template's default prompt
      let promptToUse: string;
      if (useCustomPrompt && customPrompt.trim()) {
        promptToUse = customPrompt;
      } else if (isGroupPhoto && selectedTemplate.groupPrompt) {
        promptToUse = selectedTemplate.groupPrompt;
      } else {
        promptToUse = selectedTemplate.prompt || 'Create a professional photo';
      }
      
      const result = await processImageWithAI({
        userPhotoBase64: testImageBase64,
        backgroundPrompt: promptToUse,
        backgroundImageUrls: selectedTemplate.images || [],
        includeBranding: false,
        aspectRatio: selectedTemplate.aspectRatio || '9:16',
        aiModel: selectedTemplate.pipelineConfig?.imageModel || AI_MODELS[selectedAiModel].id,
        onProgress: (status) => {
          if (status === 'queued') {
            setProcessingStatus('queued');
            setProcessingProgress(20);
          } else if (status === 'processing') {
            setProcessingStatus('processing');
            setProcessingProgress(60);
          } else if (status === 'applying_branding') {
            setProcessingStatus('applying_branding');
            setProcessingProgress(85);
          }
        },
      });

      setProcessingStatus('complete');
      setProcessingProgress(100);

      // Get the result as base64 if needed
      let finalImage: string;
      if (result.url.startsWith('data:')) {
        finalImage = result.url;
      } else {
        finalImage = await downloadImageAsBase64(result.url);
      }

      setProcessedResult(finalImage);
      setTokensUsed(prev => prev + 1);
      toast.success("AI processing complete! 🎉");

    } catch (error) {
      console.error('AI processing error:', error);
      setProcessingStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Failed to process image';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process badge with AI
  const processBadgeWithAI = async () => {
    if (!testImageBase64) {
      toast.error("Please select or capture a photo first");
      return;
    }

    if (!badgeConfig.aiPipeline?.enabled) {
      toast.error("AI pipeline is not enabled for badges in this event");
      return;
    }

    setIsBadgeProcessing(true);
    
    try {
      toast.info("Processing badge photo with AI...", { duration: 3000 });

      const result = await processImageWithAI({
        userPhotoBase64: testImageBase64,
        backgroundPrompt: badgeConfig.aiPipeline.prompt || 'Create a professional portrait photo',
        backgroundImageUrls: badgeConfig.aiPipeline.referenceImages || [],
        includeBranding: false,
        aspectRatio: badgeConfig.layout === 'landscape' ? '16:9' : badgeConfig.layout === 'square' ? '1:1' : '9:16',
        aiModel: badgeConfig.aiPipeline.model || AI_MODELS[selectedAiModel].id,
        onProgress: (status) => {
          console.log('Badge processing status:', status);
        },
      });

      let finalImage: string;
      if (result.url.startsWith('data:')) {
        finalImage = result.url;
      } else {
        finalImage = await downloadImageAsBase64(result.url);
      }

      setBadgeProcessedImage(finalImage);
      setTokensUsed(prev => prev + 1);
      toast.success("Badge photo processed! 🎉");

    } catch (error) {
      console.error('Badge AI processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process badge';
      toast.error(errorMessage);
    } finally {
      setIsBadgeProcessing(false);
    }
  };

  // Get station URL
  const getStationUrl = (station: string) => {
    if (!selectedEvent) return '';
    const userSlug = currentUser.slug || currentUser.username;
    const base = `${window.location.origin}/${userSlug}/${selectedEvent.slug}`;
    return station === 'main' ? base : `${base}/${station}`;
  };

  // Copy URL to clipboard
  const copyUrl = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast.success(`${label} URL copied!`);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      toast.error("Failed to copy URL");
    }
  };

  // Open event in new tab
  const openEventPreview = (station: string = 'main') => {
    const url = getStationUrl(station);
    if (url) window.open(url, '_blank');
  };

  // Download processed image
  const downloadImage = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    link.click();
  };

  // Download badge as image using canvas
  const downloadBadge = async () => {
    try {
      // Get the badge dimensions based on layout
      const dimensions = {
        portrait: { width: 600, height: 800 },
        landscape: { width: 800, height: 600 },
        square: { width: 600, height: 600 },
      };
      const { width, height } = dimensions[badgeConfig.layout] || dimensions.portrait;

      // Create a canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast.error("Failed to create canvas");
        return;
      }

      // Draw background
      if (badgeConfig.backgroundUrl) {
        const bgImg = new window.Image();
        bgImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          bgImg.onload = () => {
            ctx.drawImage(bgImg, 0, 0, width, height);
            resolve();
          };
          bgImg.onerror = reject;
          bgImg.src = badgeConfig.backgroundUrl!;
        });
      } else {
        ctx.fillStyle = badgeConfig.backgroundColor || '#6366F1';
        ctx.fillRect(0, 0, width, height);
      }

      // Use custom positions from visual editor
      const positions = elementPositions;

      // Draw photo if available - use size from badge template settings
      const photoSrc = badgeProcessedImage || testImage;
      if (photoSrc) {
        const photoImg = new window.Image();
        photoImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          photoImg.onload = () => {
            // Photo size follows badge template settings
            const photoSizePercent = badgeConfig.photoPlacement?.size === 'small' ? 22 : badgeConfig.photoPlacement?.size === 'large' ? 38 : 30;
            const photoWidth = photoSizePercent / 100 * width;
            const photoHeight = photoWidth; // Container is square
            const x = (positions.photo?.x || 50) / 100 * width - photoWidth / 2;
            const y = (positions.photo?.y || 20) / 100 * height - photoHeight / 2;
            
            // Draw circular or rounded photo
            ctx.save();
            if (badgeConfig.photoPlacement?.shape === 'circle') {
              ctx.beginPath();
              ctx.arc(x + photoWidth/2, y + photoHeight/2, photoWidth/2, 0, Math.PI * 2);
              ctx.clip();
            } else if (badgeConfig.photoPlacement?.shape === 'rounded') {
              const radius = photoWidth * 0.1;
              ctx.beginPath();
              ctx.roundRect(x, y, photoWidth, photoHeight, radius);
              ctx.clip();
            }
            
            // Calculate "object-fit: cover" to maintain aspect ratio
            const imgAspect = photoImg.width / photoImg.height;
            const containerAspect = 1; // Square container
            
            let drawWidth, drawHeight, drawX, drawY;
            
            if (imgAspect > containerAspect) {
              // Image is wider - fit height, crop width
              drawHeight = photoHeight;
              drawWidth = photoHeight * imgAspect;
              drawX = x - (drawWidth - photoWidth) / 2;
              drawY = y;
            } else {
              // Image is taller - fit width, crop height
              drawWidth = photoWidth;
              drawHeight = photoWidth / imgAspect;
              drawX = x;
              drawY = y - (drawHeight - photoHeight) / 2;
            }
            
            ctx.drawImage(photoImg, drawX, drawY, drawWidth, drawHeight);
            ctx.restore();
            resolve();
          };
          photoImg.onerror = reject;
          photoImg.src = photoSrc;
        });
      }

      // Draw text fields using custom positions and colors
      ctx.textAlign = 'center';
      
      if (badgeConfig.fields?.showName) {
        ctx.font = `bold ${height * (badgeConfig.textStyle?.nameFontSize || 6) / 100}px ${badgeConfig.textStyle?.fontFamily || 'sans-serif'}`;
        ctx.fillStyle = textStyles.nameColor;
        const nameX = (positions.name?.x || 50) / 100 * width;
        const nameY = (positions.name?.y || 55) / 100 * height;
        ctx.fillText(badgePreview.name, nameX, nameY);
      }
      
      if (badgeConfig.fields?.showEventName) {
        ctx.font = `${height * (badgeConfig.textStyle?.eventNameFontSize || 3.5) / 100}px ${badgeConfig.textStyle?.fontFamily || 'sans-serif'}`;
        ctx.fillStyle = textStyles.eventNameColor;
        const eventX = (positions.eventName?.x || 50) / 100 * width;
        const eventY = (positions.eventName?.y || 62) / 100 * height;
        ctx.fillText(badgePreview.eventName, eventX, eventY);
      }
      
      if (badgeConfig.fields?.showDateTime) {
        ctx.font = `${height * (badgeConfig.textStyle?.dateTimeFontSize || 2.8) / 100}px ${badgeConfig.textStyle?.fontFamily || 'sans-serif'}`;
        ctx.fillStyle = textStyles.dateTimeColor;
        const dateX = (positions.dateTime?.x || 50) / 100 * width;
        const dateY = (positions.dateTime?.y || 68) / 100 * height;
        ctx.fillText(badgePreview.date, dateX, dateY);
      }

      // Draw QR Code using custom positions - size from badge template settings
      if (badgeConfig.qrCode?.enabled) {
        const qrSizePercent = badgeConfig.qrCode?.size === 'small' ? 12 : badgeConfig.qrCode?.size === 'large' ? 22 : 16;
        const qrWidth = qrSizePercent / 100 * width;
        const qrHeight = qrWidth;
        const qrX = (positions.qrCode?.x || 50) / 100 * width - qrWidth / 2;
        const qrY = (positions.qrCode?.y || 85) / 100 * height - qrHeight / 2;
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.roundRect(qrX, qrY, qrWidth, qrHeight, 4);
        ctx.fill();
        
        ctx.fillStyle = '#333';
        ctx.font = `${qrWidth * 0.2}px sans-serif`;
        ctx.fillText('QR', qrX + qrWidth/2, qrY + qrHeight/2 + qrWidth * 0.07);
      }

      // Download
      const link = document.createElement('a');
      link.download = `badge-${badgePreview.name.replace(/\s+/g, '-')}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success("Badge downloaded!");
    } catch (error) {
      console.error("Failed to download badge:", error);
      toast.error("Failed to download badge");
    }
  };

  // Convert preset positions to percentage positions
  const getPositionsFromPresets = (): CustomElementPositions => {
    const positions = { ...DEFAULT_ELEMENT_POSITIONS };
    
    // Convert photo position preset to percentages
    if (badgeConfig.photoPlacement?.position) {
      switch (badgeConfig.photoPlacement.position) {
        case 'top':
          positions.photo = { x: 50, y: 18, width: 28, height: 28 };
          break;
        case 'center':
          positions.photo = { x: 50, y: 40, width: 28, height: 28 };
          break;
        case 'left':
          positions.photo = { x: 25, y: 40, width: 28, height: 28 };
          break;
        case 'right':
          positions.photo = { x: 75, y: 40, width: 28, height: 28 };
          break;
      }
    }
    
    // Convert QR position preset to percentages
    if (badgeConfig.qrCode?.position) {
      const qrSize = badgeConfig.qrCode.size === 'small' ? 12 : badgeConfig.qrCode.size === 'large' ? 20 : 15;
      switch (badgeConfig.qrCode.position) {
        case 'top-left':
          positions.qrCode = { x: 12, y: 10, width: qrSize, height: qrSize };
          break;
        case 'top-right':
          positions.qrCode = { x: 88, y: 10, width: qrSize, height: qrSize };
          break;
        case 'bottom-left':
          positions.qrCode = { x: 12, y: 90, width: qrSize, height: qrSize };
          break;
        case 'bottom-right':
          positions.qrCode = { x: 88, y: 90, width: qrSize, height: qrSize };
          break;
        case 'center':
          positions.qrCode = { x: 50, y: 50, width: qrSize, height: qrSize };
          break;
      }
    }
    
    // Position text fields at the bottom
    positions.name = { x: 50, y: 72 };
    positions.eventName = { x: 50, y: 80 };
    positions.dateTime = { x: 50, y: 87 };
    
    return positions;
  };

  // Initialize element positions from badge config
  useEffect(() => {
    if (badgeConfig.useCustomPositions && badgeConfig.customPositions) {
      // Use saved custom positions
      setElementPositions({ ...DEFAULT_ELEMENT_POSITIONS, ...badgeConfig.customPositions });
    } else {
      // Convert from preset positions
      setElementPositions(getPositionsFromPresets());
    }
    
    // Initialize text styles from badge config
    setTextStyles({
      nameColor: badgeConfig.textStyle?.nameColor || '#ffffff',
      eventNameColor: badgeConfig.textStyle?.eventNameColor || 'rgba(255,255,255,0.8)',
      dateTimeColor: badgeConfig.textStyle?.dateTimeColor || 'rgba(255,255,255,0.6)',
    });
  }, [selectedEventId, badgeConfig.customPositions, badgeConfig.useCustomPositions, badgeConfig.photoPlacement?.position, badgeConfig.qrCode?.position, badgeConfig.textStyle]);

  // Handle drag start
  const handleDragStart = (elementId: string, e: React.MouseEvent) => {
    if (!isVisualEditorMode) return;
    e.preventDefault();
    setDraggingElement(elementId);
  };

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!draggingElement || !badgeEditorRef.current) return;
    
    const rect = badgeEditorRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Clamp values between 0 and 100
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    
    setElementPositions(prev => ({
      ...prev,
      [draggingElement]: {
        ...prev[draggingElement as keyof CustomElementPositions],
        x: clampedX,
        y: clampedY,
      }
    }));
  }, [draggingElement]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggingElement(null);
  }, []);

  // Add/remove mouse event listeners for dragging
  useEffect(() => {
    if (draggingElement) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [draggingElement, handleDragMove, handleDragEnd]);

  // Save positions and styles to badge template
  const savePositionsToTemplate = async () => {
    if (!selectedEvent) {
      toast.error("No event selected");
      return;
    }

    setIsSavingPositions(true);
    try {
      const updatedBadgeTemplate: BadgeTemplateConfig = {
        ...badgeConfig,
        useCustomPositions: true,
        customPositions: elementPositions,
        textStyle: {
          ...badgeConfig.textStyle,
          nameColor: textStyles.nameColor,
          eventNameColor: textStyles.eventNameColor,
          dateTimeColor: textStyles.dateTimeColor,
        },
      };

      await updateEvent(selectedEvent._id, {
        badgeTemplate: updatedBadgeTemplate,
      } as any);

      // Reload events to get updated data
      await loadEvents();
      
      toast.success("Badge layout and styles saved to template!");
    } catch (error) {
      console.error("Failed to save positions:", error);
      toast.error("Failed to save positions");
    } finally {
      setIsSavingPositions(false);
    }
  };

  // Reset positions to defaults
  const resetPositions = () => {
    setElementPositions({ ...DEFAULT_ELEMENT_POSITIONS });
    toast.success("Positions reset to defaults");
  };

  // Export badge settings as JSON
  const exportBadgeSettings = () => {
    const settings = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      positions: elementPositions,
      textStyles: textStyles,
      layout: badgeConfig.layout,
      photoPlacement: badgeConfig.photoPlacement,
      qrCode: badgeConfig.qrCode,
      fields: badgeConfig.fields,
      backgroundColor: badgeConfig.backgroundColor,
    };

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `badge-settings-${selectedEvent?.title?.replace(/\s+/g, '-') || 'export'}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success("Badge settings exported!");
  };

  // Import badge settings from JSON
  const importBadgeSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const settings = JSON.parse(event.target?.result as string);
        
        // Validate the settings
        if (!settings.version || !settings.positions) {
          toast.error("Invalid settings file format");
          return;
        }

        // Apply positions
        if (settings.positions) {
          setElementPositions({ ...DEFAULT_ELEMENT_POSITIONS, ...settings.positions });
        }

        // Apply text styles
        if (settings.textStyles) {
          setTextStyles({
            nameColor: settings.textStyles.nameColor || '#ffffff',
            eventNameColor: settings.textStyles.eventNameColor || 'rgba(255,255,255,0.8)',
            dateTimeColor: settings.textStyles.dateTimeColor || 'rgba(255,255,255,0.6)',
          });
        }

        toast.success("Badge settings imported! Click 'Save to Template' to apply.");
      } catch (error) {
        console.error("Failed to parse settings:", error);
        toast.error("Failed to parse settings file");
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    if (badgeSettingsInputRef.current) {
      badgeSettingsInputRef.current.value = '';
    }
  };

  // Get processing status text
  const getStatusText = () => {
    switch (processingStatus) {
      case 'queued': return 'Queued for processing...';
      case 'processing': return 'AI is generating your image...';
      case 'applying_branding': return 'Applying final touches...';
      case 'complete': return 'Complete!';
      case 'error': return 'Processing failed';
      default: return 'Ready';
    }
  };

  // Reset state
  const resetState = () => {
    setTestImage(null);
    setTestImageBase64(null);
    setProcessedResult(null);
    setBadgeProcessedImage(null);
    setProcessingStatus('idle');
    setProcessingProgress(0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Gamepad2 className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Playground</h2>
            <p className="text-sm text-zinc-400">Test your events, templates, and badges with real AI processing</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {tokensUsed > 0 && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              <Coins className="w-3 h-3 mr-1" />
              {tokensUsed} token{tokensUsed !== 1 ? 's' : ''} used this session
            </Badge>
          )}
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
            Test Mode
          </Badge>
        </div>
      </div>

      {/* Token Warning */}
      <Alert className="bg-amber-500/10 border-amber-500/30">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-400">Real Token Usage</AlertTitle>
        <AlertDescription className="text-amber-200/80">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4" />
            <span>
              AI processing in the Playground uses <strong>real tokens</strong>. 
              Each template test or badge generation will consume tokens from your account.
            </span>
          </div>
        </AlertDescription>
      </Alert>

      {/* No Events Warning */}
      {events.length === 0 && (
        <Alert className="bg-zinc-800/50 border-zinc-700">
          <AlertTriangle className="h-4 w-4 text-zinc-400" />
          <AlertTitle className="text-white">No Events Found</AlertTitle>
          <AlertDescription className="text-zinc-400">
            Create an event first to use the Playground. Go to the Events tab to create one.
          </AlertDescription>
        </Alert>
      )}

      {/* Mode Tabs */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as PlaygroundMode)} className="space-y-6">
        <TabsList className="bg-zinc-900/50 border border-white/10">
          <TabsTrigger value="template" className="data-[state=active]:bg-purple-600">
            <Palette className="w-4 h-4 mr-2" />
            Template Test
          </TabsTrigger>
          <TabsTrigger value="badge" className="data-[state=active]:bg-purple-600">
            <QrCode className="w-4 h-4 mr-2" />
            Badge Test
          </TabsTrigger>
          <TabsTrigger value="event" className="data-[state=active]:bg-purple-600">
            <Monitor className="w-4 h-4 mr-2" />
            Event Preview
          </TabsTrigger>
          <TabsTrigger value="booth" className="data-[state=active]:bg-purple-600">
            <Camera className="w-4 h-4 mr-2" />
            Booth Simulator
          </TabsTrigger>
        </TabsList>

        {/* Template Test Tab - REAL AI */}
        <TabsContent value="template" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <Card className="bg-zinc-900/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Test Template with AI
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Upload a photo and process it with your template using real AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Event Selector */}
                <div className="space-y-2">
                  <Label className="text-zinc-300">Event</Label>
                  <Select
                    value={selectedEventId}
                    onValueChange={(id) => {
                      setSelectedEventId(id);
                      setSelectedTemplateId('');
                      resetState();
                    }}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {events.map((event) => (
                        <SelectItem key={event._id} value={event._id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Template Selector */}
                <div className="space-y-2">
                  <Label className="text-zinc-300">Template</Label>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={(id) => {
                      setSelectedTemplateId(id);
                      setIsGroupPhoto(false); // Reset to individual when changing template
                    }}
                    disabled={templates.length === 0}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder={templates.length === 0 ? "No templates available" : "Select a template"} />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {templates.length === 0 && selectedEvent && (
                    <p className="text-xs text-amber-400">This event has no active templates</p>
                  )}
                </div>

                {/* Upload */}
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  {testImage ? (
                    <div className="flex items-center gap-4 p-4 bg-black/20 rounded-xl border border-white/10">
                      <img src={testImage} alt="Test" className="w-24 h-24 rounded-lg object-cover" />
                      <div className="flex-1">
                        <p className="text-sm text-zinc-300 mb-2">Test image loaded</p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="border-white/20 text-zinc-300"
                          >
                            <Upload className="w-3 h-3 mr-1" />
                            Change
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={resetState}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-zinc-700 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-10 h-10 mx-auto mb-2 text-zinc-500" />
                      <p className="text-sm text-zinc-400">Click to upload your own photo</p>
                      <p className="text-xs text-zinc-500 mt-1">or select a sample below</p>
                    </div>
                  )}
                </div>

                {/* Sample Images - Individual */}
                <div className="space-y-2">
                  <Label className="text-zinc-300 flex items-center gap-2">
                    <span>👤</span> Individual Samples
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {SAMPLE_IMAGES_INDIVIDUAL.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Individual ${i + 1}`}
                        className={`w-full aspect-square rounded-lg object-cover cursor-pointer border-2 transition-all ${
                          testImage === url ? 'border-cyan-500' : 'border-transparent hover:border-cyan-500/50'
                        }`}
                        onClick={() => useSampleImage(url)}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Sample Images - Group */}
                <div className="space-y-2">
                  <Label className="text-zinc-300 flex items-center gap-2">
                    <span>👥</span> Group Samples
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {SAMPLE_IMAGES_GROUP.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Group ${i + 1}`}
                        className={`w-full aspect-[3/2] rounded-lg object-cover cursor-pointer border-2 transition-all ${
                          testImage === url ? 'border-purple-500' : 'border-transparent hover:border-purple-500/50'
                        }`}
                        onClick={() => useSampleImage(url)}
                      />
                    ))}
                  </div>
                </div>

                {/* AI Model Selector */}
                <div className="space-y-2">
                  <Label className="text-zinc-300">AI Model</Label>
                  <Select
                    value={selectedAiModel}
                    onValueChange={(value: AIModelKey) => setSelectedAiModel(value)}
                  >
                    <SelectTrigger className="bg-black/40 border-white/10 text-white">
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      {Object.entries(AI_MODELS).map(([key, model]) => (
                        <SelectItem key={key} value={key} className="text-white hover:bg-white/10">
                          <div className="flex items-center gap-2">
                            <span>{model.name}</span>
                            <Badge variant="outline" className={`text-[10px] ${
                              model.speed === 'fast' ? 'border-green-500/50 text-green-400' :
                              model.speed === 'medium' ? 'border-yellow-500/50 text-yellow-400' :
                              'border-orange-500/50 text-orange-400'
                            }`}>
                              {model.speed}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-zinc-500">
                    {AI_MODELS[selectedAiModel].description}
                  </p>
                </div>

                {/* Individual/Group Toggle - Always show for testing */}
                <div className="space-y-2">
                  <Label className="text-zinc-300">Photo Type</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsGroupPhoto(false)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                        !isGroupPhoto 
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' 
                          : 'bg-black/20 border-white/10 text-zinc-400 hover:text-zinc-300'
                      }`}
                    >
                      <span className="text-lg">👤</span>
                      <span className="text-sm font-medium">Individual</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsGroupPhoto(true)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                        isGroupPhoto 
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' 
                          : 'bg-black/20 border-white/10 text-zinc-400 hover:text-zinc-300'
                      }`}
                    >
                      <span className="text-lg">👥</span>
                      <span className="text-sm font-medium">Group</span>
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {isGroupPhoto 
                      ? selectedTemplate?.groupPrompt 
                        ? '📝 Using template group prompt' 
                        : '📝 Group mode - use custom prompt or PromptHelper templates'
                      : selectedTemplate?.prompt 
                        ? '📝 Using template individual prompt' 
                        : '📝 Individual mode - use custom prompt or PromptHelper templates'}
                  </p>
                </div>

                {/* Custom Prompt Section */}
                <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                      <Label className="text-zinc-300 font-medium">Custom Prompt</Label>
                    </div>
                    <Switch
                      checked={useCustomPrompt}
                      onCheckedChange={(checked) => {
                        setUseCustomPrompt(checked);
                        if (!checked) setCustomPrompt('');
                      }}
                      className="data-[state=checked]:bg-indigo-600"
                    />
                  </div>
                  
                  {useCustomPrompt ? (
                    <div className="space-y-3">
                      <Textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Write your own prompt to test... e.g., 'Transform this person into a superhero in a comic book style'"
                        rows={4}
                        className="font-mono text-sm bg-black/40 border-white/10 text-zinc-300 placeholder:text-zinc-600 focus:border-indigo-500"
                      />
                      <PromptHelper
                        onSelectPrompt={(prompt) => setCustomPrompt(prompt)}
                        currentPrompt={customPrompt}
                        section="template"
                        placeholder="Describe what you want to create or ask AI to improve your prompt..."
                      />
                      {selectedTemplate && (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setCustomPrompt(selectedTemplate.prompt || '')}
                            className="text-xs border-white/10 text-zinc-400"
                          >
                            Load Individual Prompt
                          </Button>
                          {selectedTemplate.groupPrompt && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setCustomPrompt(selectedTemplate.groupPrompt || '')}
                              className="text-xs border-white/10 text-zinc-400"
                            >
                              Load Group Prompt
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      Enable to write and test your own prompts instead of using the template's prompt
                    </p>
                  )}
                </div>

                {/* Current Prompt Preview */}
                {selectedTemplate && !useCustomPrompt && (
                  <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-zinc-500">
                        {isGroupPhoto && selectedTemplate.groupPrompt ? 'Group Prompt:' : 'Individual Prompt:'}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const promptToCopy = isGroupPhoto && selectedTemplate.groupPrompt 
                              ? selectedTemplate.groupPrompt 
                              : selectedTemplate.prompt || '';
                            navigator.clipboard.writeText(promptToCopy);
                            toast.success('Prompt copied to clipboard');
                          }}
                          className="h-6 px-2 text-xs text-zinc-400 hover:text-white"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const promptToEdit = isGroupPhoto && selectedTemplate.groupPrompt 
                              ? selectedTemplate.groupPrompt 
                              : selectedTemplate.prompt || '';
                            setCustomPrompt(promptToEdit);
                            setUseCustomPrompt(true);
                          }}
                          className="h-6 px-2 text-xs text-zinc-400 hover:text-indigo-400"
                        >
                          <Wand2 className="w-3 h-3 mr-1" />
                          Edit & Enhance
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 font-mono line-clamp-3">
                      {isGroupPhoto && selectedTemplate.groupPrompt 
                        ? selectedTemplate.groupPrompt 
                        : selectedTemplate.prompt || 'No prompt configured'}
                    </p>
                  </div>
                )}

                {/* Process Button */}
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={processWithAI}
                  disabled={!testImageBase64 || !selectedTemplate || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {getStatusText()}
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Process with AI (Uses 1 Token)
                    </>
                  )}
                </Button>

                {/* Processing Progress */}
                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={processingProgress} className="h-2" />
                    <p className="text-xs text-center text-zinc-500">{getStatusText()}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Result Section */}
            <Card className="bg-zinc-900/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Result</CardTitle>
                <CardDescription className="text-zinc-400">
                  AI-processed image will appear here
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`${selectedTemplate?.aspectRatio === '16:9' ? 'aspect-[16/9]' : selectedTemplate?.aspectRatio === '1:1' ? 'aspect-square' : selectedTemplate?.aspectRatio === '4:5' ? 'aspect-[4/5]' : selectedTemplate?.aspectRatio === '3:2' ? 'aspect-[3/2]' : 'aspect-[9/16]'} max-h-[500px] rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden`}>
                  {processedResult ? (
                    <div className="relative w-full h-full">
                      <img
                        src={processedResult}
                        alt="Result"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                        <Badge className="bg-green-500/20 text-green-400">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          AI Processed
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => downloadImage(processedResult, `template-test-${Date.now()}.jpg`)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ) : isProcessing ? (
                    <div className="text-center p-8">
                      <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-purple-400" />
                      <p className="text-zinc-400">{getStatusText()}</p>
                      <Progress value={processingProgress} className="w-48 mx-auto mt-4 h-2" />
                    </div>
                  ) : (
                    <div className="text-center">
                      <Image className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                      <p className="text-zinc-500">Result will appear here</p>
                    </div>
                  )}
                </div>

                {selectedTemplate && (
                  <div className="mt-4 p-3 rounded-lg bg-zinc-800/50 space-y-2">
                    <p className="text-sm font-medium text-white">{selectedTemplate.name}</p>
                    <p className="text-xs text-zinc-400 line-clamp-2">
                      {selectedTemplate.prompt || 'No prompt configured'}
                    </p>
                    {selectedTemplate.images?.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {selectedTemplate.images.slice(0, 4).map((img, i) => (
                          <img 
                            key={i} 
                            src={img} 
                            alt={`Template ${i}`} 
                            className="w-8 h-8 rounded object-cover"
                          />
                        ))}
                        {selectedTemplate.images.length > 4 && (
                          <div className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
                            +{selectedTemplate.images.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Badge Test Tab - REAL AI */}
        <TabsContent value="badge" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Badge Input */}
            <Card className="bg-zinc-900/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-cyan-400" />
                  Test Badge Generation
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Test badge creation with your event's badge template settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Event Selector for Badge */}
                <div className="space-y-2">
                  <Label className="text-zinc-300">Event</Label>
                  <Select
                    value={selectedEventId}
                    onValueChange={(id) => {
                      setSelectedEventId(id);
                      resetState();
                    }}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {events.map((event) => (
                        <SelectItem key={event._id} value={event._id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Badge Template Status */}
                {selectedEvent && (
                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-400">Badge Template</span>
                      <Badge className={badgeConfig.enabled ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'}>
                        {badgeConfig.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    {badgeConfig.enabled && (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500">AI Enhancement</span>
                          <Badge className={badgeConfig.aiPipeline?.enabled ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-500/20 text-zinc-400'}>
                            {badgeConfig.aiPipeline?.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-zinc-500">Layout</span>
                          <span className="text-zinc-300 capitalize">{badgeConfig.layout}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Visitor Info */}
                <div className="space-y-3">
                  <Label className="text-zinc-300">Visitor Information</Label>
                  <Input
                    value={badgePreview.name}
                    onChange={(e) => setBadgePreview({ ...badgePreview, name: e.target.value })}
                    className="bg-zinc-800 border-zinc-700"
                    placeholder="Visitor name"
                  />
                  {badgeConfig.fields?.customField1 && (
                    <Input
                      value={badgePreview.customField1}
                      onChange={(e) => setBadgePreview({ ...badgePreview, customField1: e.target.value })}
                      className="bg-zinc-800 border-zinc-700"
                      placeholder={badgeConfig.fields.customField1}
                    />
                  )}
                  {badgeConfig.fields?.customField2 && (
                    <Input
                      value={badgePreview.customField2}
                      onChange={(e) => setBadgePreview({ ...badgePreview, customField2: e.target.value })}
                      className="bg-zinc-800 border-zinc-700"
                      placeholder={badgeConfig.fields.customField2}
                    />
                  )}
                </div>

                {/* Photo Upload for Badge */}
                <div className="space-y-2">
                  <Label className="text-zinc-300">Profile Photo</Label>
                  <div
                    className="border-2 border-dashed border-zinc-700 rounded-xl p-4 text-center cursor-pointer hover:border-cyan-500/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {testImage ? (
                      <img src={testImage} alt="Profile" className="w-24 h-24 mx-auto rounded-full object-cover" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
                        <p className="text-xs text-zinc-400">Click to upload photo</p>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {SAMPLE_IMAGES.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Sample ${i + 1}`}
                        className={`w-full aspect-square rounded-lg object-cover cursor-pointer border-2 transition-all ${
                          testImage === url ? 'border-cyan-500' : 'border-transparent hover:border-cyan-500/50'
                        }`}
                        onClick={() => useSampleImage(url)}
                      />
                    ))}
                  </div>
                </div>

                {/* Process Badge Button */}
                {badgeConfig.aiPipeline?.enabled && (
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={processBadgeWithAI}
                    disabled={!testImageBase64 || isBadgeProcessing}
                  >
                    {isBadgeProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Enhance Photo with AI (Uses 1 Token)
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Badge Visual Editor */}
            <Card className="bg-zinc-900/50 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      {isVisualEditorMode ? (
                        <>
                          <Move className="w-5 h-5 text-cyan-400" />
                          Visual Editor
                        </>
                      ) : (
                        'Badge Preview'
                      )}
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                      {isVisualEditorMode 
                        ? 'Drag elements to position them. Click Save to update the template.'
                        : 'Live preview of your badge design'
                      }
                    </CardDescription>
                  </div>
                  <Button
                    variant={isVisualEditorMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsVisualEditorMode(!isVisualEditorMode)}
                    className={isVisualEditorMode ? 'bg-cyan-600 hover:bg-cyan-700' : 'border-zinc-700'}
                  >
                    <Maximize2 className="w-4 h-4 mr-2" />
                    {isVisualEditorMode ? 'Exit Editor' : 'Edit Layout'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  {/* Badge Visual Editor Canvas */}
                  <div
                    ref={badgeEditorRef}
                    className={`rounded-xl overflow-hidden shadow-2xl relative ${isVisualEditorMode ? 'ring-2 ring-cyan-500' : ''}`}
                    style={{ 
                      width: badgeConfig.layout === 'landscape' ? 320 : 240,
                      height: badgeConfig.layout === 'landscape' ? 240 : badgeConfig.layout === 'square' ? 240 : 320,
                      backgroundColor: badgeConfig.backgroundUrl ? undefined : (badgeConfig.backgroundColor || selectedEvent?.theme?.primaryColor || '#6366F1'),
                      backgroundImage: badgeConfig.backgroundUrl ? `url(${badgeConfig.backgroundUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      cursor: isVisualEditorMode ? 'default' : 'auto',
                    }}
                  >
                    {/* Photo Element - size follows badge template settings */}
                    <div
                      className={`absolute flex items-center justify-center transition-all ${
                        isVisualEditorMode ? 'cursor-move hover:ring-2 hover:ring-cyan-400' : ''
                      } ${draggingElement === 'photo' ? 'ring-2 ring-cyan-400 z-50' : ''}`}
                      style={{
                        left: `${elementPositions.photo?.x || 50}%`,
                        top: `${elementPositions.photo?.y || 20}%`,
                        transform: 'translate(-50%, -50%)',
                        width: `${badgeConfig.photoPlacement?.size === 'small' ? 22 : badgeConfig.photoPlacement?.size === 'large' ? 38 : 30}%`,
                        height: `${badgeConfig.photoPlacement?.size === 'small' ? 22 : badgeConfig.photoPlacement?.size === 'large' ? 38 : 30}%`,
                      }}
                      onMouseDown={(e) => handleDragStart('photo', e)}
                    >
                      <div 
                        className={`w-full h-full bg-white/20 border-2 border-white/30 flex items-center justify-center overflow-hidden ${
                          badgeConfig.photoPlacement?.shape === 'circle' ? 'rounded-full' :
                          badgeConfig.photoPlacement?.shape === 'rounded' ? 'rounded-xl' : ''
                        }`}
                      >
                        {(badgeProcessedImage || testImage) ? (
                          <img 
                            src={badgeProcessedImage || testImage || ''} 
                            alt="Profile" 
                            className="w-full h-full object-cover" 
                            draggable={false}
                          />
                        ) : (
                          <User className="w-1/3 h-1/3 text-white/60" />
                        )}
                      </div>
                      {isVisualEditorMode && (
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-cyan-600 text-[9px] text-white rounded whitespace-nowrap">
                          Photo
                        </div>
                      )}
                    </div>

                    {/* Name Element */}
                    {badgeConfig.fields?.showName && (
                      <div
                        className={`absolute transition-all ${
                          isVisualEditorMode ? 'cursor-move hover:ring-2 hover:ring-cyan-400 px-2 py-1' : ''
                        } ${draggingElement === 'name' ? 'ring-2 ring-cyan-400 z-50' : ''}`}
                        style={{
                          left: `${elementPositions.name?.x || 50}%`,
                          top: `${elementPositions.name?.y || 55}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        onMouseDown={(e) => handleDragStart('name', e)}
                      >
                        <p 
                          className="text-base font-bold whitespace-nowrap"
                          style={{ color: textStyles.nameColor }}
                        >
                          {badgePreview.name}
                        </p>
                        {isVisualEditorMode && (
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-cyan-600 text-[9px] text-white rounded whitespace-nowrap">
                            Name
                          </div>
                        )}
                      </div>
                    )}

                    {/* Event Name Element */}
                    {badgeConfig.fields?.showEventName && (
                      <div
                        className={`absolute transition-all ${
                          isVisualEditorMode ? 'cursor-move hover:ring-2 hover:ring-cyan-400 px-2 py-1' : ''
                        } ${draggingElement === 'eventName' ? 'ring-2 ring-cyan-400 z-50' : ''}`}
                        style={{
                          left: `${elementPositions.eventName?.x || 50}%`,
                          top: `${elementPositions.eventName?.y || 62}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        onMouseDown={(e) => handleDragStart('eventName', e)}
                      >
                        <p 
                          className="text-[11px] whitespace-nowrap"
                          style={{ color: textStyles.eventNameColor }}
                        >
                          {badgePreview.eventName}
                        </p>
                        {isVisualEditorMode && (
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-cyan-600 text-[9px] text-white rounded whitespace-nowrap">
                            Event
                          </div>
                        )}
                      </div>
                    )}

                    {/* DateTime Element */}
                    {badgeConfig.fields?.showDateTime && (
                      <div
                        className={`absolute transition-all ${
                          isVisualEditorMode ? 'cursor-move hover:ring-2 hover:ring-cyan-400 px-2 py-1' : ''
                        } ${draggingElement === 'dateTime' ? 'ring-2 ring-cyan-400 z-50' : ''}`}
                        style={{
                          left: `${elementPositions.dateTime?.x || 50}%`,
                          top: `${elementPositions.dateTime?.y || 68}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        onMouseDown={(e) => handleDragStart('dateTime', e)}
                      >
                        <div 
                          className="flex items-center gap-1 text-[10px] whitespace-nowrap"
                          style={{ color: textStyles.dateTimeColor }}
                        >
                          <Calendar className="w-2.5 h-2.5" />
                          {badgePreview.date}
                        </div>
                        {isVisualEditorMode && (
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-cyan-600 text-[9px] text-white rounded whitespace-nowrap">
                            Date
                          </div>
                        )}
                      </div>
                    )}

                    {/* QR Code Element - size follows badge template settings */}
                    {badgeConfig.qrCode?.enabled && (
                      <div
                        className={`absolute transition-all ${
                          isVisualEditorMode ? 'cursor-move hover:ring-2 hover:ring-cyan-400' : ''
                        } ${draggingElement === 'qrCode' ? 'ring-2 ring-cyan-400 z-50' : ''}`}
                        style={{
                          left: `${elementPositions.qrCode?.x || 50}%`,
                          top: `${elementPositions.qrCode?.y || 85}%`,
                          transform: 'translate(-50%, -50%)',
                          width: `${badgeConfig.qrCode?.size === 'small' ? 12 : badgeConfig.qrCode?.size === 'large' ? 22 : 16}%`,
                          height: `${badgeConfig.qrCode?.size === 'small' ? 12 : badgeConfig.qrCode?.size === 'large' ? 22 : 16}%`,
                        }}
                        onMouseDown={(e) => handleDragStart('qrCode', e)}
                      >
                        <div className="w-full h-full bg-white rounded-lg flex items-center justify-center p-1">
                          <QrCode className="w-full h-full text-zinc-800" />
                        </div>
                        {isVisualEditorMode && (
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-cyan-600 text-[9px] text-white rounded whitespace-nowrap">
                            QR
                          </div>
                        )}
                      </div>
                    )}

                    {/* AI Badge indicator */}
                    {badgeProcessedImage && !isVisualEditorMode && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-purple-500/80 text-white text-[8px]">
                          <Sparkles className="w-2 h-2 mr-0.5" />
                          AI
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Visual Editor Controls */}
                {isVisualEditorMode && (
                  <div className="mt-4 space-y-3">
                    {/* Text Color Controls */}
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                      <p className="text-xs text-purple-400 font-medium mb-3">Text Colors</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-400">Name</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={textStyles.nameColor}
                              onChange={(e) => setTextStyles(prev => ({ ...prev, nameColor: e.target.value }))}
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                            />
                            <input
                              type="text"
                              value={textStyles.nameColor}
                              onChange={(e) => setTextStyles(prev => ({ ...prev, nameColor: e.target.value }))}
                              className="flex-1 text-[10px] bg-black/30 border border-white/10 rounded px-1.5 py-1 text-white font-mono"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-400">Event</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={textStyles.eventNameColor.startsWith('rgba') ? '#cccccc' : textStyles.eventNameColor}
                              onChange={(e) => setTextStyles(prev => ({ ...prev, eventNameColor: e.target.value }))}
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                            />
                            <input
                              type="text"
                              value={textStyles.eventNameColor}
                              onChange={(e) => setTextStyles(prev => ({ ...prev, eventNameColor: e.target.value }))}
                              className="flex-1 text-[10px] bg-black/30 border border-white/10 rounded px-1.5 py-1 text-white font-mono"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-400">Date</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={textStyles.dateTimeColor.startsWith('rgba') ? '#999999' : textStyles.dateTimeColor}
                              onChange={(e) => setTextStyles(prev => ({ ...prev, dateTimeColor: e.target.value }))}
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                            />
                            <input
                              type="text"
                              value={textStyles.dateTimeColor}
                              onChange={(e) => setTextStyles(prev => ({ ...prev, dateTimeColor: e.target.value }))}
                              className="flex-1 text-[10px] bg-black/30 border border-white/10 rounded px-1.5 py-1 text-white font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Position Controls */}
                    <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-cyan-400 font-medium">Element Positions</p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={resetPositions}
                            className="border-zinc-700 text-xs h-7"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Reset
                          </Button>
                          <Button
                            size="sm"
                            onClick={savePositionsToTemplate}
                            disabled={isSavingPositions || !selectedEvent}
                            className="bg-cyan-600 hover:bg-cyan-700 text-xs h-7"
                          >
                            {isSavingPositions ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3 mr-1" />
                            )}
                            Save to Template
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
                        <div>Photo: {Math.round(elementPositions.photo?.x || 0)}%, {Math.round(elementPositions.photo?.y || 0)}%</div>
                        <div>Name: {Math.round(elementPositions.name?.x || 0)}%, {Math.round(elementPositions.name?.y || 0)}%</div>
                        <div>Event: {Math.round(elementPositions.eventName?.x || 0)}%, {Math.round(elementPositions.eventName?.y || 0)}%</div>
                        <div>QR: {Math.round(elementPositions.qrCode?.x || 0)}%, {Math.round(elementPositions.qrCode?.y || 0)}%</div>
                      </div>
                      <p className="text-[9px] text-zinc-500 mt-2">
                        Photo size: {badgeConfig.photoPlacement?.size || 'medium'} • QR size: {badgeConfig.qrCode?.size || 'medium'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Hidden file input for importing settings */}
                <input
                  ref={badgeSettingsInputRef}
                  type="file"
                  accept=".json"
                  onChange={importBadgeSettings}
                  className="hidden"
                />

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  <Button 
                    variant="outline" 
                    className="border-zinc-700"
                    onClick={downloadBadge}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Badge
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-zinc-700"
                    onClick={resetState}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
                
                {/* Export/Import Settings */}
                <div className="flex justify-center gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/30"
                    onClick={exportBadgeSettings}
                  >
                    <Download className="w-3 h-3 mr-1.5" />
                    Export Settings
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-amber-700 text-amber-400 hover:bg-amber-900/30"
                    onClick={() => badgeSettingsInputRef.current?.click()}
                  >
                    <Upload className="w-3 h-3 mr-1.5" />
                    Import Settings
                  </Button>
                </div>

                {!badgeConfig.enabled && (
                  <p className="text-xs text-amber-400 text-center mt-4">
                    Badge template is not enabled for this event. Enable it in the Event Editor → Templates tab.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Event Preview Tab */}
        <TabsContent value="event" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Event Selector */}
            <Card className="bg-zinc-900/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Select Event</CardTitle>
                <CardDescription className="text-zinc-400">
                  Choose an event to preview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={selectedEventId}
                  onValueChange={(id) => {
                    setSelectedEventId(id);
                    setSelectedTemplateId('');
                  }}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {events.map((event) => (
                      <SelectItem key={event._id} value={event._id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedEvent && (
                  <div className="space-y-3 pt-4 border-t border-zinc-800">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Status</span>
                      <Badge className={selectedEvent.is_active ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'}>
                        {selectedEvent.is_active ? 'Active' : 'Draft'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Templates</span>
                      <span className="text-white">{templates.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Album Mode</span>
                      <span className="text-white">{selectedEvent.albumTracking?.enabled ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Slug</span>
                      <span className="text-white font-mono text-xs">{selectedEvent.slug}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview Options */}
            <Card className="bg-zinc-900/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Preview Options</CardTitle>
                <CardDescription className="text-zinc-400">
                  Choose how to preview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Device</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={previewDevice === 'desktop' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewDevice('desktop')}
                      className={previewDevice === 'desktop' ? 'bg-purple-600' : 'border-zinc-700'}
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      Desktop
                    </Button>
                    <Button
                      variant={previewDevice === 'mobile' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewDevice('mobile')}
                      className={previewDevice === 'mobile' ? 'bg-purple-600' : 'border-zinc-700'}
                    >
                      <Smartphone className="w-4 h-4 mr-2" />
                      Mobile
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Quick Actions</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-zinc-700"
                      onClick={() => setShowPreviewModal(true)}
                      disabled={!selectedEvent}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-zinc-700"
                      onClick={() => openEventPreview('main')}
                      disabled={!selectedEvent}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Station URLs */}
            <Card className="bg-zinc-900/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Station URLs
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Test different stations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedEvent ? (
                  <>
                    {[
                      { key: 'main', label: 'Main Page' },
                      { key: 'registration', label: 'Registration' },
                      { key: 'booth', label: 'Booth' },
                      { key: 'playground', label: 'Playground' },
                      { key: 'viewer', label: 'Viewer' },
                    ].map(({ key, label }) => {
                      const url = getStationUrl(key);
                      const isCopied = copiedUrl === url;
                      return (
                        <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50 group">
                          <span className="text-sm text-zinc-300">{label}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyUrl(url, label)}
                              className="h-7 w-7 p-0"
                            >
                              {isCopied ? (
                                <Check className="w-3 h-3 text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEventPreview(key)}
                              className="h-7 w-7 p-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <p className="text-sm text-zinc-500 text-center py-4">
                    Select an event to see URLs
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Booth Simulator Tab */}
        <TabsContent value="booth" className="space-y-6">
          <Card className="bg-zinc-900/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Photo Booth Simulator</CardTitle>
              <CardDescription className="text-zinc-400">
                Test the complete photo booth experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Step 1: Select Event */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                      1
                    </div>
                    <span className="text-white font-medium">Select Event</span>
                  </div>
                  <Select
                    value={selectedEventId}
                    onValueChange={setSelectedEventId}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Choose event" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {events.map((event) => (
                        <SelectItem key={event._id} value={event._id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedEvent && (
                    <div className="text-xs text-zinc-500">
                      {templates.length} template{templates.length !== 1 ? 's' : ''} available
                    </div>
                  )}
                </div>

                {/* Step 2: Choose Station */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                      2
                    </div>
                    <span className="text-white font-medium">Choose Station</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'registration', label: 'Registration', desc: 'Create badges' },
                      { key: 'booth', label: 'Booth', desc: 'Take photos' },
                      { key: 'playground', label: 'Playground', desc: 'Free mode' },
                      { key: 'viewer', label: 'Viewer', desc: 'View albums' },
                    ].map(({ key, label, desc }) => (
                      <Button
                        key={key}
                        variant="outline"
                        className="border-zinc-700 justify-start flex-col items-start h-auto py-3"
                        onClick={() => openEventPreview(key)}
                        disabled={!selectedEvent}
                      >
                        <span className="font-medium">{label}</span>
                        <span className="text-xs text-zinc-500">{desc}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Step 3: Launch */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                      3
                    </div>
                    <span className="text-white font-medium">Launch Test</span>
                  </div>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => openEventPreview('main')}
                    disabled={!selectedEvent}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Launch Photo Booth
                  </Button>
                  <p className="text-xs text-zinc-500">
                    Opens in a new tab. Processing photos will use real tokens.
                  </p>
                </div>
              </div>

              {/* Tips */}
              <div className="mt-8 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <h4 className="text-sm font-medium text-purple-400 mb-2">💡 Testing Tips</h4>
                <ul className="text-sm text-zinc-400 space-y-1">
                  <li>• Use the <strong>Registration</strong> station to test badge creation (Album Mode events)</li>
                  <li>• Test the <strong>Booth</strong> station to verify template processing</li>
                  <li>• Check the <strong>Viewer</strong> station for album display</li>
                  <li>• Add <code className="text-purple-400 bg-purple-500/10 px-1 rounded">?mock=1</code> to URLs for mock data (no tokens)</li>
                  <li>• Test on mobile by resizing your browser or using DevTools</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Event Preview - {selectedEvent?.title}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Preview how your event will look to visitors
            </DialogDescription>
          </DialogHeader>
          <div className={`mt-4 rounded-lg overflow-hidden bg-black ${previewDevice === 'mobile' ? 'max-w-[375px] mx-auto' : ''}`}>
            {selectedEvent && (
              <iframe
                src={getStationUrl('main')}
                className={`w-full ${previewDevice === 'mobile' ? 'h-[667px]' : 'h-[500px]'}`}
                title="Event Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

