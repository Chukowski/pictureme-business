
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star, ArrowRight } from "lucide-react";
import { viewTemplate } from "@/services/contentApi";
import { MarketplaceTemplate } from "@/services/marketplaceApi"; // Import new type
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface RecommendedTemplatesProps {
  templates?: MarketplaceTemplate[]; // Changed prop
}

export function RecommendedTemplates({ templates = [] }: RecommendedTemplatesProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const amount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -amount : amount,
        behavior: "smooth",
      });
    }
  };

  if (!templates || templates.length === 0) return null;

  return (
    <div className="space-y-4">

      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {templates.slice(0, 10).map((template: any) => {
          // Resolve thumbnail
          const thumb = template.preview_url ||
            (template.preview_images && template.preview_images.length > 0 ? template.preview_images[0] :
              (template.thumbnail_url || '/placeholder-template.jpg'));

          const name = template.name || template.template_name || 'Featured Style';
          const category = template.category || template.template_type || 'Style';

          return (
            <div key={template.id} className="min-w-[200px] snap-start h-full">
              <Card className="bg-card/40 border-white/5 hover:border-white/10 transition-all group overflow-hidden h-full rounded-xl">
                <div
                  className="aspect-[3/4] bg-zinc-800 bg-cover bg-center relative"
                  style={{ backgroundImage: `url(${thumb})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-[#101112]/90 via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <h4 className="text-sm font-bold text-white truncate leading-tight">{name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="h-4 text-[9px] bg-white/10 text-zinc-300 px-1 border-0">
                        {category}
                      </Badge>
                    </div>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-[#101112]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                    <Button
                      size="sm"
                      className="bg-white text-black hover:bg-zinc-200 h-8 text-xs font-semibold"
                      onClick={() => {
                        viewTemplate(template.id);
                        
                        const isFree = (template.price === 0 || !template.price) && (template.tokens_cost === 0 || !template.tokens_cost);
                        const canUse = template.is_owned || isFree;

                        if (canUse) {
                          navigate('/creator/studio', { state: { view: 'create', selectedTemplate: template } });
                        } else {
                          toast.info("Purchase template to use", {
                            description: `This style costs ${template.tokens_cost || template.price} tokens. Redirecting to marketplace...`
                          });
                          navigate(`/creator/marketplace?templateId=${template.id}`);
                        }
                      }}
                    >
                      Use Template
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )
        })}

        {/* View All Card */}
        <div className="min-w-[100px] flex items-center justify-center snap-start">
          <Button variant="ghost" className="flex-col h-auto gap-2 text-zinc-500 hover:text-white">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10">
              <ArrowRight className="w-5 h-5" />
            </div>
            <span className="text-xs">View All</span>
          </Button>
        </div>
      </div>
    </div>
  );
}


