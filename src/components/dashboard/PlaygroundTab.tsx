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
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
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
  UserPlus,
  Images,
  Info,
  MonitorPlay,
  RotateCcw,
  Save,
  Maximize2,
  Move,
  Grid,
  Type,
  MousePointer2,
  Trash2,
  MessageSquare,
  AlertCircle,
  Globe
} from "lucide-react";
import { User as UserType, getUserEvents, EventConfig, Template, updateEvent } from "@/services/eventsApi";
import { processImageWithAI, downloadImageAsBase64, AI_MODELS, type AIModelKey } from "@/services/aiProcessor";
import { toast } from "sonner";
import { BadgeTemplateConfig, DEFAULT_BADGE_CONFIG, CustomElementPositions, DEFAULT_ELEMENT_POSITIONS } from "@/components/templates/BadgeTemplateEditor";
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
  
  // Force instructions toggle - adds extra context to help AI understand images
  const [forceInstructions, setForceInstructions] = useState(false);
  
  // Seed for reproducible results
  const [customSeed, setCustomSeed] = useState<number | undefined>(undefined);
  const [lastResultSeed, setLastResultSeed] = useState<number | undefined>(undefined);

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

  // Get proxied URL for external images to bypass CORS
  const getProxiedUrl = (url: string, forceProxy = false): string => {
    // Patterns that need proxy
    const needsProxyPatterns = [
      's3.amazonaws.com/pictureme.now',
      'pictureme.now.s3.amazonaws.com',
      'images.unsplash.com',
      'unsplash.com'
    ];
    
    const needsProxy = forceProxy || needsProxyPatterns.some(pattern => url.includes(pattern));
    
    if (needsProxy) {
      const apiUrl = ENV.API_URL || '';
      return `${apiUrl}/api/proxy/image?url=${encodeURIComponent(url)}`;
    }
    
    return url;
  };

  // Convert image URL to base64
  const imageUrlToBase64 = async (url: string): Promise<string> => {
    // Always use proxy for external images to avoid CORS issues
    const proxiedUrl = getProxiedUrl(url, true);
    console.log('🔄 Converting image to base64:', { original: url, proxied: proxiedUrl });
    
    // Try fetch with proxy first
    try {
      console.log('🔄 Attempting proxy fetch...');
      const response = await fetch(proxiedUrl);
      console.log('📡 Proxy response status:', response.status);
      if (response.ok) {
        const blob = await response.blob();
        console.log('📦 Blob received, size:', blob.size, 'type:', blob.type);
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            console.log('✅ Image converted via proxy fetch, base64 length:', result.length);
            resolve(result);
          };
          reader.onerror = (e) => {
            console.error('❌ FileReader error:', e);
            reject(e);
          };
          reader.readAsDataURL(blob);
        });
      } else {
        const errorText = await response.text().catch(() => 'No error text');
        console.warn('⚠️ Proxy fetch failed with status:', response.status, 'error:', errorText);
      }
    } catch (fetchError) {
      console.log('⚠️ Fetch with proxy failed:', fetchError);
    }
    
    // Try direct fetch (for data URLs or same-origin)
    if (url.startsWith('data:')) {
      console.log('✅ URL is already a data URL');
      return url;
    }
    
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            console.log('✅ Image converted via direct fetch, base64 length:', result.length);
            resolve(result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (directFetchError) {
      console.log('⚠️ Direct fetch failed, trying canvas method:', directFetchError);
    }
    
    // Last resort: canvas method
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          const result = canvas.toDataURL('image/jpeg', 0.95);
          console.log('✅ Image converted via canvas, base64 length:', result.length);
          resolve(result);
        } catch (canvasError) {
          reject(new Error(`Canvas error (likely CORS): ${canvasError}`));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
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
    console.log('📸 Loading sample image:', url);
    setTestImage(url);
    setTestImageBase64(null); // Clear previous to show loading state
    setProcessedResult(null);
    setBadgeProcessedImage(null);
    
    toast.loading('Loading sample image...', { id: 'sample-image-loading' });
    
    try {
      const base64 = await imageUrlToBase64(url);
      if (!base64 || base64.length < 100) {
        throw new Error('Image data is empty or invalid');
      }
      console.log('✅ Sample image converted to base64, length:', base64.length);
      setTestImageBase64(base64);
      toast.success('Image loaded successfully', { id: 'sample-image-loading' });
    } catch (error) {
      console.error('❌ Failed to convert image to base64:', error);
      toast.error('Failed to load sample image. Please upload an image instead.', { 
        id: 'sample-image-loading',
        duration: 5000 
      });
      setTestImageBase64(null);
    }
  };

  // Process image with REAL AI
  const processWithAI = async () => {
    if (!testImageBase64 || testImageBase64.length < 100) {
      toast.error("Please upload or select a test image first");
      console.error("❌ processWithAI: testImageBase64 is null/empty or too short. User needs to upload/select an image.");
      return;
    }
    if (!selectedTemplate) {
      toast.error("Please select a template first");
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
      
      console.log("🪙 Playground AI call params:", {
        eventId: selectedEvent?.postgres_event_id,
        eventSlug: selectedEvent?.slug,
        userSlug: selectedEvent?.user_slug,
      });
      
      const result = await processImageWithAI({
        userPhotoBase64: testImageBase64,
        backgroundPrompt: promptToUse,
        backgroundImageUrls: selectedTemplate.images || [],
        includeBranding: false,
        aspectRatio: selectedTemplate.aspectRatio || '9:16',
        // Use groupImageModel for group photos if configured, otherwise fall back to imageModel or selected model
        aiModel: isGroupPhoto && selectedTemplate.pipelineConfig?.groupImageModel 
          ? selectedTemplate.pipelineConfig.groupImageModel 
          : (selectedTemplate.pipelineConfig?.imageModel || AI_MODELS[selectedAiModel].id),
        forceInstructions: forceInstructions,
        seed: customSeed || selectedTemplate.pipelineConfig?.seed,
        eventId: selectedEvent?.postgres_event_id,
        billingContext: isGroupPhoto ? 'playground-group' : 'playground-individual',
        eventSlug: selectedEvent?.slug,
        userSlug: selectedEvent?.user_slug,
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

      // Save the seed from the result for reproducibility
      if (result.seed) {
        setLastResultSeed(result.seed);
        console.log(`🎲 Result seed: ${result.seed} (save this for reproducible results)`);
      }

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
    if (!testImageBase64 || testImageBase64.length < 100) {
      toast.error("Please select or capture a photo first");
      console.error("❌ processBadgeWithAI: testImageBase64 is null/empty or too short.");
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
        forceInstructions: forceInstructions,
        seed: customSeed,
        eventId: selectedEvent?.postgres_event_id,
        billingContext: 'playground-badge',
        eventSlug: selectedEvent?.slug,
        userSlug: selectedEvent?.user_slug,
        onProgress: (status) => {
          console.log('Badge processing status:', status);
        },
      });

      // Save the seed from the result
      if (result.seed) {
        setLastResultSeed(result.seed);
        console.log(`🎲 Badge result seed: ${result.seed}`);
      }

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
    <div className="space-y-6 max-w-[1280px] mx-auto">
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

      {/* Token notice (discrete) */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center justify-between text-xs text-amber-100">
          <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>
            AI processing usa <strong>tokens reales</strong>. Cada prueba consume tu balance.
            </span>
          </div>
        <div className="flex items-center gap-1 text-amber-200/80">
          <Coins className="w-3 h-3" />
          <span className="text-[11px]">Sesión: {tokensUsed} usados</span>
        </div>
      </div>

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
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
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
                    <div className={`flex items-center gap-4 p-4 bg-black/20 rounded-xl border ${testImageBase64 ? 'border-white/10' : 'border-red-500/50'}`}>
                      <img src={testImage} alt="Test" className="w-24 h-24 rounded-lg object-cover" />
                      <div className="flex-1">
                        {testImageBase64 ? (
                          <p className="text-sm text-green-400 mb-2 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Image loaded and ready
                          </p>
                        ) : (
                          <p className="text-sm text-red-400 mb-2 flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" /> Image failed to load (CORS). Upload an image instead.
                          </p>
                        )}
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
                      {selectedTemplate?.prompt && <Check className="w-3 h-3 text-green-400" />}
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
                      {selectedTemplate?.groupPrompt ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                      )}
                    </button>
                  </div>
                  
                  {/* Warning if no group prompt */}
                  {isGroupPhoto && selectedTemplate && !selectedTemplate.groupPrompt && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="text-amber-300 font-medium">No group prompt configured</p>
                        <p className="text-amber-200/70">Use Custom Prompt or PromptHelper to create one, then save it to the template.</p>
                      </div>
                    </div>
                  )}
                  
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

                      {/* Force Instructions Toggle */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span className="text-xs text-zinc-400">
                            {forceInstructions 
                              ? 'Force: ON - Extra AI instructions added'
                              : 'Force: OFF - Prompt sent as-is'}
                          </span>
                        </div>
                        <Switch
                          checked={forceInstructions}
                          onCheckedChange={setForceInstructions}
                          className="data-[state=checked]:bg-amber-600 scale-75"
                        />
                      </div>
                      
                      {/* Load from Template */}
                      {selectedTemplate && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setCustomPrompt(selectedTemplate.prompt || '')}
                            className="text-xs border-white/10 text-zinc-400"
                            disabled={!selectedTemplate.prompt}
                          >
                            Load Individual
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setCustomPrompt(selectedTemplate.groupPrompt || '')}
                            className="text-xs border-white/10 text-zinc-400"
                            disabled={!selectedTemplate.groupPrompt}
                          >
                            Load Group
                          </Button>
                        </div>
                      )}
                      
                      {/* Save to Template - Only show if there's a custom prompt */}
                      {selectedTemplate && selectedEvent && customPrompt.trim() && (
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 space-y-2">
                          <p className="text-xs text-green-300 font-medium flex items-center gap-1">
                            <Save className="w-3 h-3" />
                            Save this prompt to template
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const updatedTemplates = selectedEvent.templates?.map(t => 
                                    t.id === selectedTemplate.id 
                                      ? { ...t, prompt: customPrompt }
                                      : t
                                  ) || [];
                                  await updateEvent(selectedEvent._id, { templates: updatedTemplates });
                                  await loadEvents();
                                  toast.success('Individual prompt saved to template!');
                                } catch (error) {
                                  toast.error('Failed to save prompt');
                                }
                              }}
                              className="text-xs bg-green-600 hover:bg-green-500 text-white"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              Save as Individual Prompt
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const updatedTemplates = selectedEvent.templates?.map(t => 
                                    t.id === selectedTemplate.id 
                                      ? { ...t, groupPrompt: customPrompt }
                                      : t
                                  ) || [];
                                  await updateEvent(selectedEvent._id, { templates: updatedTemplates });
                                  await loadEvents();
                                  toast.success('Group prompt saved to template!');
                                } catch (error) {
                                  toast.error('Failed to save prompt');
                                }
                              }}
                              className="text-xs bg-purple-600 hover:bg-purple-500 text-white"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              Save as Group Prompt
                            </Button>
                          </div>
                          <p className="text-[10px] text-green-200/60">
                            This will update the template in the event editor
                          </p>
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
                  <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
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
                    
                    {/* Force Instructions Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span className="text-xs text-zinc-400">
                          {forceInstructions 
                            ? 'Force: ON - Extra AI instructions added'
                            : 'Force: OFF - Prompt sent as-is'}
                        </span>
                      </div>
                      <Switch
                        checked={forceInstructions}
                        onCheckedChange={setForceInstructions}
                        className="data-[state=checked]:bg-amber-600 scale-75"
                      />
                    </div>
                    
                    {/* Seed Input */}
                    <div className="pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span className="text-xs text-zinc-400">Seed (optional)</span>
                        </div>
                        {customSeed && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setCustomSeed(undefined)}
                            className="h-5 px-1 text-[10px] text-red-400 hover:text-red-300"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      <Input
                        type="number"
                        value={customSeed || ''}
                        onChange={(e) => setCustomSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="Leave empty for random"
                        className="h-7 text-xs bg-black/40 border-white/10"
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Same seed = similar results. {selectedTemplate?.pipelineConfig?.seed && `Template seed: ${selectedTemplate.pipelineConfig.seed}`}
                      </p>
                    </div>
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
            <div className="lg:sticky lg:top-4 space-y-4">
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
                      
                      {/* Show seed from result */}
                      {lastResultSeed && (
                        <div className="mt-2 flex items-center justify-between p-2 rounded bg-purple-500/10 border border-purple-500/20">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            <span className="text-xs text-zinc-400">
                              Seed: <code className="text-purple-300 font-mono">{lastResultSeed}</code>
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(lastResultSeed.toString());
                                toast.success('Seed copied!');
                              }}
                              className="h-6 px-2 text-xs text-purple-400 hover:text-purple-300"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCustomSeed(lastResultSeed);
                                toast.success('Seed set for next generation!');
                              }}
                              className="h-6 px-2 text-xs text-cyan-400 hover:text-cyan-300"
                            >
                              Use Again
                            </Button>
                          </div>
                        </div>
                      )}
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
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white">{selectedTemplate.name}</p>
                      <Badge variant="outline" className={`text-xs ${
                        useCustomPrompt 
                          ? 'border-indigo-500/50 text-indigo-400' 
                          : isGroupPhoto 
                            ? 'border-purple-500/50 text-purple-400' 
                            : 'border-cyan-500/50 text-cyan-400'
                      }`}>
                        {useCustomPrompt ? '✏️ Custom' : isGroupPhoto ? '👥 Group' : '👤 Individual'}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-3">
                      {useCustomPrompt && customPrompt.trim()
                        ? customPrompt
                        : isGroupPhoto && selectedTemplate.groupPrompt
                          ? selectedTemplate.groupPrompt
                          : selectedTemplate.prompt || 'No prompt configured'}
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
          </div>
        </TabsContent>

        {/* Badge Test Tab - REAL AI */}
        <TabsContent value="badge" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
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
                <div className="space-y-3 p-4 rounded-lg bg-zinc-900/60 border border-zinc-800">
                  <div className="flex items-center justify-between">
                  <Label className="text-zinc-300">Visitor Information</Label>
                    <Badge variant="outline" className="text-[11px] border-zinc-700 text-zinc-400">
                      Preview updates live
                    </Badge>
                  </div>
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
                  <Card className="bg-zinc-900/60 border border-purple-500/10">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <span className="text-sm text-zinc-200">Process with AI</span>
                        </div>
                        <Badge className="bg-amber-500/20 text-amber-300 text-[11px] border-amber-500/30">
                          1 token
                        </Badge>
                      </div>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={processBadgeWithAI}
                    disabled={!testImageBase64 || isBadgeProcessing}
                  >
                    {isBadgeProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                            Enhance Photo
                      </>
                    )}
                  </Button>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Badge Visual Editor / Preview (sticky on desktop) */}
            <Card className="bg-zinc-900/50 border-white/10 lg:sticky lg:top-4">
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
        <TabsContent value="preview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
            <div className="space-y-6">
            {/* Event Selector */}
            <Card className="bg-zinc-900/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Select Event</CardTitle>
                <CardDescription className="text-zinc-400">
                    Choose an event to preview its stations
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
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                      <div>
                        <span className="text-xs text-zinc-500 block mb-1">Status</span>
                      <Badge className={selectedEvent.is_active ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'}>
                        {selectedEvent.is_active ? 'Active' : 'Draft'}
                      </Badge>
                    </div>
                      <div>
                        <span className="text-xs text-zinc-500 block mb-1">Templates</span>
                        <span className="text-white text-sm font-medium">{templates.length} Active</span>
                    </div>
                      <div>
                        <span className="text-xs text-zinc-500 block mb-1">Album Mode</span>
                        <span className="text-white text-sm font-medium">{selectedEvent.albumTracking?.enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                      <div>
                        <span className="text-xs text-zinc-500 block mb-1">Slug</span>
                        <span className="text-white text-xs font-mono bg-black/30 px-2 py-1 rounded">{selectedEvent.slug}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Station URLs */}
            <Card className="bg-zinc-900/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-cyan-400" />
                  Station URLs
                </CardTitle>
                <CardDescription className="text-zinc-400">
                    Direct links to different event stations
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
                          <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 group hover:bg-zinc-800 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-md bg-zinc-900 text-zinc-400">
                                {key === 'main' ? <Globe className="w-4 h-4" /> :
                                 key === 'registration' ? <UserPlus className="w-4 h-4" /> :
                                 key === 'booth' ? <Camera className="w-4 h-4" /> :
                                 key === 'viewer' ? <Images className="w-4 h-4" /> :
                                 <Gamepad2 className="w-4 h-4" />}
                              </div>
                              <div>
                                <span className="text-sm text-zinc-200 font-medium block">{label}</span>
                                <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[200px] block opacity-50 group-hover:opacity-100 transition-opacity">
                                  {url}
                                </span>
                              </div>
                            </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyUrl(url, label)}
                                className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
                            >
                              {isCopied ? (
                                  <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                  <Copy className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEventPreview(key)}
                                className="h-8 w-8 p-0 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-700"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                    <div className="text-center py-8 border-2 border-dashed border-zinc-800 rounded-xl">
                      <Link2 className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-sm text-zinc-500">
                        Select an event to generate station URLs
                  </p>
                    </div>
                )}
              </CardContent>
            </Card>
            </div>

            {/* Preview Options (Sticky) */}
            <div className="space-y-6 lg:sticky lg:top-4 h-fit">
              <Card className="bg-zinc-900/50 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Preview Options</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Simulate different devices
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-zinc-300">Device View</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={previewDevice === 'desktop' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPreviewDevice('desktop')}
                        className={`h-auto py-3 flex-col gap-1 ${previewDevice === 'desktop' ? 'bg-cyan-600 hover:bg-cyan-700' : 'border-zinc-700 bg-zinc-900/50'}`}
                      >
                        <Monitor className="w-5 h-5" />
                        <span className="text-xs">Desktop</span>
                      </Button>
                      <Button
                        variant={previewDevice === 'mobile' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPreviewDevice('mobile')}
                        className={`h-auto py-3 flex-col gap-1 ${previewDevice === 'mobile' ? 'bg-cyan-600 hover:bg-cyan-700' : 'border-zinc-700 bg-zinc-900/50'}`}
                      >
                        <Smartphone className="w-5 h-5" />
                        <span className="text-xs">Mobile</span>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-zinc-300">Quick Launch</Label>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 justify-between"
                        onClick={() => setShowPreviewModal(true)}
                        disabled={!selectedEvent}
                      >
                        <span className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Open Preview Modal
                        </span>
                        <Badge variant="secondary" className="bg-zinc-700 text-zinc-300 text-[10px]">Fast</Badge>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 justify-between"
                        onClick={() => openEventPreview('main')}
                        disabled={!selectedEvent}
                      >
                        <span className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          Open in New Tab
                        </span>
                        <Badge variant="secondary" className="bg-zinc-700 text-zinc-300 text-[10px]">Full</Badge>
                      </Button>
                    </div>
                  </div>

                  {selectedEvent && (
                    <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-cyan-300/80">
                          Preview mode uses mock data by default. To test with real tokens, use the Booth Simulator tab.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Booth Simulator Tab */}
        <TabsContent value="booth" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
            <div className="space-y-6">
              {/* Config Card */}
          <Card className="bg-zinc-900/50 border-white/10">
            <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Camera className="w-5 h-5 text-pink-400" />
                    Simulator Configuration
                  </CardTitle>
              <CardDescription className="text-zinc-400">
                    Configure the booth experience you want to test
              </CardDescription>
            </CardHeader>
                <CardContent className="space-y-8">
                {/* Step 1: Select Event */}
                  <div className="space-y-4 relative pl-8 before:absolute before:left-3.5 before:top-8 before:bottom-[-2rem] before:w-px before:bg-zinc-800">
                    <div className="absolute left-0 top-0 w-7 h-7 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-zinc-200">Select Event</h3>
                      <p className="text-xs text-zinc-500">Choose the event to simulate</p>
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
                      <div className="flex gap-2">
                         <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                           {templates.length} templates
                         </Badge>
                         <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                           {selectedEvent.albumTracking?.enabled ? 'Album Mode' : 'Standard Mode'}
                         </Badge>
                    </div>
                  )}
                </div>

                {/* Step 2: Choose Station */}
                  <div className="space-y-4 relative pl-8">
                    <div className="absolute left-0 top-0 w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-zinc-200">Choose Entry Point</h3>
                      <p className="text-xs text-zinc-500">Where do you want to start the flow?</p>
                  </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                        { key: 'registration', label: 'Registration', desc: 'Create visitor badges', icon: UserPlus },
                        { key: 'booth', label: 'Photo Booth', desc: 'Capture & process photos', icon: Camera },
                        { key: 'playground', label: 'Playground', desc: 'Free test mode', icon: Gamepad2 },
                        { key: 'viewer', label: 'Album Viewer', desc: 'View gallery & sharing', icon: Images },
                      ].map(({ key, label, desc, icon: Icon }) => (
                      <Button
                        key={key}
                        variant="outline"
                          className="border-zinc-700 justify-start items-start h-auto py-3 px-3 bg-zinc-800/30 hover:bg-zinc-800 hover:border-pink-500/50 group"
                        onClick={() => openEventPreview(key)}
                        disabled={!selectedEvent}
                      >
                          <div className="mr-3 mt-0.5 p-2 rounded-md bg-zinc-900 text-zinc-500 group-hover:text-pink-400 transition-colors">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <span className="font-medium text-zinc-200 block mb-0.5">{label}</span>
                            <span className="text-[10px] text-zinc-500">{desc}</span>
                          </div>
                      </Button>
                    ))}
                  </div>
                </div>
                </CardContent>
              </Card>
                    </div>

            {/* Launch & Tips (Sticky) */}
            <div className="space-y-6 lg:sticky lg:top-4 h-fit">
              <Card className="bg-zinc-900/50 border-white/10 border-t-4 border-t-pink-500">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Launch Simulator</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Start the full experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Button
                    className="w-full bg-pink-600 hover:bg-pink-700 h-12 text-base shadow-lg shadow-pink-900/20"
                    onClick={() => openEventPreview('main')}
                    disabled={!selectedEvent}
                  >
                    <Play className="w-5 h-5 mr-2 fill-current" />
                    Launch Full Experience
                  </Button>
                  
                  <div className="text-xs text-zinc-500 text-center px-4">
                    Opens in a new tab. <br/>
                    <span className="text-amber-500/80">Warning: Processing photos consumes real tokens.</span>
              </div>

                  <div className="p-4 rounded-lg bg-pink-500/5 border border-pink-500/10">
                    <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-3">Testing Tips</h4>
                    <ul className="text-xs text-zinc-400 space-y-2">
                      <li className="flex gap-2">
                        <span className="text-pink-500">•</span>
                        <span>Use <strong>Registration</strong> to test badge printing flows (Album Mode).</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-pink-500">•</span>
                        <span>Use <strong>Booth</strong> to verify AI template processing results.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-pink-500">•</span>
                        <span>Add <code className="text-pink-400 bg-pink-500/10 px-1 rounded">?mock=1</code> to URLs to use free mock processing.</span>
                      </li>
                </ul>
              </div>
            </CardContent>
          </Card>
            </div>
          </div>
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

