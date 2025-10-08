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
    prompt: "Place the person in a magical scene with scattered orange glowing particles floating around them on a black background, ethereal atmosphere, dramatic lighting"
  },
  {
    id: "jungle",
    name: "Jungle Depths",
    image: jungleImg,
    prompt: "Place the person in a mysterious dark teal jungle environment with bokeh light effects and natural foliage, atmospheric depth"
  },
  {
    id: "ocean",
    name: "Underwater",
    image: oceanImg,
    prompt: "Place the person in a deep underwater scene with bubbles rising around them, dark teal water, serene aquatic environment"
  },
  {
    id: "rain",
    name: "Rain Storm",
    image: rainImg,
    prompt: "Add dramatic rain falling around the person on a dark teal background, moody atmosphere, water droplets visible"
  },
  {
    id: "leafs",
    name: "Nature Bokeh",
    image: leafsImg,
    prompt: "Place the person among dark teal leaves with beautiful bokeh light effects, organic natural background, elegant atmosphere"
  }
];

interface BackgroundSelectorProps {
  onSelect: (background: typeof backgrounds[0]) => void;
  selectedId: string | null;
}

export const BackgroundSelector = ({ onSelect, selectedId }: BackgroundSelectorProps) => {
  return (
    <div className="p-6 bg-card/50 backdrop-blur-sm">
      <h2 className="text-2xl font-bold mb-6 text-primary">Select Your Scene</h2>
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
  );
};

export { backgrounds };
