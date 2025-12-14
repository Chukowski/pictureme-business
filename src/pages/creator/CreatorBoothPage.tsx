import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getCurrentUser,
  User,
  getUserBooths,
  EventConfig,
  uploadPhotoToEvent,
  createBooth
} from "@/services/eventsApi";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CameraCapture } from "@/components/CameraCapture";
import { BackgroundSelector } from "@/components/BackgroundSelector";
import { ProcessingLoader } from "@/components/ProcessingLoader";
import { ResultDisplay } from "@/components/ResultDisplay";
import { processImageWithAI, downloadImageAsBase64 } from "@/services/aiProcessor";
import { toast } from "sonner";

type AppState = 'select' | 'camera' | 'processing' | 'result';

export default function CreatorBoothPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [currentState, setCurrentState] = useState<AppState>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const [boothEvent, setBoothEvent] = useState<EventConfig | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate("/admin/auth");
      return;
    }
    setUser(currentUser);
    loadBooth(currentUser);
  }, [navigate, eventId]);

  const loadBooth = async (currentUser: User) => {
    try {
      if (eventId) {
        // Load specific booth
        const booths = await getUserBooths();
        const found = booths.find(b => b._id === eventId || b.id === Number(eventId));
        if (found) {
          setBoothEvent(found);
          return;
        }
      }

      // If no ID or not found, try to find a default one or create one (legacy fallback)
      // Ideally we shouldn't get here if routed correctly.
      if (!eventId) {
        // Maybe fallback to first available booth?
        const booths = await getUserBooths();
        if (booths.length > 0) {
          setBoothEvent(booths[0]);
          return;
        }

        // Create one if absolutely none exist (fallback)
        try {
          const newBooth = await createBooth({
            slug: `booth-${Date.now()}`,
            title: "My Personal Booth",
            description: "Your personal AI photo booth",
            theme: { mode: 'dark' }
          });
          setBoothEvent(newBooth);
        } catch (e) {
          console.error("Failed to create booth", e);
        }
      }
    } catch (error) {
      console.error("Failed to load booth", error);
      toast.error("Failed to load booth configuration");
    }
  };

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setCurrentState('camera');
  };

  const handleCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setCurrentState('processing');
    setIsProcessing(true);
    setStatusMessage("AI is doing its magic...");

    try {
      if (!selectedTemplate) throw new Error("No template selected");

      const result = await processImageWithAI({
        userPhotoBase64: imageData,
        backgroundPrompt: selectedTemplate.prompt,
        backgroundImageUrl: selectedTemplate.images[0],
        aspectRatio: '9:16', // Default for booth
        aiModel: boothEvent?.settings?.aiModel || 'nano-banana',
        onProgress: (status) => setStatusMessage(status)
      });

      setProcessedImage(result.url);

      // Save to backend if we have a booth event
      if (boothEvent) {
        try {
          // Convert back to base64 for upload if needed
          const processedBase64 = await downloadImageAsBase64(result.url);

          const uploadResult = await uploadPhotoToEvent(
            Number(boothEvent._id), // Ensure ID format matches backend expectation
            imageData, // Original is already base64
            processedBase64,
            selectedTemplate.id,
            selectedTemplate.name,
            selectedTemplate.prompt
          );
          setShareCode(uploadResult.shareCode);
        } catch (uploadError) {
          console.error("Failed to save photo to history", uploadError);
          toast.error("Photo generated but failed to save to history");
        }
      }

      setCurrentState('result');
    } catch (error) {
      console.error(error);
      toast.error("Failed to process image");
      setCurrentState('camera');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setShareCode(null);
    setCurrentState('select');
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 h-[calc(100vh-100px)] flex flex-col">
      {/* Header (only visible in select mode) */}
      {currentState === 'select' && (
        <div className="flex items-center gap-4 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/creator/booth')}
            className="text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{boothEvent?.title || "My Booth"}</h1>
            <p className="text-zinc-400 text-sm">Take photos with AI magic</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        {currentState === 'select' && (
          <div className="h-full overflow-y-auto">
            <BackgroundSelector
              onSelectBackground={handleSelectTemplate}
              // Pass templates from boothEvent if available
              templates={boothEvent?.templates}
            />
          </div>
        )}

        {currentState === 'camera' && (
          <CameraCapture
            onCapture={handleCapture}
            selectedBackground={selectedTemplate?.id}
            onBack={() => setCurrentState('select')}
          />
        )}

        {currentState === 'processing' && (
          <ProcessingLoader status={statusMessage} />
        )}

        {currentState === 'result' && processedImage && (
          <div className="h-full overflow-y-auto bg-zinc-950">
            <ResultDisplay
              imageUrl={processedImage}
              shareCode={shareCode || undefined}
              onReset={handleReset}
            />
          </div>
        )}
      </div>
    </div>
  );
}
