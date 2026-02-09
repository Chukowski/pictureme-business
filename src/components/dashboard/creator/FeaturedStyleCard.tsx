import { useState, useEffect } from "react";
import { MarketplaceTemplate } from "@/services/marketplaceApi";
import { User } from "@/services/eventsApi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFeedUrl as getFeedImageUrl, getAvatarUrl } from "@/services/cdn";

export function FeaturedStyleCard({
    navigate,
    templates,
    user
}: {
    navigate: (p: string, options?: { state?: unknown }) => void,
    templates: MarketplaceTemplate[],
    user: User | null
}) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleUseStyle = (template: MarketplaceTemplate) => {
        const isFree = (template.price === 0 || !template.price) && (template.tokens_cost === 0 || !template.tokens_cost);
        const isCreator = String(template.creator_id) === String(user?.id);
        const canUse = template.is_owned || isFree || isCreator;

        if (canUse) {
            navigate('/creator/studio?view=create', { state: { view: 'create', selectedTemplate: template } });
        } else {
            toast.info("Purchase template to use", {
                description: `This style costs ${template.tokens_cost || template.price} tokens. Redirecting to marketplace...`
            });
            navigate(`/creator/marketplace?templateId=${template.id}`);
        }
    };

    useEffect(() => {
        if (!templates || templates.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % templates.length);
        }, 8000);

        return () => clearInterval(interval);
    }, [templates]);

    if (!templates || templates.length === 0) return null;

    const template = templates[currentIndex];
    // Safe access for fallback
    const bgImage = template.preview_url || template.preview_images?.[0] || template.backgrounds?.[0] || (template as any).images?.[0];
    const title = template.name;
    const creatorName = template.creator?.name || "Pictureme.now";
    const creatorAvatar = (template as any).creator?.avatar_url;

    const tokenCost = template.tokens_cost ?? 0;
    const moneyCost = template.price ?? 0;
    const isFree = tokenCost === 0 && moneyCost === 0;

    return (
        <div
            className="group relative w-full h-[240px] md:h-full md:min-h-[400px] rounded-2xl overflow-hidden cursor-pointer border border-white/10 bg-card shadow-xl shadow-black/40 transition-all hover:border-white/20 select-none"
            onClick={() => handleUseStyle(template)}
        >
            {/* Background Image with Crossfade Transition */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={template.id}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0"
                >
                    <img
                        src={getFeedImageUrl(bgImage || '', 800)}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-[10s] ease-linear group-hover:scale-110"
                    />
                </motion.div>
            </AnimatePresence>

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#101112] via-[#101112]/40 to-transparent opacity-90 z-10"></div>

            {/* Progress Indicators */}
            {templates.length > 1 && (
                <div className="absolute top-4 left-0 right-0 z-30 flex justify-center gap-1.5 px-6">
                    {templates.map((_, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "h-1 rounded-full transition-all duration-300",
                                idx === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"
                            )}
                        />
                    ))}
                </div>
            )}

            {/* Content Container */}
            <div className="absolute inset-0 p-5 md:p-6 z-20 flex flex-col justify-end">
                {/* Badge */}
                <div className="mb-2 md:mb-3">
                    <Badge variant="secondary" className="bg-white/10 text-white backdrop-blur-md border-white/10 text-[10px] md:text-xs font-bold tracking-wider uppercase px-2 py-0.5 md:py-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        Featured Style
                    </Badge>
                </div>

                {/* Title */}
                <motion.div
                    key={`title-${template.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1 md:mb-2 leading-none tracking-tight drop-shadow-lg line-clamp-2">
                        {title}
                    </h3>
                </motion.div>

                {/* Creator Byline */}
                <motion.div
                    key={`creator-${template.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex items-center gap-2 mb-4 md:mb-6"
                >
                    {creatorAvatar && (
                        <img src={getAvatarUrl(creatorAvatar, 32)} alt={`${creatorName} avatar`} className="w-5 h-5 rounded-full border border-white/20" />
                    )}
                    <span className="text-xs md:text-sm text-zinc-300 font-medium drop-shadow-md">
                        by {creatorName}
                    </span>
                </motion.div>

                {/* CTA Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleUseStyle(template);
                    }}
                    className="
            flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 w-fit
            bg-white text-black hover:bg-zinc-200
            rounded-full
            text-xs md:text-sm font-bold
            transition-all duration-300 transform group-hover:translate-x-1 shadow-lg
        ">
                    {template.is_owned ? "Use Style" : (
                        isFree ? "Use Style" : (
                            (() => {
                                const parts = [];
                                if (tokenCost > 0) parts.push(`${tokenCost} Tokens`);
                                if (moneyCost > 0) parts.push(`$${moneyCost}`);
                                return `Get for ${parts.join(' + ')}`;
                            })()
                        )
                    )}
                    <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                </button>
            </div>
        </div>
    );
}
