
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star, ArrowRight } from "lucide-react";
import { viewTemplate } from "@/services/contentApi";
import { MarketplaceTemplate } from "@/services/marketplaceApi"; // Import new type
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RecommendedTemplatesProps {
  templates?: MarketplaceTemplate[]; // Changed prop
}

export function RecommendedTemplates({ templates = [] }: RecommendedTemplatesProps) {
  const navigate = useNavigate();

  if (!templates || templates.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {templates.slice(0, 4).map((template: any, idx: number) => {
        // Resolve thumbnail
        const thumb = template.preview_url ||
          (template.preview_images && template.preview_images.length > 0 ? template.preview_images[0] :
            (template.thumbnail_url || '/placeholder-template.jpg'));

        const name = template.name || template.template_name || 'Featured Style';
        const description = template.description || 'Create stunning AI art with this unique style.';

        // Mocking badges for visual fidelity with request
        const badgeType = idx === 0 ? 'UNLIMITED' : (idx === 1 || idx === 2 ? 'NEW' : 'PRO');

        return (
          <div
            key={template.id}
            onClick={() => {
              viewTemplate(template.id);
              const isFree = (template.price === 0 || !template.price) && (template.tokens_cost === 0 || !template.tokens_cost);
              if (template.is_owned || isFree) {
                navigate('/business/playground', { state: { view: 'create', selectedTemplate: template } });
              } else {
                navigate(`/business/marketplace?templateId=${template.id}`);
              }
            }}
            className="group cursor-pointer"
          >
            <Card className="bg-[#101112] border-white/5 overflow-hidden rounded-3xl transition-all hover:border-white/10 h-full flex flex-col">
              <div className="relative aspect-square md:aspect-[4/5] overflow-hidden">
                <img
                  src={thumb}
                  alt={name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#101112] via-transparent to-transparent opacity-40 md:opacity-0 group-hover:opacity-40 transition-opacity" />

                {/* Visual Identity Badges */}
                <div className="absolute top-3 left-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[9px] font-black italic uppercase tracking-tighter shadow-xl",
                    badgeType === 'PRO' ? "bg-[#7C3AED] text-white" : "bg-white text-black"
                  )}>
                    {badgeType}
                  </span>
                </div>
              </div>

              <div className="p-3 md:p-4 flex flex-col flex-1">
                <h4 className="text-sm md:text-base font-bold text-white leading-tight mb-1 truncate">{name}</h4>
                <p className="text-[10px] md:text-xs text-zinc-500 font-medium line-clamp-1">
                  {description}
                </p>
              </div>
            </Card>
          </div>
        )
      })}
    </div>
  );
}


