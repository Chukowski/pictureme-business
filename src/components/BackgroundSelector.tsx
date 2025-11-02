import { ArrowRight, Sparkles } from "lucide-react";
import { SceneCard } from "@/components/SceneCard";
import { Button } from "@/components/ui/button";
import type { Template } from "@/services/eventsApi";
import glaresImg from "@/assets/backgrounds/glares.jpg";
import jungleImg from "@/assets/backgrounds/jungle.jpg";
import oceanImg from "@/assets/backgrounds/ocean.jpg";
import rainImg from "@/assets/backgrounds/rain.jpg";
import leafsImg from "@/assets/backgrounds/leafs.jpg";
import chevronOrange from "@/assets/backgrounds/chevron_orange.png";
import { useState } from "react";

// Default backgrounds for fallback
const getDefaultBackgrounds = (): Template[] => [
  {
    id: "glares",
    name: "Particle Field",
    description: "Tech Innovation",
    images: [glaresImg, chevronOrange],
    prompt: "Take the person from the first image and place them into the second image background with the glowing golden particles and dark atmosphere...",
    active: true,
    includeHeader: true,
    campaignText: undefined,
  },
  {
    id: "jungle",
    name: "Jungle Explorer",
    description: "Dynamic Adventure",
    images: [jungleImg],
    prompt: "Take the person from the first image and place them into the second image background...",
    active: true,
    includeHeader: false,
    campaignText: "Run lean. Run fast.",
  },
  {
    id: "ocean",
    name: "Ocean Depths",
    description: "Underwater Exploration",
    images: [oceanImg],
    prompt: "Take the person from the first image and place them into the second image background...",
    active: true,
    includeHeader: false,
    campaignText: "Need extra hands?",
  },
  {
    id: "rain",
    name: "Rain Magic",
    description: "Environmental Sustainability",
    images: [rainImg],
    prompt: "Take the person from the first image and place them into the second image background...",
    active: true,
    includeHeader: false,
    campaignText: "Simply sustainable.",
  },
  {
    id: "leafs",
    name: "Mystical Leaves",
    description: "Nature & Efficiency",
    images: [leafsImg],
    prompt: "Take the person from the first image and place them into the second image background...",
    active: true,
    includeHeader: false,
    campaignText: "Lighten the load.",
  }
];

interface BackgroundSelectorProps {
  onSelectBackground: (template: Template) => void;
  templates?: Template[];
}

export const BackgroundSelector = ({ onSelectBackground, templates }: BackgroundSelectorProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Use provided templates or fall back to default backgrounds
  const backgroundsToShow = templates && templates.length > 0 ? templates : getDefaultBackgrounds();
  
  const handleSelect = (template: Template) => {
    setSelectedId(template.id);
  };
  
  const handleConfirm = () => {
    const selected = backgroundsToShow.find(bg => bg.id === selectedId);
    if (selected) {
      onSelectBackground(selected);
    }
  };
  
  const selectedBg = backgroundsToShow.find(bg => bg.id === selectedId);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8">
      {/* Hero Section with Selected Preview */}
      {selectedBg && (
        <div className="mb-12 animate-fade-in">
          <div className="relative rounded-3xl overflow-hidden shadow-elegant glow-primary">
            <div className="relative aspect-[21/9] md:aspect-[16/7]">
              <img
                src={selectedBg.images[0]}
                alt={selectedBg.name}
                className="w-full h-full object-cover"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              
              {/* Floating particles effect */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-primary animate-pulse" />
                <div className="absolute top-1/3 right-1/3 w-1 h-1 rounded-full bg-secondary animate-pulse delay-100" />
                <div className="absolute bottom-1/4 right-1/4 w-2 h-2 rounded-full bg-primary animate-pulse delay-200" />
              </div>
            </div>
            
            {/* Content overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                <div>
                  <h2 className="text-3xl md:text-5xl font-bold text-white mb-2 text-shadow-glow">
                    {selectedBg.name}
                  </h2>
                  <p className="text-sm md:text-base text-white/80 max-w-2xl leading-relaxed">
                    {selectedBg.description || "AI-powered scene transformation"}
                  </p>
                </div>
              </div>
              
              <Button
                onClick={handleConfirm}
                size="lg"
                className="self-start mt-4 text-lg px-8 py-6 rounded-2xl gradient-secondary hover:scale-105 transition-transform glow-secondary group"
              >
                Start Photo Booth
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Scene Gallery */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
              {selectedBg ? "Choose Different Scene" : "Select Your Scene"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Pick a magical background for your photo
            </p>
          </div>
        </div>
        
        {/* Horizontal scrollable carousel on mobile, grid on desktop */}
        <div className="overflow-x-auto md:overflow-visible -mx-6 px-6 md:mx-0 md:px-0">
          <div className="flex md:grid md:grid-cols-5 gap-4 md:gap-6 pb-4 md:pb-0 min-w-max md:min-w-0">
            {backgroundsToShow.map((bg) => (
              <div key={bg.id} className="w-48 md:w-auto flex-shrink-0 md:flex-shrink">
                <SceneCard
                  id={bg.id}
                  name={bg.name}
                  image={bg.images[0]}
                  active={selectedId === bg.id}
                  isCustomPrompt={bg.isCustomPrompt}
                  onClick={() => handleSelect(bg)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
