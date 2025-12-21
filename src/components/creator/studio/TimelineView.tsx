import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { GalleryItem } from '@/components/creator/CreationDetailView';
import { getThumbnailUrl } from "@/services/imgproxy";

interface TimelineViewProps {
    history: GalleryItem[];
    isProcessing: boolean;
    statusMessage: string;
    setPreviewItem: (item: GalleryItem) => void;
}

export const TimelineView = ({
    history,
    isProcessing,
    statusMessage,
    setPreviewItem
}: TimelineViewProps) => {
    return (
        <div className="hidden md:flex flex-1 bg-black flex-col relative w-full overflow-hidden">
            {/* Canvas Header */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black z-10 sticky top-0">
                <h3 className="font-bold text-white">Timeline</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">{history.length} items</span>
                </div>
            </div>

            {/* Canvas Content */}
            <ScrollArea className="flex-1 bg-black">
                <div className="p-6">
                    {history.length === 0 && !isProcessing ? (
                        <div className="h-[60vh] flex flex-col items-center justify-center text-zinc-600">
                            <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                            <p>Create your first masterpiece</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
                            {/* Processing Card */}
                            {isProcessing && (
                                <div className="aspect-[3/4] bg-zinc-900 rounded-xl border border-indigo-500/30 flex flex-col items-center justify-center animate-pulse shadow-lg shadow-indigo-500/10">
                                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                                    <span className="text-xs text-indigo-300 font-medium">{statusMessage}</span>
                                </div>
                            )}

                            {history.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => item.status === 'completed' && setPreviewItem(item)}
                                    className="group relative aspect-[3/4] bg-zinc-900 rounded-xl overflow-hidden cursor-pointer hover:ring-2 ring-[#D1F349]/50 transition-all shadow-lg"
                                >
                                    {item.status === 'completed' ? (
                                        item.type === 'image' ? (
                                            <img
                                                src={getThumbnailUrl(item.url, 400)}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                loading="lazy"
                                                alt={item.prompt}
                                            />
                                        ) : (
                                            <video src={item.url} className="w-full h-full object-cover" />
                                        )
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-zinc-500 gap-2">
                                            <Loader2 className="animate-spin w-6 h-6" />
                                            <span className="text-[10px]">{item.status}</span>
                                        </div>
                                    )}
                                    {item.status === 'completed' && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                            <p className="text-[10px] text-white line-clamp-2 font-medium">{item.prompt}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};
