import { useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star, ArrowRight } from "lucide-react";
import { HomeContentResponse, viewTemplate } from "@/services/contentApi";
import { Badge } from "@/components/ui/badge";

interface RecommendedTemplatesProps {
  content: HomeContentResponse | null;
}

export function RecommendedTemplates({ content }: RecommendedTemplatesProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const amount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -amount : amount,
        behavior: "smooth",
      });
    }
  };

  // Use trending templates if available, otherwise empty
  const templates = content?.trending_templates || [];

  if (templates.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400" />
          Recommended for You
        </h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-white"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-white"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {templates.map((template) => (
          <div key={template.id} className="min-w-[240px] snap-start">
            <Card className="bg-zinc-900/40 border-white/5 hover:border-white/10 transition-all group overflow-hidden h-full">
              <div
                className="aspect-[4/3] bg-zinc-800 bg-cover bg-center relative"
                style={{ backgroundImage: "url(/placeholder-template.jpg)" }} // Placeholder as thumbnails might be missing
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h4 className="text-sm font-bold text-white truncate">{template.template_name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="h-4 text-[9px] bg-white/10 text-zinc-300 px-1">
                      {template.use_count} uses
                    </Badge>
                  </div>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <Button
                    size="sm"
                    className="bg-white text-black hover:bg-zinc-200 h-8 text-xs"
                    onClick={() => viewTemplate(template.template_id)}
                  >
                    Use Template
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        ))}

        {/* View All Card */}
        <div className="min-w-[100px] flex items-center justify-center snap-start">
          <Button variant="ghost" className="flex-col h-auto gap-2 text-zinc-500 hover:text-white">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
              <ArrowRight className="w-5 h-5" />
            </div>
            <span className="text-xs">View All</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

