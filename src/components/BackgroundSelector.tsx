import { ArrowRight, Sparkles } from "lucide-react";
import { SceneCard } from "@/components/SceneCard";
import { Button } from "@/components/ui/button";
import glaresImg from "@/assets/backgrounds/glares.jpg";
import jungleImg from "@/assets/backgrounds/jungle.jpg";
import oceanImg from "@/assets/backgrounds/ocean.jpg";
import rainImg from "@/assets/backgrounds/rain.jpg";
import leafsImg from "@/assets/backgrounds/leafs.jpg";

const backgrounds = [
  {
    id: "glares",
    name: "Particle Field",
    image: glaresImg,
    prompt: "Keep the person's face and body exactly as they are. Only change their clothing to sleek black and orange tech outfit. Place them in a magical scene with scattered orange glowing particles floating around on a black background, ethereal atmosphere, dramatic lighting. Maintain their facial features, skin tone, and hair exactly."
  },
  {
    id: "jungle",
    name: "Jungle Depths",
    image: jungleImg,
    prompt: "Keep the person's face, hair and body exactly as they are. Only change their clothing to explorer outfit with earthy tones - khaki vest and cargo pants. Place them in a mysterious dark teal jungle environment with bokeh light effects and natural foliage. Do not cover their face. Maintain all facial features identical."
  },
  {
    id: "ocean",
    name: "Underwater",
    image: oceanImg,
    prompt: "Keep the person's face completely visible and unchanged. Only change their clothing to a modern wetsuit in dark blue and teal colors. Place them in a deep underwater scene with bubbles rising around, dark teal water. No mask, no diving gear on face. Maintain their facial features, expression, and hair exactly as in original photo."
  },
  {
    id: "rain",
    name: "Rain Storm",
    image: rainImg,
    prompt: "Keep the person's face and features exactly as they are. Only change their clothing to stylish raincoat or jacket in dark colors. Add dramatic rain falling around them on a dark teal background, moody atmosphere, water droplets. Face must remain completely visible and unchanged. Maintain all facial features identical."
  },
  {
    id: "leafs",
    name: "Nature Bokeh",
    image: leafsImg,
    prompt: "Keep the person's face, hair and body exactly as they are. Only change their clothing to elegant natural tones outfit in greens and teals. Place them among dark teal leaves with beautiful bokeh light effects. Face must remain visible and unchanged. Maintain their exact facial features, skin tone, and expression."
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
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
              
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
