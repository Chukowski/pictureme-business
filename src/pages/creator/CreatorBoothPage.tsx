import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  getCurrentUser, 
  User, 
  getUserEvents,
  EventConfig,
  uploadPhotoToEvent,
  createEvent
} from "@/services/eventsApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Image as ImageIcon, Sparkles } from "lucide-react";
import { CameraCapture } from "@/components/CameraCapture";
import { BackgroundSelector } from "@/components/BackgroundSelector";
import { ProcessingLoader } from "@/components/ProcessingLoader";
import { ResultDisplay } from "@/components/ResultDisplay";
import { processImageWithAI, downloadImageAsBase64 } from "@/services/aiProcessor";
import { toast } from "sonner";

type AppState = 'select' | 'camera' | 'processing' | 'result';

export default function CreatorBoothPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [currentState, setCurrentState] = useState<AppState>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  
  // We need a "personal booth" event to store photos. 
  // If it doesn't exist, we'll create one on the fly or use a mock one.
  const [boothEvent, setBoothEvent] = useState<EventConfig | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate("/admin/auth");
      return;
    }
    setUser(currentUser);
    loadPersonalBooth(currentUser);
  }, [navigate]);

  const loadPersonalBooth = async (currentUser: User) => {
    try {
      const events = await getUserEvents();
      let personalEvent = events.find(e => e.title === "My Personal Booth");
      
      if (!personalEvent) {
        // Create a hidden personal event for the user if it doesn't exist
        try {
            personalEvent = await createEvent({
                slug: `booth-${Date.now()}`,
                title: "My Personal Booth",
                description: "Your personal AI photo booth",
                is_active: true,
                // Add some default templates
                templates: [] 
            });
        } catch (e) {
            console.error("Failed to create personal booth event", e);
        }
      }
      setBoothEvent(personalEvent || null);
    } catch (error) {
      console.error("Failed to load personal booth", error);
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
            aiModel: 'nano-banana', // Fast model for booth
            onProgress: (status) => setStatusMessage(status)
        });

        setProcessedImage(result.url);
        
        // Save to backend if we have a booth event
        if (boothEvent) {
            try {
                const originalBlob = await (await fetch(imageData)).blob();
                const processedBlob = await (await fetch(result.url)).blob();
                
                // Convert back to base64 for upload if needed, or handle upload logic
                // The uploadPhotoToEvent expects base64 strings
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
                onClick={() => navigate('/creator/dashboard')}
                className="text-zinc-400 hover:text-white hover:bg-white/5"
            >
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
                <h1 className="text-2xl font-bold text-white">My Booth</h1>
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
                    // Pass templates from boothEvent if available, otherwise BackgroundSelector uses defaults
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

