/**
 * RegistrationBadgeFlow Component
 * 
 * Handles the registration station workflow:
 * 1. Takes profile photo
 * 2. Creates album
 * 3. Generates badge with real QR code
 * 4. Shows badge preview with print/download options
 * 5. Saves photo to album
 * 6. Directs to next station
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Camera,
  RefreshCw,
  Download,
  Printer,
  ArrowRight,
  User,
  Loader2,
  CheckCircle2,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { createAlbum } from '@/services/eventsApi';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { BadgeTemplateConfig } from '@/components/templates/BadgeTemplateEditor';
import { processImageWithAI, downloadImageAsBase64 } from '@/services/aiProcessor';
import { Template } from '@/services/eventsApi';

type FlowState = 'input' | 'camera' | 'preview' | 'creating' | 'badge' | 'complete';

interface RegistrationBadgeFlowProps {
  eventId: number;
  eventName: string;
  userSlug: string;
  eventSlug: string;
  primaryColor?: string;
  badgeTemplate?: BadgeTemplateConfig;
  templates?: Template[]; // Event templates for AI pipeline source
  onComplete?: (albumCode: string) => void;
}

export function RegistrationBadgeFlow({
  eventId,
  eventName,
  userSlug,
  eventSlug,
  primaryColor = '#6366F1',
  badgeTemplate,
  templates = [],
  onComplete
}: RegistrationBadgeFlowProps) {
  const [state, setState] = useState<FlowState>('input');
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [processedPhoto, setProcessedPhoto] = useState<string | null>(null); // AI processed photo
  const [albumCode, setAlbumCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera with specific device
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      setIsCameraReady(false);
      
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // First change state to mount the video element
      setState('camera');
      
      const cameraId = deviceId || selectedCameraId;
      
      // Try with specific camera first, fallback to any camera
      let stream: MediaStream;
      try {
        const constraints: MediaStreamConstraints = {
          video: cameraId
            ? { deviceId: cameraId, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (constraintError) {
        // Fallback to any available camera
        console.warn('Specific camera failed, falling back to default:', constraintError);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      }
      
      streamRef.current = stream;
      
      // Enumerate cameras after we have permission
      if (availableCameras.length === 0) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(videoDevices);
        if (!selectedCameraId && videoDevices.length > 0) {
          setSelectedCameraId(videoDevices[0].deviceId);
        }
      }
      
      // The video element should now be mounted, attach stream
      // Use a small delay to ensure React has rendered the video element
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
      }, 100);
      
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Could not access camera. Please check permissions.');
      setState('input'); // Go back to input state on error
    }
  }, [selectedCameraId, availableCameras.length]);

  // Handle camera change
  const handleCameraChange = useCallback((newCameraId: string) => {
    setSelectedCameraId(newCameraId);
    if (state === 'camera') {
      startCamera(newCameraId);
    }
  }, [state, startCamera]);

  // Effect to attach stream to video element when in camera state
  useEffect(() => {
    if (state === 'camera' && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      
      video.onloadedmetadata = () => {
        video.play()
          .then(() => {
            setIsCameraReady(true);
          })
          .catch(err => {
            console.error('Error playing video:', err);
          });
      };
    }
  }, [state]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror the image for selfie
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
    }
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(dataUrl);
    stopCamera();
    setState('preview');
  }, [stopCamera]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    startCamera();
  }, [startCamera]);

  // Create album and badge (with optional AI processing)
  const createAlbumAndBadge = useCallback(async () => {
    if (!capturedPhoto) return;
    
    if (!eventId || eventId <= 0) {
      toast.error('Event not properly configured for registration');
      return;
    }
    
    setIsCreating(true);
    setState('creating');
    setProcessingStatus('Creating your badge...');
    
    try {
      // Check if AI Pipeline is enabled for badge
      const aiPipelineEnabled = badgeTemplate?.aiPipeline?.enabled === true;
      let finalPhoto = capturedPhoto;
      
      if (aiPipelineEnabled) {
        // If a source template is selected, use its prompt and images
        const sourceTemplateId = badgeTemplate?.aiPipeline?.sourceTemplateId;
        const sourceTemplate = sourceTemplateId 
          ? templates.find(t => t.id === sourceTemplateId)
          : null;
        
        // Get prompt and images from source template or badge config
        const prompt = sourceTemplate?.prompt || badgeTemplate?.aiPipeline?.prompt;
        const referenceImages = sourceTemplate?.images || badgeTemplate?.aiPipeline?.referenceImages || [];
        const aiModel = sourceTemplate?.pipelineConfig?.imageModel || badgeTemplate?.aiPipeline?.model;
        
        if (prompt) {
          setProcessingStatus('Processing photo with AI...');
          toast.info('Enhancing your photo with AI...', { duration: 5000 });
          
          console.log('🎨 Badge AI Pipeline:', {
            sourceTemplateId,
            sourceTemplateName: sourceTemplate?.name,
            prompt: prompt?.substring(0, 100) + '...',
            referenceImagesCount: referenceImages.length,
            aiModel
          });
          
          try {
            // Determine aspect ratio from badge layout or source template
            const aspectRatio = sourceTemplate?.aspectRatio 
              || (badgeTemplate?.layout === 'landscape' ? '16:9' 
                : badgeTemplate?.layout === 'square' ? '1:1' 
                : badgeTemplate?.aiPipeline?.outputRatio || '1:1');
            
            const result = await processImageWithAI({
              userPhotoBase64: capturedPhoto,
              backgroundPrompt: prompt,
              backgroundImageUrls: referenceImages,
              includeBranding: false,
              aspectRatio: aspectRatio as any,
              aiModel: aiModel,
              eventId,
              billingContext: "registration-badge",
              eventSlug,
              userSlug,
              onProgress: (status) => {
                if (status === 'queued') {
                  setProcessingStatus('Waiting in queue...');
                } else if (status === 'processing') {
                  setProcessingStatus('AI is working its magic...');
                }
              }
            });
            
            // Get the processed image
            if (result.url.startsWith('data:')) {
              finalPhoto = result.url;
            } else {
              finalPhoto = await downloadImageAsBase64(result.url);
            }
            
            setProcessedPhoto(finalPhoto);
            toast.success('Photo enhanced with AI! ✨');
          } catch (aiError: any) {
            console.error('AI processing failed:', aiError);
            toast.warning('AI enhancement failed, using original photo');
            // Continue with original photo if AI fails
          }
        } else {
          console.warn('⚠️ AI Pipeline enabled but no prompt found');
        }
      }
      
      setProcessingStatus('Creating album...');
      
      // Create album via API - pass parameters in correct order: eventId, orgId, ownerName, ownerEmail
      const album = await createAlbum(
        eventId,
        undefined, // orgId - not needed for registration
        visitorName || undefined,
        visitorEmail || undefined
      );
      
      setAlbumCode(album.code);
      
      // Note: The registration photo is for the badge only, not counted as an album photo.
      // Album photos are taken at the booth station and processed with AI.
      
      setState('badge');
      toast.success('Badge created successfully!');
    } catch (error: any) {
      console.error('Failed to create album:', error);
      toast.error(error.message || 'Failed to create badge. Please try again.');
      setState('preview');
    } finally {
      setIsCreating(false);
      setProcessingStatus('');
    }
  }, [capturedPhoto, eventId, visitorName, visitorEmail, badgeTemplate]);

  // Download badge with real QR code using badge template settings (including custom positions)
  const downloadBadge = useCallback(async () => {
    // Use processed photo if available, otherwise use captured photo
    const photoToUse = processedPhoto || capturedPhoto;
    if (!photoToUse || !albumCode) return;
    
    // Create a canvas with badge layout from template
    const canvas = document.createElement('canvas');
    const layout = badgeTemplate?.layout || 'portrait';
    
    // Set dimensions based on layout
    if (layout === 'portrait') {
      canvas.width = 600;
      canvas.height = 800;
    } else if (layout === 'landscape') {
      canvas.width = 800;
      canvas.height = 600;
    } else {
      canvas.width = 600;
      canvas.height = 600;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Check if using custom positions from visual editor
    const useCustom = badgeTemplate?.useCustomPositions && badgeTemplate?.customPositions;
    const customPos = badgeTemplate?.customPositions;
    
    // Draw background from template or use primary color
    if (badgeTemplate?.backgroundUrl) {
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        bgImg.onload = () => {
          ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
          resolve();
        };
        bgImg.onerror = () => {
          ctx.fillStyle = badgeTemplate?.backgroundColor || primaryColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          resolve();
        };
        bgImg.src = badgeTemplate.backgroundUrl!;
      });
    } else {
      ctx.fillStyle = badgeTemplate?.backgroundColor || primaryColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Calculate photo size and position
    const photoSizePercent = useCustom && customPos?.photo?.width 
      ? customPos.photo.width / 100
      : (badgeTemplate?.photoPlacement?.size === 'small' ? 0.25 
        : badgeTemplate?.photoPlacement?.size === 'large' ? 0.45 : 0.35);
    const photoSize = Math.min(canvas.width, canvas.height) * photoSizePercent;
    
    // Use custom positions or default centered positions
    const photoX = useCustom && customPos?.photo 
      ? (customPos.photo.x / 100) * canvas.width - photoSize / 2
      : (canvas.width - photoSize) / 2;
    const photoY = useCustom && customPos?.photo 
      ? (customPos.photo.y / 100) * canvas.height - photoSize / 2
      : 40;
    
    // Load and draw photo
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise<void>((resolve) => {
      img.onload = () => {
        ctx.save();
        
        // Apply shape from template
        const shape = badgeTemplate?.photoPlacement?.shape || 'circle';
        if (shape === 'circle') {
          ctx.beginPath();
          ctx.arc(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
        } else if (shape === 'rounded') {
          ctx.beginPath();
          ctx.roundRect(photoX, photoY, photoSize, photoSize, photoSize * 0.1);
          ctx.closePath();
          ctx.clip();
        }
        
        // Calculate "object-fit: cover" dimensions to maintain aspect ratio
        const imgAspect = img.width / img.height;
        const containerAspect = 1; // Square container (photoSize x photoSize)
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (imgAspect > containerAspect) {
          // Image is wider - fit height, crop width
          drawHeight = photoSize;
          drawWidth = photoSize * imgAspect;
          drawX = photoX - (drawWidth - photoSize) / 2;
          drawY = photoY;
        } else {
          // Image is taller - fit width, crop height
          drawWidth = photoSize;
          drawHeight = photoSize / imgAspect;
          drawX = photoX;
          drawY = photoY - (drawHeight - photoSize) / 2;
        }
        
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
        
        // Draw border around photo
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 4;
        if (shape === 'circle') {
          ctx.beginPath();
          ctx.arc(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.roundRect(photoX, photoY, photoSize, photoSize, shape === 'rounded' ? photoSize * 0.1 : 0);
          ctx.stroke();
        }
        
        resolve();
      };
      img.onerror = () => resolve();
      img.src = photoToUse;
    });
    
    // Draw text with template styles and custom positions
    const textStyle = badgeTemplate?.textStyle;
    ctx.textAlign = 'center';
    
    // Name
    if (badgeTemplate?.fields?.showName !== false && visitorName) {
      ctx.fillStyle = textStyle?.nameColor || 'white';
      const nameFontSize = Math.round(canvas.height * (textStyle?.nameFontSize || 5) / 100);
      ctx.font = `bold ${nameFontSize}px ${textStyle?.fontFamily || 'sans-serif'}`;
      
      const nameX = useCustom && customPos?.name 
        ? (customPos.name.x / 100) * canvas.width 
        : canvas.width / 2;
      const nameY = useCustom && customPos?.name 
        ? (customPos.name.y / 100) * canvas.height 
        : photoY + photoSize + 50;
      
      ctx.fillText(visitorName, nameX, nameY);
    }
    
    // Event name
    if (badgeTemplate?.fields?.showEventName !== false) {
      ctx.fillStyle = textStyle?.eventNameColor || 'rgba(255,255,255,0.9)';
      const eventFontSize = Math.round(canvas.height * (textStyle?.eventNameFontSize || 3.5) / 100);
      ctx.font = `${eventFontSize}px ${textStyle?.fontFamily || 'sans-serif'}`;
      
      const eventX = useCustom && customPos?.eventName 
        ? (customPos.eventName.x / 100) * canvas.width 
        : canvas.width / 2;
      const eventY = useCustom && customPos?.eventName 
        ? (customPos.eventName.y / 100) * canvas.height 
        : photoY + photoSize + 90;
      
      ctx.fillText(eventName, eventX, eventY);
    }
    
    // Date
    if (badgeTemplate?.fields?.showDateTime !== false) {
      ctx.fillStyle = textStyle?.dateTimeColor || 'rgba(255,255,255,0.7)';
      const dateFontSize = Math.round(canvas.height * (textStyle?.dateTimeFontSize || 2.5) / 100);
      ctx.font = `${dateFontSize}px ${textStyle?.fontFamily || 'sans-serif'}`;
      
      const dateX = useCustom && customPos?.dateTime 
        ? (customPos.dateTime.x / 100) * canvas.width 
        : canvas.width / 2;
      const dateY = useCustom && customPos?.dateTime 
        ? (customPos.dateTime.y / 100) * canvas.height 
        : photoY + photoSize + 120;
      
      ctx.fillText(new Date().toLocaleDateString(), dateX, dateY);
    }
    
    // Generate and draw real QR code
    if (badgeTemplate?.qrCode?.enabled !== false) {
      const qrUrl = `${window.location.origin}/${userSlug}/${eventSlug}/booth?album=${albumCode}`;
      const qrSizePercent = useCustom && customPos?.qrCode?.width 
        ? customPos.qrCode.width / 100
        : (badgeTemplate?.qrCode?.size === 'small' ? 0.15 
          : badgeTemplate?.qrCode?.size === 'large' ? 0.25 : 0.20);
      const qrSize = Math.min(canvas.width, canvas.height) * qrSizePercent;
      
      const qrX = useCustom && customPos?.qrCode 
        ? (customPos.qrCode.x / 100) * canvas.width - qrSize / 2
        : (canvas.width - qrSize) / 2;
      const qrY = useCustom && customPos?.qrCode 
        ? (customPos.qrCode.y / 100) * canvas.height - qrSize / 2
        : canvas.height - qrSize - 50;
      
      // Draw white background for QR
      ctx.fillStyle = 'white';
      const padding = 8;
      ctx.beginPath();
      ctx.roundRect(qrX - padding, qrY - padding, qrSize + padding * 2, qrSize + padding * 2, 8);
      ctx.fill();
      
      // Generate QR code to canvas using qrcode library
      try {
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          width: qrSize,
          margin: 0,
          color: { dark: '#000000', light: '#ffffff' }
        });
        
        const qrImg = new Image();
        await new Promise<void>((resolveQr) => {
          qrImg.onload = () => {
            ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
            resolveQr();
          };
          qrImg.onerror = () => resolveQr();
          qrImg.src = qrDataUrl;
        });
      } catch (qrError) {
        console.error('QR generation failed:', qrError);
      }
      
      // Draw album code below QR
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(albumCode, qrX + qrSize / 2, qrY + qrSize + padding + 20);
    }
    
    // Download
    const link = document.createElement('a');
    link.download = `badge-${albumCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    toast.success('Badge downloaded!');
  }, [capturedPhoto, processedPhoto, albumCode, badgeTemplate, primaryColor, visitorName, eventName, userSlug, eventSlug]);

  // Print badge - opens browser print dialog with template settings
  const printBadge = useCallback(() => {
    // Create a printable version of the badge
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }
    
    const qrUrl = `${window.location.origin}/${userSlug}/${eventSlug}/booth?album=${albumCode}`;
    const bgColor = badgeTemplate?.backgroundColor || primaryColor;
    const bgImage = badgeTemplate?.backgroundUrl ? `url(${badgeTemplate.backgroundUrl})` : 'none';
    const photoShape = badgeTemplate?.photoPlacement?.shape === 'rounded' ? '15px' 
      : badgeTemplate?.photoPlacement?.shape === 'square' ? '0' : '50%';
    const nameColor = badgeTemplate?.textStyle?.nameColor || 'white';
    const eventColor = badgeTemplate?.textStyle?.eventNameColor || 'rgba(255,255,255,0.9)';
    const dateColor = badgeTemplate?.textStyle?.dateTimeColor || 'rgba(255,255,255,0.7)';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Badge - ${visitorName || albumCode}</title>
          <style>
            @page { size: 3in 4in; margin: 0; }
            body { 
              margin: 0; 
              padding: 20px;
              font-family: ${badgeTemplate?.textStyle?.fontFamily || 'system-ui, -apple-system, sans-serif'};
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: ${bgColor};
              background-image: ${bgImage};
              background-size: cover;
              background-position: center;
            }
            .badge {
              padding: 30px;
              text-align: center;
              width: 280px;
            }
            .photo {
              width: 120px;
              height: 120px;
              border-radius: ${photoShape};
              object-fit: cover;
              border: 4px solid rgba(255,255,255,0.3);
              margin-bottom: 20px;
            }
            .name { font-size: 24px; font-weight: bold; margin-bottom: 8px; color: ${nameColor}; }
            .event { font-size: 16px; margin-bottom: 4px; color: ${eventColor}; }
            .date { font-size: 14px; margin-bottom: 20px; color: ${dateColor}; }
            .qr-container { 
              background: white; 
              padding: 15px; 
              border-radius: 8px; 
              display: inline-block;
              margin-bottom: 10px;
            }
            .code { font-family: monospace; font-size: 14px; color: rgba(255,255,255,0.9); }
          </style>
        </head>
        <body>
          <div class="badge">
            <img src="${processedPhoto || capturedPhoto}" class="photo" />
            ${badgeTemplate?.fields?.showName !== false && visitorName ? `<div class="name">${visitorName}</div>` : ''}
            ${badgeTemplate?.fields?.showEventName !== false ? `<div class="event">${eventName}</div>` : ''}
            ${badgeTemplate?.fields?.showDateTime !== false ? `<div class="date">${new Date().toLocaleDateString()}</div>` : ''}
            ${badgeTemplate?.qrCode?.enabled !== false ? `
              <div class="qr-container">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrUrl)}" width="100" height="100" />
              </div>
              <div class="code">${albumCode}</div>
            ` : ''}
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    toast.success('Opening print dialog...');
  }, [capturedPhoto, processedPhoto, albumCode, visitorName, eventName, primaryColor, badgeTemplate, userSlug, eventSlug]);

  // Continue to next station
  const continueToNextStation = useCallback(() => {
    if (albumCode && onComplete) {
      onComplete(albumCode);
    }
    // Navigate to booth with album code
    window.location.href = `/${userSlug}/${eventSlug}/booth?album=${albumCode}`;
  }, [albumCode, onComplete, userSlug, eventSlug]);

  // Render based on state
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-zinc-900 border-zinc-800">
        {/* Input State - Collect visitor info */}
        {state === 'input' && (
          <>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                <User className="w-8 h-8" style={{ color: primaryColor }} />
              </div>
              <CardTitle className="text-2xl text-white">Welcome!</CardTitle>
              <CardDescription className="text-zinc-400">
                Let's create your event badge for {eventName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">Your Name</Label>
                <Input
                  id="name"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                  placeholder="For receiving your photos"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <Button
                onClick={startCamera}
                className="w-full mt-4"
                style={{ backgroundColor: primaryColor }}
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Profile Photo
              </Button>
            </CardContent>
          </>
        )}

        {/* Camera State */}
        {state === 'camera' && (
          <>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl text-white">Take Your Photo</CardTitle>
              <CardDescription className="text-zinc-400">
                Position yourself in the frame
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Camera Selector - show when multiple cameras available */}
              {availableCameras.length > 1 && (
                <Select value={selectedCameraId} onValueChange={handleCameraChange}>
                  <SelectTrigger className="w-full bg-zinc-800/50 border-white/10 text-white">
                    <Camera className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {availableCameras.map((camera, index) => (
                      <SelectItem 
                        key={camera.deviceId} 
                        value={camera.deviceId}
                        className="text-white hover:bg-zinc-800"
                      >
                        {camera.label || `Camera ${index + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <div className="relative aspect-[3/4] bg-black rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                  onCanPlay={() => {
                    // Ensure video plays when ready
                    videoRef.current?.play()
                      .then(() => setIsCameraReady(true))
                      .catch(() => {});
                  }}
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Loading overlay - shown until video is playing */}
                {!isCameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-2" />
                      <p className="text-sm text-zinc-400">Starting camera...</p>
                    </div>
                  </div>
                )}
              </div>
              <Button
                onClick={capturePhoto}
                className="w-full"
                size="lg"
                style={{ backgroundColor: primaryColor }}
                disabled={!isCameraReady}
              >
                <Camera className="w-5 h-5 mr-2" />
                {isCameraReady ? 'Capture Photo' : 'Waiting for camera...'}
              </Button>
            </CardContent>
          </>
        )}

        {/* Preview State */}
        {state === 'preview' && capturedPhoto && (
          <>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl text-white">Looking Good!</CardTitle>
              <CardDescription className="text-zinc-400">
                Happy with this photo?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative aspect-[3/4] bg-black rounded-xl overflow-hidden">
                <img
                  src={capturedPhoto}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-300"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retake
                </Button>
                <Button
                  onClick={createAlbumAndBadge}
                  className="flex-1"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Badge
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Creating State */}
        {state === 'creating' && (
          <CardContent className="py-16 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: primaryColor }} />
            <p className="text-lg text-white">{processingStatus || 'Creating your badge...'}</p>
            <p className="text-sm text-zinc-400 mt-2">
              {badgeTemplate?.aiPipeline?.enabled 
                ? 'AI enhancement may take a few moments' 
                : 'This will just take a moment'}
            </p>
          </CardContent>
        )}

        {/* Badge State */}
        {state === 'badge' && capturedPhoto && albumCode && (
          <>
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <CardTitle className="text-xl text-white">Badge Created!</CardTitle>
              <CardDescription className="text-zinc-400">
                Your album is ready
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Badge Preview - uses badge template settings including custom positions */}
              {(() => {
                const useCustom = badgeTemplate?.useCustomPositions && badgeTemplate?.customPositions;
                const customPos = badgeTemplate?.customPositions;
                const layout = badgeTemplate?.layout || 'portrait';
                const aspectRatio = layout === 'landscape' ? '4/3' : layout === 'square' ? '1/1' : '3/4';
                
                return (
                  <div 
                    className="relative rounded-xl overflow-hidden"
                    style={{ 
                      backgroundColor: badgeTemplate?.backgroundUrl ? undefined : (badgeTemplate?.backgroundColor || primaryColor),
                      backgroundImage: badgeTemplate?.backgroundUrl ? `url(${badgeTemplate.backgroundUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      aspectRatio,
                      minHeight: '280px',
                    }}
                  >
                    {/* Photo with template shape and custom position */}
                    <div 
                      className={`absolute overflow-hidden border-4 border-white/30 ${
                        badgeTemplate?.photoPlacement?.shape === 'rounded' ? 'rounded-xl' :
                        badgeTemplate?.photoPlacement?.shape === 'square' ? 'rounded-none' : 'rounded-full'
                      }`}
                      style={{
                        width: `${(useCustom && customPos?.photo?.width) || (badgeTemplate?.photoPlacement?.size === 'small' ? 20 : badgeTemplate?.photoPlacement?.size === 'large' ? 40 : 30)}%`,
                        aspectRatio: '1/1',
                        left: `${(useCustom && customPos?.photo?.x) || 50}%`,
                        top: `${(useCustom && customPos?.photo?.y) || 25}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <img
                        src={processedPhoto || capturedPhoto}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Name */}
                    {badgeTemplate?.fields?.showName !== false && visitorName && (
                      <p 
                        className="absolute text-lg font-bold whitespace-nowrap"
                        style={{ 
                          color: badgeTemplate?.textStyle?.nameColor || 'white',
                          left: `${(useCustom && customPos?.name?.x) || 50}%`,
                          top: `${(useCustom && customPos?.name?.y) || 55}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        {visitorName}
                      </p>
                    )}
                    
                    {/* Event name */}
                    {badgeTemplate?.fields?.showEventName !== false && (
                      <p 
                        className="absolute text-sm whitespace-nowrap"
                        style={{ 
                          color: badgeTemplate?.textStyle?.eventNameColor || 'rgba(255,255,255,0.8)',
                          left: `${(useCustom && customPos?.eventName?.x) || 50}%`,
                          top: `${(useCustom && customPos?.eventName?.y) || 62}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        {eventName}
                      </p>
                    )}
                    
                    {/* Date */}
                    {badgeTemplate?.fields?.showDateTime !== false && (
                      <p 
                        className="absolute text-xs whitespace-nowrap"
                        style={{ 
                          color: badgeTemplate?.textStyle?.dateTimeColor || 'rgba(255,255,255,0.6)',
                          left: `${(useCustom && customPos?.dateTime?.x) || 50}%`,
                          top: `${(useCustom && customPos?.dateTime?.y) || 68}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        {new Date().toLocaleDateString()}
                      </p>
                    )}
                    
                    {/* Real QR Code */}
                    {badgeTemplate?.qrCode?.enabled !== false && (
                      <div 
                        className="absolute flex flex-col items-center"
                        style={{
                          left: `${(useCustom && customPos?.qrCode?.x) || 50}%`,
                          top: `${(useCustom && customPos?.qrCode?.y) || 85}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <div className="p-2 bg-white rounded-lg" data-qr-code>
                          <QRCodeSVG 
                            value={`${window.location.origin}/${userSlug}/${eventSlug}/booth?album=${albumCode}`}
                            size={60}
                            level="M"
                            includeMargin={false}
                          />
                        </div>
                        <p className="mt-1 font-mono text-xs text-white/80">{albumCode}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={downloadBadge}
                  variant="outline"
                  className="border-zinc-700 text-zinc-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={printBadge}
                  variant="outline"
                  className="border-zinc-700 text-zinc-300"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>

              <Button
                onClick={continueToNextStation}
                className="w-full"
                size="lg"
                style={{ backgroundColor: primaryColor }}
              >
                Continue to Photo Booth
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

export default RegistrationBadgeFlow;

