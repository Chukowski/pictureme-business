import { ChevronRight, Play, Camera, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMediaPreviewUrl, isVideoUrl } from "@/services/cdn";
import { UserCreation } from "@/pages/creator/dashboard/types";

export function RecentCreationsCard({
    creations,
    hasCreations,
    navigate
}: {
    creations: UserCreation[],
    hasCreations: boolean,
    navigate: (p: string) => void
}) {
    return (
        <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-3 md:p-5 relative overflow-hidden flex flex-col group shadow-lg h-auto">
            <div className="flex items-center justify-between mb-4 z-10 w-full">
                <h3 className="text-lg font-semibold text-white tracking-wide">Your Recent Creations</h3>
                <button type="button" onClick={() => navigate('/creator/studio?view=gallery')} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">
                    My Studio <ChevronRight className="w-3 h-3" />
                </button>
            </div>

            {hasCreations ? (
                <div className="grid grid-cols-4 gap-2 md:gap-3 h-auto z-10">
                    {creations.slice(0, 4).map(c => {
                        const isVideo = c.type === 'video' || isVideoUrl(c.url);
                        const previewSrc = getMediaPreviewUrl({ url: c.url, type: c.type as 'image' | 'video', thumbnail_url: c.thumbnail_url }, 200);

                        return (
                            <button type="button" aria-label="Open creation in gallery" key={c.id} onClick={() => navigate('/creator/studio?view=gallery')} className="aspect-square rounded-xl overflow-hidden border border-white/5 cursor-pointer relative group/item hover:scale-[1.02] transition-transform bg-zinc-800 shadow-md">
                                {/* Video badge */}
                                {isVideo && (
                                    <div className="absolute top-1.5 left-1.5 z-10 p-1 bg-black/50 backdrop-blur-sm rounded">
                                        <Play className="w-2.5 h-2.5 text-white fill-white" />
                                    </div>
                                )}
                                {previewSrc ? (
                                    <img src={previewSrc} alt={c.prompt || "Recent creation"} className="w-full h-full object-cover opacity-90 group-hover/item:opacity-100 transition-opacity" loading="lazy" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                        <Play className="w-6 h-6 text-zinc-600" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                    {/* Fillers if less than 4 */}
                    {[...Array(Math.max(0, 4 - creations.length))].map((_, i) => (
                        <button
                            type="button"
                            aria-label="Create a new image"
                            key={`empty-${i}`}
                            onClick={() => navigate('/creator/studio')}
                            className="aspect-square rounded-xl bg-zinc-800/20 border border-white/5 border-dashed flex items-center justify-center cursor-pointer hover:bg-zinc-800/40 transition-all group/empty"
                        >
                            <Plus className="w-5 h-5 text-zinc-700 group-hover/empty:text-[#D1F349] transition-transform group-hover/empty:scale-110" />
                        </button>
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center z-10 bg-card/50 rounded-xl border border-white/5 border-dashed mt-0">
                    <div className="text-center p-4">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 mx-auto flex items-center justify-center mb-3">
                            <Camera className="w-5 h-5 text-zinc-500" />
                        </div>
                        <p className="text-sm text-zinc-400 mb-4">No creations yet. Start your journey.</p>
                        <Button
                            variant="outline"
                            className="rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-white hover:text-white"
                            onClick={() => navigate('/creator/studio')}
                        >
                            Start Creating
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
