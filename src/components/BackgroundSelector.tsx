import { useState } from "react";
import { Check } from "lucide-react";
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
    <div className="w-full max-w-7xl mx-auto px-6">
      {/* Preview Section */}
      {selectedBg && (
        <div className="mb-8 animate-fade-in">
          <div className="relative aspect-[16/10] rounded-2xl overflow-hidden glow-teal">
            <img
              src={selectedBg.image}
              alt={selectedBg.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-8">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-3 text-shadow-glow">
                {selectedBg.name}
              </h2>
              <p className="text-lg text-white/90 mb-6 max-w-2xl">
                {selectedBg.prompt}
              </p>
              <button
                onClick={onConfirm}
                className="self-start px-8 py-4 bg-secondary hover:bg-secondary/90 text-white font-bold rounded-xl text-xl transition-all hover:scale-105 glow-orange"
              >
                Start Photo Booth
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Section */}
      <div className={selectedBg ? "mt-8" : ""}>
        <h3 className="text-2xl font-bold mb-6 text-primary">
          {selectedBg ? "Change Scene" : "Choose Your Scene"}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {backgrounds.map((bg) => (
            <button
              key={bg.id}
              onClick={() => onSelect(bg)}
              className={`relative aspect-video rounded-lg overflow-hidden transition-all hover:scale-105 hover:shadow-lg ${
                selectedId === bg.id ? "ring-4 ring-primary glow-teal" : "ring-2 ring-border"
              }`}
            >
              <img
                src={bg.image}
                alt={bg.name}
                className="w-full h-full object-cover"
              />
              {selectedId === bg.id && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center glow-teal">
                    <Check className="w-6 h-6" />
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-sm font-semibold text-center">{bg.name}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export { backgrounds };
