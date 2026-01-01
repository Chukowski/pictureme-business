import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2, Eye, ExternalLink, Globe, Lock, Filter, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getBoothPhotos, updateBoothPhotoVisibility, type BoothPhoto } from "@/services/eventsApi";
import { formatDistanceToNow } from 'date-fns';

interface BoothPhotoManagerProps {
    eventId: number | string;
    className?: string;
}

export const BoothPhotoManager = ({ eventId, className }: BoothPhotoManagerProps) => {
    const [photos, setPhotos] = useState<BoothPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'published' | 'private'>('all');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchPhotos = async () => {
        setLoading(true);
        try {
            const data = await getBoothPhotos(eventId);
            setPhotos(data);
        } catch (error) {
            console.error("Failed to fetch booth photos:", error);
            toast.error("Failed to load photos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPhotos();
    }, [eventId]);

    const handleTogglePublish = async (photo: BoothPhoto) => {
        setUpdatingId(photo.share_code);
        try {
            const newStatus = !photo.published;
            await updateBoothPhotoVisibility(photo.share_code, newStatus);

            // Update local state
            setPhotos(prev => prev.map(p =>
                p.share_code === photo.share_code ? { ...p, published: newStatus } : p
            ));

            toast.success(newStatus ? "Photo published to feed" : "Photo made private");
        } catch (error) {
            toast.error("Failed to update photo Status");
        } finally {
            setUpdatingId(null);
        }
    };

    const filteredPhotos = photos.filter(p => {
        if (filter === 'published') return p.published;
        if (filter === 'private') return !p.published;
        return true;
    });

    return (
        <Card className={`border-border/40 shadow-sm bg-card/30 backdrop-blur-sm ${className}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="space-y-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Eye className="w-5 h-5 text-indigo-500" />
                        Booth Photos
                    </CardTitle>
                    <CardDescription>
                        Manage photos generated in this booth.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchPhotos} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-[400px]">
                            <TabsList className="bg-muted/50">
                                <TabsTrigger value="all">All Photos ({photos.length})</TabsTrigger>
                                <TabsTrigger value="published">Published ({photos.filter(p => p.published).length})</TabsTrigger>
                                <TabsTrigger value="private">Private ({photos.filter(p => !p.published).length})</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                            <p>Loading photos...</p>
                        </div>
                    ) : filteredPhotos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-muted/10">
                            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                <Filter className="w-6 h-6 opacity-50" />
                            </div>
                            <p>No photos found matching this filter.</p>
                            {photos.length === 0 && (
                                <p className="text-xs mt-2">Generate some photos in your booth to see them here.</p>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredPhotos.map((photo) => (
                                <div key={photo.share_code} className="group relative rounded-xl overflow-hidden border border-border/50 bg-card">
                                    <div className="aspect-[9/16] bg-black relative">
                                        <img
                                            src={photo.url}
                                            alt="Booth output"
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                                            <div className="flex justify-between items-start">
                                                <Badge variant={photo.published ? "default" : "secondary"} className={`text-[10px] h-5 ${photo.published ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-black/50 backdrop-blur-md border-white/10 text-white'}`}>
                                                    {photo.published ? <Globe className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                                                    {photo.published ? 'Public' : 'Private'}
                                                </Badge>
                                            </div>

                                            <div className="flex gap-2 justify-center">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="h-8 text-[10px] bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md"
                                                    onClick={() => window.open(photo.url, '_blank')}
                                                >
                                                    <ExternalLink className="w-3 h-3 mr-1" />
                                                    View
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 space-y-3">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{formatDistanceToNow(new Date(photo.created_at), { addSuffix: true })}</span>
                                            <span className="flex items-center">
                                                <Eye className="w-3 h-3 mr-1" />
                                                {photo.views}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-border/30">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${photo.published ? 'bg-green-500' : 'bg-zinc-500'}`} />
                                                <span className="text-xs font-medium">{photo.published ? 'Published' : 'Private'}</span>
                                            </div>
                                            <Switch
                                                checked={photo.published}
                                                onCheckedChange={() => handleTogglePublish(photo)}
                                                disabled={updatingId === photo.share_code}
                                                className="scale-75 origin-right"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
