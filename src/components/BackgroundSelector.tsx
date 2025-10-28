import { ArrowRight, Sparkles } from "lucide-react";
import { SceneCard } from "@/components/SceneCard";
import { Button } from "@/components/ui/button";
import glaresImg from "@/assets/backgrounds/glares.jpg";
import jungleImg from "@/assets/backgrounds/jungle.jpg";
import oceanImg from "@/assets/backgrounds/ocean.jpg";
import rainImg from "@/assets/backgrounds/rain.jpg";
import leafsImg from "@/assets/backgrounds/leafs.jpg";
import chevronOrange from "@/assets/backgrounds/chevron_orange.png";

const backgrounds = [
  {
    id: "glares",
    name: "Particle Field",
    image: glaresImg,
    images: [glaresImg, chevronOrange],
    prompt: "Take the person from the first image and place them into the second image background with the glowing golden particles and dark atmosphere. Keep the person's face and body exactly as they appear in the first photo without any modifications to their facial features. Use all the visual elements from the second image: the golden glowing particles, the dark background, and the technological atmosphere. The person should be holding the orange glowing chevron/arrow symbol from the third image in their hands at chest level. Dress the person in professional business attire (dark sweater or business casual). The person should be centered looking at camera with confident expression, proudly displaying the glowing orange chevron symbol. The chevron should appear to be floating or held by the person with a subtle glow effect. Cinematic lighting with warm golden particle effects creating depth. Professional corporate photography style.",
    includeBranding: true,
    includeHeader: true,
    campaignText: undefined, // No campaign text overlay for this one
  },
  {
    id: "jungle",
    name: "Jungle Explorer",
    image: jungleImg,
    images: [jungleImg],
    prompt: "Take the person from the first image and place them into the second image background. Keep the person's face and body exactly as they appear in the first photo without any modifications to their facial features. Use all the visual elements from the second image: the majestic turquoise cheetah/leopard running, the particles, and the dark teal jungle environment. Dress the person in safari/outdoor explorer outfit (beige/tan shirt and cargo pants) with backpack. The person should be running or in dynamic motion pose on the left side, with the cheetah running beside them on the right. Both should appear to be running together. Professional wildlife photography with dramatic turquoise atmospheric lighting.",
    includeBranding: true,
    includeHeader: false,
    campaignText: "Run lean. Run fast.",
  },
  {
    id: "ocean",
    name: "Ocean Depths",
    image: oceanImg,
    images: [oceanImg],
    prompt: "Take the person from the first image and place them into the second image background. Keep the person's face and body exactly as they appear in the first photo without any modifications to their facial features. Do not cover their face with masks, goggles, or breathing apparatus—keep the face fully visible and natural. Use all the visual elements from the second image: the octopus with tentacles, the bubbles, the turquoise underwater lighting, and the deep ocean atmosphere. Dress the person in professional black diving suit with equipment, harness and gear. The person should be positioned in the lower center area looking at camera with the large octopus tentacles surrounding them in the background. Professional underwater photography with dramatic turquoise lighting.",
    includeBranding: true,
    includeHeader: false,
    campaignText: "Need extra hands?",
  },
  {
    id: "rain",
    name: "Rain Magic",
    image: rainImg,
    images: [rainImg],
    prompt: "Take the person from the first image and place them into the second image background. Keep the person's face and body exactly as they appear in the first photo without any modifications to their facial features. Use all the visual elements from the second image: the rain falling heavily, the turquoise-tinted lighting, and the dark moody atmosphere with water reflections on ground. Dress the person in casual earth-tone clothing (olive/grey t-shirt and jeans). The person should be sitting cross-legged on the wet ground, smiling at camera while holding a small plant or seedling with glowing turquoise leaves growing from soil in their hands. Professional environmental photography with rain and dramatic turquoise lighting.",
    includeBranding: true,
    includeHeader: false,
    campaignText: "Simply sustainable.",
  },
  {
    id: "leafs",
    name: "Mystical Leaves",
    image: leafsImg,
    images: [leafsImg],
    prompt: "Take the person from the first image and place them into the second image background. Keep the person's face and body exactly as they appear in the first photo without any modifications to their facial features. Use all the visual elements from the second image: the glowing turquoise leaves with visible leaf veins, the small ant on leaf, the bokeh effects, and the dark mystical background. Dress the person in professional dark clothing (black jacket or professional attire with white collar visible). The person should be centered looking at camera with calm expression while gently holding or presenting a glowing turquoise leaf with their gloved hands. Professional photography with dramatic turquoise accent lighting and floating particles.",
    includeBranding: true,
    includeHeader: false,
    campaignText: "Lighten the load.",
  }
];

interface BackgroundSelectorProps {
  onSelect: (background: typeof backgrounds[0]) => void;
  onConfirm: () => void;
  selectedId: string | null;
}

export const BackgroundSelector = ({ onSelect, onConfirm, selectedId }: BackgroundSelectorProps) => {
  const selectedBg = backgrounds.find(bg => bg.id === selectedId);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8">
      {/* Hero Section with Selected Preview */}
      {selectedBg && (
        <div className="mb-12 animate-fade-in">
          <div className="relative rounded-3xl overflow-hidden shadow-elegant glow-primary">
            <div className="relative aspect-[21/9] md:aspect-[16/7]">
              <img
                src={selectedBg.image}
                alt={selectedBg.name}
                className="w-full h-full object-cover"
              />
              {/* Gradient overlay - lighter for light mode */}
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
                    AI-powered scene transformation
                  </p>
                </div>
              </div>
              
              <Button
                onClick={onConfirm}
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
            {backgrounds.map((bg) => (
              <div key={bg.id} className="w-48 md:w-auto flex-shrink-0 md:flex-shrink">
                <SceneCard
                  id={bg.id}
                  name={bg.name}
                  image={bg.image}
                  active={selectedId === bg.id}
                  onClick={() => onSelect(bg)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export { backgrounds };
