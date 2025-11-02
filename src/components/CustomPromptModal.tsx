import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import type { Template } from "@/services/eventsApi";

interface CustomPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string, selectedImages: string[]) => void;
  availableImages: string[]; // All images from all templates in the event
  template: Template;
}

export function CustomPromptModal({
  isOpen,
  onClose,
  onSubmit,
  availableImages,
  template,
}: CustomPromptModalProps) {
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!customPrompt.trim()) {
      toast.error("Please write a prompt first");
      return;
    }
    
    toast.success(`Custom prompt ready! ${selectedImages.length} image${selectedImages.length !== 1 ? 's' : ''} selected`);
    
    // Reset for next time
    setCustomPrompt("");
    setSelectedImages([]);
    // Call onSubmit which will handle state change
    onSubmit(customPrompt, selectedImages);
  };

  const toggleImage = (imageUrl: string) => {
    setSelectedImages((prev) =>
      prev.includes(imageUrl)
        ? prev.filter((url) => url !== imageUrl)
        : [...prev, imageUrl]
    );
  };

  const handleUseDefaultPrompt = () => {
    setCustomPrompt(template.prompt);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Custom AI Prompt
          </DialogTitle>
          <DialogDescription>
            Write your own AI prompt and select background images to create a unique photo composition.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Prompt Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="custom-prompt">Your AI Prompt</Label>
              {template.prompt && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleUseDefaultPrompt}
                  className="text-xs"
                >
                  Use Template Prompt
                </Button>
              )}
            </div>
            <Textarea
              id="custom-prompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Example: Create a professional photo by compositing these images: Preserve the exact person from the first image (face, body, pose) without any modifications. Place them in a futuristic cityscape with neon lights..."
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              💡 Tip: Use "compositing" language like "Preserve the person from first image...", "Add elements from second image...", "Blend naturally..."
            </p>
          </div>

          {/* Image Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Select Background Images (Optional)
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              Choose images from the event's media library to use in your composition.
            </p>
            
            {availableImages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No images available in this event</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2 border rounded-md">
                {availableImages.map((imageUrl, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleImage(imageUrl)}
                    className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                      selectedImages.includes(imageUrl)
                        ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
                        : "border-transparent hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={imageUrl}
                      alt={`Background ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {selectedImages.includes(imageUrl) && (
                      <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                        <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                          {selectedImages.indexOf(imageUrl) + 1}
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Selected: {selectedImages.length} image{selectedImages.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Example Prompts */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Quick Examples:</Label>
            <div className="grid grid-cols-1 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setCustomPrompt(
                    "Create a professional photo by compositing: Preserve the exact person from the first image unchanged. Place them in a modern office with glass walls and natural lighting. Dress them in business attire. Blend naturally with proper shadows and depth."
                  )
                }
                className="justify-start text-xs h-auto py-2 px-3"
              >
                <span className="font-semibold mr-2">Corporate:</span>
                <span className="text-muted-foreground truncate">Modern office setting...</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setCustomPrompt(
                    "Create an outdoor adventure photo: Preserve the person from first image. Place them in a scenic mountain landscape with hiking trails. Dress in outdoor gear. Use natural daylight with warm tones. Blend with realistic outdoor lighting."
                  )
                }
                className="justify-start text-xs h-auto py-2 px-3"
              >
                <span className="font-semibold mr-2">Adventure:</span>
                <span className="text-muted-foreground truncate">Mountain landscape...</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setCustomPrompt(
                    "Create a futuristic scene: Preserve the person unchanged. Place them in a cyberpunk cityscape with neon lights and holographic displays. Add futuristic clothing. Use dramatic blue/purple lighting. Blend with sci-fi atmosphere."
                  )
                }
                className="justify-start text-xs h-auto py-2 px-3"
              >
                <span className="font-semibold mr-2">Sci-Fi:</span>
                <span className="text-muted-foreground truncate">Cyberpunk cityscape...</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!customPrompt.trim()}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Photo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

