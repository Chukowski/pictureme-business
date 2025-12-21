import React from 'react';
import { Sparkles } from 'lucide-react';
import { GalleryItem } from '@/components/creator/CreationDetailView';
import { getThumbnailUrl } from '@/services/imgproxy';

interface GalleryViewProps {
    history: GalleryItem[];
    setPreviewItem: (item: GalleryItem) => void;
}

export const GalleryView = ({ history, setPreviewItem }: GalleryViewProps) => {
    return (
        <div className="flex-1 bg-black p-8 md:overflow-y-auto overflow-visible">
            <div className="max-w-7xl mx-auto">
                <h2 className="text-2xl font-bold text-white mb-6">Gallery</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {history.map(item => (
                        <div
                            key={item.id}
                            onClick={() => setPreviewItem(item)}
                            className="cursor-pointer aspect-[3/4] bg-zinc-900 rounded-lg overflow-hidden relative group"
                        >
                            {item.type === 'image' ? (
                                <img
                                    src={getThumbnailUrl(item.url, 400)}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    alt={item.prompt}
                                />
                            ) : (
                                <video src={item.url} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Sparkles className="text-white" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
