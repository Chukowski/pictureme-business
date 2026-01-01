import { ArrowRight, Sparkles, ChevronsLeftRight } from "lucide-react";
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
  const isScrollable = backgroundsToShow.length > 3;

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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-4 sm:pt-6 md:pt-8">
      {/* Hero Section with Selected Preview */}
      {selectedBg && (
        <div className="mb-8 sm:mb-12 animate-fade-in">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-elegant glow-primary">
            <div className="relative aspect-[4/3] sm:aspect-[21/9] md:aspect-[16/7]">
              <img
                src={selectedBg.images[0]}
                alt={selectedBg.name}
                className="w-full h-full object-cover"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#101112]/80 via-[#101112]/40 to-transparent" />

              {/* Floating particles effect */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-primary animate-pulse" />
                <div className="absolute top-1/3 right-1/3 w-1 h-1 rounded-full bg-secondary animate-pulse delay-100" />
                <div className="absolute bottom-1/4 right-1/4 w-2 h-2 rounded-full bg-primary animate-pulse delay-200" />
              </div>
            </div>

            {/* Content overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 md:p-10">
              <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-pulse flex-shrink-0" />
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-1 sm:mb-2 text-shadow-glow">
                    {selectedBg.name}
                  </h2>
                  <p className="text-xs sm:text-sm md:text-base text-white/80 max-w-2xl leading-relaxed line-clamp-2">
                    {selectedBg.description || "AI-powered scene transformation"}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleConfirm}
                size="lg"
                className="self-start mt-2 sm:mt-4 text-base sm:text-lg px-6 py-5 sm:px-8 sm:py-6 rounded-xl sm:rounded-2xl bg-[#D9F99D] text-black hover:bg-[#BEF264] hover:scale-105 transition-transform shadow-[0_0_20px_-5px_rgba(217,249,157,0.5)] group w-full sm:w-auto"
              >
                Start Photo Booth
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Scene Gallery */}
      <div>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1">
              {selectedBg ? "Choose Different Scene" : "Select Your Scene"}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Pick a magical background for your photo
            </p>
          </div>
        </div>

        {/* Vertical grid for all screen sizes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 pb-20 px-1">
          {backgroundsToShow.map((bg) => (
            <div key={bg.id} className="w-full">
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

      {/* Floating Continue Action for Mobile */}
      {selectedBg && (
        <div className="md:hidden fixed bottom-6 left-0 right-0 px-4 z-50 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <Button
            onClick={handleConfirm}
            className="w-full h-16 rounded-2xl bg-[#D9F99D] text-black hover:bg-[#BEF264] shadow-[0_8px_32px_-8px_rgba(217,249,157,0.6)] border border-white/20 backdrop-blur-md flex items-center justify-between px-6 group"
          >
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Ready to go</span>
              <span className="text-base font-bold truncate max-w-[200px]">{selectedBg.name}</span>
            </div>
            <div className="flex items-center gap-2 font-bold">
              Continue
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Button>
        </div>
      )}
    </div>
  );
};
