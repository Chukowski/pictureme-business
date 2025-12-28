import { Wand2, Download } from 'lucide-react';
import { GalleryItem } from '@/components/creator/CreationDetailView';
import { getThumbnailUrl } from '@/services/imgproxy';

interface GalleryViewProps {
    history: GalleryItem[];
    setPreviewItem: (item: GalleryItem) => void;
    onReusePrompt: (item: GalleryItem) => void;
    onDownload: (item: GalleryItem) => void;
}

export const GalleryView = ({
    history,
    setPreviewItem,
    onReusePrompt,
    onDownload
}: GalleryViewProps) => {
    return (
        <div className="flex-1 bg-[#101112] p-8 md:overflow-y-auto overflow-visible">
            <div className="max-w-7xl mx-auto">
                <h2 className="text-2xl font-bold text-white mb-6">Gallery</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {history.map((item, index) => {
                        const isHero = (item as any).is_hero || false;
                        return (
                            <div
                                key={item.id}
                                onClick={() => setPreviewItem(item)}
                                className="cursor-pointer aspect-[3/4] bg-card rounded-lg overflow-hidden relative group"
                            >
                                {item.type === 'image' ? (
                                    <img
                                        src={getThumbnailUrl(item.url, 400)}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        alt={item.prompt || ''}
                                        loading={isHero ? "eager" : "lazy"}
                                        decoding="async"
                                    />
                                ) : (
                                    <video src={item.url} className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-[#101112]/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onReusePrompt(item); }}
                                            className="w-10 h-10 rounded-full bg-[#D1F349] text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-lg"
                                            title="Remix"
                                        >
                                            <Wand2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDownload(item); }}
                                            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-lg"
                                            title="Download"
                                        >
                                            <Download className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <span className="text-[10px] font-bold text-white uppercase tracking-widest opacity-50">View Details</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
