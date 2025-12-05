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
  ChevronDown,
  Users,
  UserPlus,
  Check
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { createAlbum, addAlbumPhoto } from '@/services/eventsApi';
import { savePhotoToCloud } from '@/services/cloudStorage';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { BadgeTemplateConfig } from '@/components/templates/BadgeTemplateEditor';
import { processImageWithAI, downloadImageAsBase64 } from '@/services/aiProcessor';
import { Template } from '@/services/eventsApi';

type FlowState = 'mode-select' | 'input' | 'camera' | 'preview' | 'creating' | 'group-continue' | 'badge' | 'complete';
type BadgeMode = 'individual' | 'group';

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
  const [state, setState] = useState<FlowState>('mode-select');
  const [badgeMode, setBadgeMode] = useState<BadgeMode>('individual');
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [groupName, setGroupName] = useState(''); // For group badge (e.g., "The Smith Family")
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [processedPhoto, setProcessedPhoto] = useState<string | null>(null); // AI processed photo
  const [albumCode, setAlbumCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [groupPhotoCount, setGroupPhotoCount] = useState(0); // Track how many photos taken in group mode
  const [groupPhotos, setGroupPhotos] = useState<string[]>([]); // Store original group photos
  const [groupProcessedPhotos, setGroupProcessedPhotos] = useState<string[]>([]); // Store AI processed photos for badges
  const [groupMemberNames, setGroupMemberNames] = useState<string[]>([]); // Store individual member names
  const [currentMemberName, setCurrentMemberName] = useState(''); // Current member being photographed
  const [selectedGroupMember, setSelectedGroupMember] = useState(0); // Which member's badge to show
  
  // Debug: Log badge template configuration on mount
  useEffect(() => {
    console.log('🏷️ RegistrationBadgeFlow mounted with badgeTemplate:', {
      badgeTemplate: badgeTemplate ? 'exists' : 'undefined/null',
      enabled: badgeTemplate?.enabled,
      aiPipeline: badgeTemplate?.aiPipeline,
      aiPipelineEnabled: badgeTemplate?.aiPipeline?.enabled,
      prompt: badgeTemplate?.aiPipeline?.prompt?.substring(0, 50),
      model: badgeTemplate?.aiPipeline?.model,
      sourceTemplateId: badgeTemplate?.aiPipeline?.sourceTemplateId,
      templatesCount: templates.length,
    });
    
    if (badgeTemplate?.aiPipeline?.sourceTemplateId) {
      const sourceTemplate = templates.find(t => t.id === badgeTemplate.aiPipeline.sourceTemplateId);
      console.log('🔗 Source template lookup:', {
        sourceTemplateId: badgeTemplate.aiPipeline.sourceTemplateId,
        found: sourceTemplate ? 'yes' : 'no',
        templateName: sourceTemplate?.name,
        templatePrompt: sourceTemplate?.prompt?.substring(0, 50),
      });
    }
  }, [badgeTemplate, templates]);
  
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
  }, [capturedPhoto, eventId, visitorName, visitorEmail, badgeTemplate, templates, eventSlug, userSlug]);

  // Add photo to group (for group mode)
  const addPhotoToGroup = useCallback(async () => {
    if (!capturedPhoto) return;
    
    setIsCreating(true);
    setState('creating');
    setProcessingStatus('Processing group member photo...');
    
    try {
      // Check if AI Pipeline is enabled for badge
      const aiPipelineEnabled = badgeTemplate?.aiPipeline?.enabled === true;
      let finalPhoto = capturedPhoto;
      
      console.log('🎨 Group Badge AI Pipeline check:', {
        aiPipelineEnabled,
        badgeTemplate: badgeTemplate ? 'exists' : 'null',
        aiPipeline: badgeTemplate?.aiPipeline,
      });
      
      if (aiPipelineEnabled) {
        const sourceTemplateId = badgeTemplate?.aiPipeline?.sourceTemplateId;
        const sourceTemplate = sourceTemplateId 
          ? templates.find(t => t.id === sourceTemplateId)
          : null;
        
        const prompt = sourceTemplate?.prompt || badgeTemplate?.aiPipeline?.prompt;
        const referenceImages = sourceTemplate?.images || badgeTemplate?.aiPipeline?.referenceImages || [];
        const aiModel = sourceTemplate?.pipelineConfig?.imageModel || badgeTemplate?.aiPipeline?.model;
        
        console.log('🎨 Group Badge AI config:', {
          sourceTemplateId,
          sourceTemplateName: sourceTemplate?.name,
          prompt: prompt?.substring(0, 50) + '...',
          referenceImagesCount: referenceImages.length,
          aiModel,
        });
        
        if (prompt) {
          setProcessingStatus('Enhancing photo with AI...');
          toast.info('Processing with AI...', { duration: 3000 });
          
          try {
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
              billingContext: "registration-badge-group",
              eventSlug,
              userSlug,
              skipTokenCharge: false,
            });
            
            console.log('✅ AI processing complete for group member');
            
            if (result.url.startsWith('data:')) {
              finalPhoto = result.url;
            } else {
              finalPhoto = await downloadImageAsBase64(result.url);
            }
            toast.success('Photo enhanced with AI! ✨');
          } catch (aiError) {
            console.error('❌ AI processing failed for group member:', aiError);
            toast.warning('AI enhancement failed, using original photo');
          }
        } else {
          console.warn('⚠️ AI Pipeline enabled but no prompt found');
        }
      } else {
        console.log('ℹ️ AI Pipeline not enabled for badge');
      }
      
      // If no album code yet, create one for the group
      let currentAlbumCode = albumCode;
      if (!currentAlbumCode) {
        setProcessingStatus('Creating group album...');
        const album = await createAlbum(
          eventId,
          undefined,
          groupName || 'Group',
          visitorEmail || undefined
        );
        currentAlbumCode = album.code;
        setAlbumCode(album.code);
      }
      
      // Save photo to cloud storage and add to album
      setProcessingStatus('Saving photo...');
      try {
        const cloudPhoto = await savePhotoToCloud({
          originalImageBase64: capturedPhoto,
          processedImageBase64: finalPhoto,
          backgroundId: 'registration-group',
          backgroundName: 'Group Registration',
          prompt: '',
          userSlug,
          eventSlug,
        });
        
        // Add photo to album with special station_type that doesn't count toward limit
        await addAlbumPhoto(currentAlbumCode, cloudPhoto.shareCode, 'registration-group');
      } catch (saveError) {
        console.warn('Failed to save group photo to album:', saveError);
        // Continue anyway - the photo is still captured
      }
      
      // Add photo to group photos arrays (original and processed)
      setGroupPhotos(prev => [...prev, capturedPhoto]); // Original photo
      setGroupProcessedPhotos(prev => [...prev, finalPhoto]); // AI processed photo
      setGroupMemberNames(prev => [...prev, currentMemberName || `Member ${groupPhotoCount + 1}`]); // Member name
      setGroupPhotoCount(prev => prev + 1);
      
      // Reset for next person
      setCapturedPhoto(null);
      setProcessedPhoto(null);
      setCurrentMemberName(''); // Reset member name for next person
      
      // Show group continue screen
      setState('group-continue');
      toast.success(`${currentMemberName || `Member ${groupPhotoCount + 1}`} added to group!`);
      
    } catch (error: any) {
      console.error('Failed to process group photo:', error);
      toast.error(error.message || 'Failed to process photo');
      setState('preview');
    } finally {
      setIsCreating(false);
      setProcessingStatus('');
    }
  }, [capturedPhoto, eventId, groupName, visitorEmail, badgeTemplate, templates, eventSlug, userSlug, albumCode, groupPhotoCount, currentMemberName]);

  // Finish group and show badge
  const finishGroup = useCallback(() => {
    if (groupProcessedPhotos.length === 0) {
      toast.error('Please take at least one photo');
      return;
    }
    // Use first member's processed photo as default
    setSelectedGroupMember(0);
    setProcessedPhoto(groupProcessedPhotos[0]);
    setCapturedPhoto(groupPhotos[0]);
    setState('badge');
    toast.success(`Group badges created for ${groupProcessedPhotos.length} members!`);
  }, [groupPhotos, groupProcessedPhotos]);

  // Take another group photo
  const takeAnotherGroupPhoto = useCallback(() => {
    startCamera();
  }, [startCamera]);

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
        {/* Mode Selection State */}
        {state === 'mode-select' && (
          <>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                <Camera className="w-8 h-8" style={{ color: primaryColor }} />
              </div>
              <CardTitle className="text-2xl text-white">Welcome!</CardTitle>
              <CardDescription className="text-zinc-400">
                How would you like to register for {eventName}?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Individual Badge Option */}
              <button
                onClick={() => {
                  setBadgeMode('individual');
                  setState('input');
                }}
                className="w-full p-6 rounded-xl border-2 border-zinc-700 hover:border-indigo-500 bg-zinc-800/50 hover:bg-zinc-800 transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
                    <User className="w-7 h-7 text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">Individual Badge</h3>
                    <p className="text-sm text-zinc-400">One person, one badge, one album code</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                </div>
              </button>

              {/* Group Badge Option */}
              <button
                onClick={() => {
                  setBadgeMode('group');
                  setState('input');
                }}
                className="w-full p-6 rounded-xl border-2 border-zinc-700 hover:border-purple-500 bg-zinc-800/50 hover:bg-zinc-800 transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                    <Users className="w-7 h-7 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">Group Badge</h3>
                    <p className="text-sm text-zinc-400">Family or group shares one album code</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                </div>
              </button>
            </CardContent>
          </>
        )}

        {/* Input State - Collect visitor info */}
        {state === 'input' && (
          <>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: badgeMode === 'group' ? 'rgba(168, 85, 247, 0.2)' : `${primaryColor}20` }}>
                {badgeMode === 'group' ? (
                  <Users className="w-8 h-8 text-purple-400" />
                ) : (
                  <User className="w-8 h-8" style={{ color: primaryColor }} />
                )}
              </div>
              <CardTitle className="text-2xl text-white">
                {badgeMode === 'group' ? 'Group Registration' : 'Welcome!'}
              </CardTitle>
              <CardDescription className="text-zinc-400">
                {badgeMode === 'group' 
                  ? 'Register your family or group for ' + eventName
                  : 'Let\'s create your event badge for ' + eventName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {badgeMode === 'group' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="groupName" className="text-zinc-300">Group/Family Name</Label>
                    <Input
                      id="groupName"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g., The Smith Family"
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
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-sm text-purple-300">
                      <Users className="w-4 h-4 inline mr-2" />
                      Each group member will take a photo. You'll share one album code.
                    </p>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => setState('mode-select')}
                  variant="outline"
                  className="border-zinc-700 text-zinc-300"
                >
                  Back
                </Button>
                <Button
                  onClick={startCamera}
                  className="flex-1"
                  style={{ backgroundColor: badgeMode === 'group' ? '#a855f7' : primaryColor }}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {badgeMode === 'group' ? 'Start Group Photos' : 'Take Profile Photo'}
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Camera State */}
        {state === 'camera' && (
          <>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl text-white">
                {badgeMode === 'group' ? `Member ${groupPhotoCount + 1}` : 'Take Your Photo'}
              </CardTitle>
              <CardDescription className="text-zinc-400">
                {badgeMode === 'group' 
                  ? `Taking photo for ${groupName || 'group'} - member ${groupPhotoCount + 1}`
                  : 'Position yourself in the frame'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Member name input for group mode */}
              {badgeMode === 'group' && (
                <div className="space-y-2">
                  <Label htmlFor="memberName" className="text-zinc-300">Member Name</Label>
                  <Input
                    id="memberName"
                    value={currentMemberName}
                    onChange={(e) => setCurrentMemberName(e.target.value)}
                    placeholder={`Enter name for member ${groupPhotoCount + 1}`}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              )}
              
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
              <CardTitle className="text-xl text-white">
                {badgeMode === 'group' ? `Member ${groupPhotoCount + 1}` : 'Looking Good!'}
              </CardTitle>
              <CardDescription className="text-zinc-400">
                {badgeMode === 'group' 
                  ? `Photo for group member ${groupPhotoCount + 1}` 
                  : 'Happy with this photo?'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show existing group photos */}
              {badgeMode === 'group' && groupPhotos.length > 0 && (
                <div className="flex gap-2 justify-center mb-2">
                  {groupPhotos.map((photo, idx) => (
                    <div key={idx} className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-500">
                      <img src={photo} alt={`Member ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-purple-400 flex items-center justify-center">
                    <span className="text-purple-400 text-xs">+1</span>
                  </div>
                </div>
              )}
              
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
                {badgeMode === 'group' ? (
                  <Button
                    onClick={addPhotoToGroup}
                    className="flex-1"
                    style={{ backgroundColor: '#a855f7' }}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add to Group
                  </Button>
                ) : (
                  <Button
                    onClick={createAlbumAndBadge}
                    className="flex-1"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Badge
                  </Button>
                )}
              </div>
            </CardContent>
          </>
        )}

        {/* Creating State */}
        {state === 'creating' && (
          <CardContent className="py-16 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: badgeMode === 'group' ? '#a855f7' : primaryColor }} />
            <p className="text-lg text-white">{processingStatus || 'Creating your badge...'}</p>
            <p className="text-sm text-zinc-400 mt-2">
              {badgeTemplate?.aiPipeline?.enabled 
                ? 'AI enhancement may take a few moments' 
                : 'This will just take a moment'}
            </p>
          </CardContent>
        )}

        {/* Group Continue State - Ask to add more or finish */}
        {state === 'group-continue' && (
          <>
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-purple-400" />
              </div>
              <CardTitle className="text-xl text-white">
                {groupPhotoCount} {groupPhotoCount === 1 ? 'Member' : 'Members'} Added!
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Add more group members or finish registration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show all group photos (processed versions) with names */}
              <div className="flex flex-wrap gap-4 justify-center py-4">
                {groupProcessedPhotos.map((photo, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-purple-500 shadow-lg">
                        <img src={photo} alt={groupMemberNames[idx] || `Member ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-xs text-white font-bold">
                        {idx + 1}
                      </div>
                    </div>
                    <span className="text-xs text-zinc-400 mt-1 max-w-[80px] truncate">
                      {groupMemberNames[idx] || `Member ${idx + 1}`}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Album code display */}
              {albumCode && (
                <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-400 mb-1">Group Album Code</p>
                  <p className="text-lg font-mono text-purple-400 tracking-widest">{albumCode}</p>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  onClick={takeAnotherGroupPhoto}
                  variant="outline"
                  className="flex-1 border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Another
                </Button>
                <Button
                  onClick={finishGroup}
                  className="flex-1 bg-purple-500 hover:bg-purple-600"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Finish Group
                </Button>
              </div>
              
              <p className="text-xs text-center text-zinc-500">
                All group members will share this album code
              </p>
            </CardContent>
          </>
        )}

        {/* Badge State */}
        {state === 'badge' && capturedPhoto && albumCode && (
          <>
            <CardHeader className="text-center pb-2">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${badgeMode === 'group' ? 'bg-purple-500/20' : 'bg-green-500/20'}`}>
                <CheckCircle2 className={`w-8 h-8 ${badgeMode === 'group' ? 'text-purple-400' : 'text-green-400'}`} />
              </div>
              <CardTitle className="text-xl text-white">
                {badgeMode === 'group' ? 'Group Badge Created!' : 'Badge Created!'}
              </CardTitle>
              <CardDescription className="text-zinc-400">
                {badgeMode === 'group' 
                  ? `${groupPhotoCount} members registered` 
                  : 'Your album is ready'}
              </CardDescription>
              
              {/* Group member selector - click to view/print individual badges */}
              {badgeMode === 'group' && groupProcessedPhotos.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-zinc-500 mb-2">Select a member to view/download their badge:</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {groupProcessedPhotos.map((photo, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedGroupMember(idx);
                          setProcessedPhoto(groupProcessedPhotos[idx]);
                          setCapturedPhoto(groupPhotos[idx]);
                        }}
                        className={`flex flex-col items-center transition-all ${
                          selectedGroupMember === idx ? 'scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className={`relative w-14 h-14 rounded-full overflow-hidden ${
                          selectedGroupMember === idx 
                            ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-zinc-900' 
                            : 'border-2 border-zinc-600'
                        }`}>
                          <img src={photo} alt={groupMemberNames[idx] || `Member ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                        <span className={`text-xs mt-1 max-w-[70px] truncate ${
                          selectedGroupMember === idx ? 'text-purple-400 font-medium' : 'text-zinc-500'
                        }`}>
                          {groupMemberNames[idx] || `Member ${idx + 1}`}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-purple-400 mt-3 font-medium">
                    Viewing: {groupMemberNames[selectedGroupMember] || `Member ${selectedGroupMember + 1}`}
                  </p>
                </div>
              )}
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
                    
                    {/* Name - for groups show member name, for individual show visitor name */}
                    {badgeTemplate?.fields?.showName !== false && (
                      <p 
                        className="absolute text-lg font-bold whitespace-nowrap"
                        style={{ 
                          color: badgeTemplate?.textStyle?.nameColor || 'white',
                          left: `${(useCustom && customPos?.name?.x) || 50}%`,
                          top: `${(useCustom && customPos?.name?.y) || 55}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        {badgeMode === 'group' 
                          ? (groupMemberNames[selectedGroupMember] || `Member ${selectedGroupMember + 1}`)
                          : visitorName}
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
                  {badgeMode === 'group' ? `Download #${selectedGroupMember + 1}` : 'Download'}
                </Button>
                <Button
                  onClick={printBadge}
                  variant="outline"
                  className="border-zinc-700 text-zinc-300"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  {badgeMode === 'group' ? `Print #${selectedGroupMember + 1}` : 'Print'}
                </Button>
              </div>
              
              {/* Download/Print All for group mode */}
              {badgeMode === 'group' && groupProcessedPhotos.length > 1 && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={async () => {
                      for (let i = 0; i < groupProcessedPhotos.length; i++) {
                        setSelectedGroupMember(i);
                        setProcessedPhoto(groupProcessedPhotos[i]);
                        setCapturedPhoto(groupPhotos[i]);
                        await new Promise(resolve => setTimeout(resolve, 100));
                        await downloadBadge();
                        await new Promise(resolve => setTimeout(resolve, 500));
                      }
                      toast.success(`Downloaded ${groupProcessedPhotos.length} badges!`);
                    }}
                    variant="outline"
                    className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download All ({groupProcessedPhotos.length})
                  </Button>
                  <Button
                    onClick={async () => {
                      for (let i = 0; i < groupProcessedPhotos.length; i++) {
                        setSelectedGroupMember(i);
                        setProcessedPhoto(groupProcessedPhotos[i]);
                        setCapturedPhoto(groupPhotos[i]);
                        await new Promise(resolve => setTimeout(resolve, 100));
                        printBadge();
                        await new Promise(resolve => setTimeout(resolve, 1000));
                      }
                    }}
                    variant="outline"
                    className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print All ({groupProcessedPhotos.length})
                  </Button>
                </div>
              )}

              <Button
                onClick={continueToNextStation}
                className="w-full"
                size="lg"
                style={{ backgroundColor: badgeMode === 'group' ? '#a855f7' : primaryColor }}
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

