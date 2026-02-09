import { useMemo } from "react";
import { ChevronRight, Sparkles, Camera, Layout, UserRound, Zap, Image, Clock } from "lucide-react";
import { MarketplaceTemplate } from "@/services/marketplaceApi";

export function TrendingTagsCard({
    navigate,
    templates
}: {
    navigate: (p: string) => void,
    templates: MarketplaceTemplate[]
}) {
    const dynamicTags = useMemo(() => {
        if (!templates || templates.length === 0) return [];

        // Aggregate tags
        const tagCounts: Record<string, number> = {};
        templates.forEach(t => {
            (t.tags || []).forEach(tag => {
                const normalized = tag.toLowerCase().trim();
                if (normalized === 'featured' || normalized === 'promoted') return;
                tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
            });
        });

        // Sort by frequency and take top 8
        return Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([label]) => {
                // Map common tags to icons
                let icon = Sparkles;
                if (label.includes('camera') || label.includes('photo') || label.includes('polaroid')) icon = Camera;
                if (label.includes('lego') || label.includes('blocks')) icon = Layout;
                if (label.includes('anime') || label.includes('comic')) icon = Sparkles;
                if (label.includes('user') || label.includes('headshot') || label.includes('person')) icon = UserRound;
                if (label.includes('cyber') || label.includes('neon') || label.includes('tech')) icon = Zap;
                if (label.includes('art') || label.includes('paint') || label.includes('studio')) icon = Image;
                if (label.includes('old') || label.includes('retro') || label.includes('time')) icon = Clock;
                if (label.includes('star') || label.includes('galaxy') || label.includes('space')) icon = Sparkles;

                return { label: label.charAt(0).toUpperCase() + label.slice(1), icon };
            });
    }, [templates]);

    // Fallback if no templates or tags found
    const tags = dynamicTags.length > 0 ? dynamicTags : [
        { label: "Polaroid", icon: Camera },
        { label: "Lego", icon: Layout },
        { label: "Anime", icon: Sparkles },
        { label: "Headshot", icon: UserRound },
        { label: "Cyberpunk", icon: Zap }
    ];

    return (
        <div className="flex-shrink-0 bg-[#1A1A1A] rounded-2xl border border-white/5 p-3 md:p-5 flex flex-col group shadow-lg min-h-0 overflow-hidden">
            <button type="button" className="flex items-center justify-between mb-3 w-full hover:opacity-80 transition-opacity" onClick={() => navigate('/creator/marketplace')}>
                <h3 className="text-base font-semibold text-white tracking-wide">Popular Tags</h3>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
            </button>

            <div className="flex overflow-x-auto pb-1 scrollbar-hide gap-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
                {tags.map((t, i) => (
                    <button
                        key={i}
                        onClick={() => navigate(`/creator/marketplace?search=${encodeURIComponent(t.label)}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 md:px-2 md:py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-xs text-zinc-300 hover:text-white transition-all transform hover:scale-105 hover:shadow-md shrink-0 md:shrink"
                    >
                        <t.icon className="w-3 h-3 opacity-70" />
                        <span className="whitespace-nowrap">{t.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
