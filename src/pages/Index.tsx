import { useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { BackgroundSelector } from "@/components/BackgroundSelector";
import { ProcessingLoader } from "@/components/ProcessingLoader";
import { ResultDisplay } from "@/components/ResultDisplay";
import { toast } from "sonner";
import { processImageWithAI, downloadImageAsBase64 } from "@/services/aiProcessor";
import { saveProcessedPhoto } from "@/services/localStorage";
import { EventTitle } from "@/components/EventTitle";
import type { Template } from "@/services/eventsApi";

type AppState = "selecting" | "capturing" | "processing" | "result";

const Index = () => {
  const [state, setState] = useState<AppState>("selecting");
  const [selectedBackground, setSelectedBackground] = useState<Template | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string>("");
  const [processedPhoto, setProcessedPhoto] = useState<string>("");
  const [processingStatus, setProcessingStatus] = useState<string>("Starting...");
  const [shareCode, setShareCode] = useState<string>("");

  const handleBackgroundSelect = (template: Template) => {
    setSelectedBackground(template);
    setState("capturing");
    toast.success(`${template.name} selected! Position yourself and press capture.`);
  };
  const handlePhotoCapture = async (imageData: string) => {
    if (!selectedBackground) {
      toast.error("No background selected");
      return;
    }
    setCapturedPhoto(imageData);
    setState("processing");
    setProcessingStatus("Preparing your photo...");
    try {
      // Process with AI - send user photo + all background images
      const result = await processImageWithAI({
        userPhotoBase64: imageData,
        backgroundPrompt: selectedBackground.prompt,
        backgroundImageUrls: selectedBackground.images || [],
        includeBranding: true,
        includeHeader: selectedBackground.includeHeader ?? false,
        campaignText: selectedBackground.campaignText,
        skipTokenCharge: true,
        onProgress: (status, logs) => {
          if (status === "queued") {
            setProcessingStatus("Waiting in queue...");
          } else if (status === "processing") {
            setProcessingStatus("AI is working its magic...");
            if (logs && logs.length > 0) {
              console.log("AI logs:", logs);
            }
          }
        }
      });
      setProcessingStatus("Downloading result...");

      let processedBase64: string;
      if (result.url.startsWith("data:")) {
        processedBase64 = result.url;
      } else {
        processedBase64 = await downloadImageAsBase64(result.url);
      }

      // Save to storage (cloud or localStorage)
      try {
        const savedPhoto = await saveProcessedPhoto({
          originalImageBase64: imageData,
          processedImageBase64: processedBase64,
          backgroundId: selectedBackground.id,
          backgroundName: selectedBackground.name,
          prompt: selectedBackground.prompt
        });
        
        // If saved to cloud, use cloud URL; otherwise use base64
        if (savedPhoto.processedImageUrl) {
          setProcessedPhoto(savedPhoto.processedImageUrl);
        } else {
          setProcessedPhoto(processedBase64);
        }
        
        setShareCode(savedPhoto.shareCode);
        toast.success("Your photo is ready! 🎉");
      } catch (storageError: any) {
        console.warn("Storage error:", storageError);
        setProcessedPhoto(processedBase64);
        toast.warning("Photo ready but couldn't save to gallery (storage full)");
      }
      setState("result");
    } catch (error: any) {
      console.error("Processing error:", error);
      toast.error(error.message || "Failed to process photo. Please try again.");

      // Fall back to original photo if AI fails
      setProcessedPhoto(imageData);
      setState("result");
    }
  };
  const handleReset = () => {
    setState("selecting");
    setSelectedBackground(null);
    setCapturedPhoto("");
    setProcessedPhoto("");
    setShareCode("");
    setProcessingStatus("Starting...");
  };
  return <div className="min-h-screen bg-gradient-dark relative">
      {state === "selecting" && <EventTitle />}

      {state === "selecting" && <div className="min-h-screen flex flex-col bg-gradient-dark">
          <div className="flex-1 flex items-center justify-center">
            <BackgroundSelector onSelectBackground={handleBackgroundSelect} />
          </div>
        </div>}

      {state === "capturing" && <CameraCapture onCapture={handlePhotoCapture} selectedBackground={selectedBackground?.name || ""} />}

      {state === "processing" && <ProcessingLoader status={processingStatus} />}

      {state === "result" && <ResultDisplay imageUrl={processedPhoto} shareCode={shareCode} onReset={handleReset} />}
    </div>;
};
export default Index;
