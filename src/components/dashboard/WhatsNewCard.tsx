import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Package, Zap, ExternalLink, Megaphone, ChevronRight, X } from "lucide-react";
import { getHomeContent, type Announcement } from "@/services/contentApi";
import { useNavigate } from "react-router-dom";

interface WhatsNewCardProps {
    userType?: 'personal' | 'business';
}

export function WhatsNewCard({ userType = 'business' }: WhatsNewCardProps) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("features");
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchAnnouncements() {
            try {
                const data = await getHomeContent(userType);
                setAnnouncements(data.announcements || []);
            } catch (error) {
                console.error("Failed to fetch announcements:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchAnnouncements();
    }, [userType]);

    // Filter announcements by internal classification (for the tabs)
    // map backend types to UI tabs
    const features = announcements.filter(a => a.type === 'new_feature' || a.type === 'update');
    const templates = announcements.filter(a => a.type === 'pro_tip'); // Pro tips usually relate to templates/tips
    const other = announcements.filter(a => a.type === 'maintenance' || a.type === 'alert');

    // If no announcements, hide the component (User Request)
    if (!isLoading && announcements.length === 0) return null;

    const handleCTA = (url?: string) => {
        if (!url) return;
        if (url.startsWith('auto:')) {
            // Internal custom routing if needed
            return;
        }
        if (url.startsWith('http')) {
            window.open(url, '_blank');
        } else {
            navigate(url);
        }
    };

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <Card className="bg-[#080808] border-white/5 rounded-2xl md:rounded-3xl overflow-hidden group shadow-2xl shadow-black/50">
                <CardHeader className="pb-4 pt-6 px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-5">
                    <div className="flex items-center gap-2.5 w-full md:w-auto justify-center md:justify-start">
                        <div className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-[#D1F349]/10 flex items-center justify-center shrink-0">
                            <Zap className="w-4.5 h-4.5 md:w-4 md:h-4 text-[#D1F349] fill-[#D1F349]" />
                        </div>
                        <CardTitle className="text-lg md:text-xl font-black tracking-tight text-white uppercase leading-none">What's New</CardTitle>
                    </div>

                    <TabsList className="bg-white/5 border border-white/5 h-10 p-1 w-full max-w-sm md:w-fit mx-auto md:mx-0">
                        <TabsTrigger value="features" className="flex-1 md:flex-none text-[9px] md:text-[10px] font-bold uppercase tracking-wider h-8 px-3 md:px-6 data-[state=active]:bg-[#D1F349] data-[state=active]:text-black">Features</TabsTrigger>
                        <TabsTrigger value="templates" className="flex-1 md:flex-none text-[9px] md:text-[10px] font-bold uppercase tracking-wider h-8 px-3 md:px-6 data-[state=active]:bg-[#D1F349] data-[state=active]:text-black">Tips</TabsTrigger>
                        <TabsTrigger value="other" className="flex-1 md:flex-none text-[9px] md:text-[10px] font-bold uppercase tracking-wider h-8 px-3 md:px-6 data-[state=active]:bg-[#D1F349] data-[state=active]:text-black">Alerts</TabsTrigger>
                    </TabsList>
                </CardHeader>

                <CardContent className="px-4 md:px-8 pb-6 md:pb-8 pt-2">
                    <div className="min-h-[140px]">
                        <TabsContent value="features" className="m-0 grid grid-cols-1 xl:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                            {features.length > 0 ? (
                                features.map(a => <AnnouncementItem key={a.id} announcement={a} onCTA={handleCTA} onImageClick={() => setSelectedAnnouncement(a)} />)
                            ) : (
                                <div className="xl:col-span-2">
                                    <EmptyState icon={<Package className="w-8 h-8" />} text="No new features yet" />
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="templates" className="m-0 grid grid-cols-1 xl:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                            {templates.length > 0 ? (
                                templates.map(a => <AnnouncementItem key={a.id} announcement={a} onCTA={handleCTA} onImageClick={() => setSelectedAnnouncement(a)} />)
                            ) : (
                                <div className="xl:col-span-2">
                                    <EmptyState icon={<Sparkles className="w-8 h-8" />} text="Stay tuned for pro tips" />
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="other" className="m-0 grid grid-cols-1 xl:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                            {other.length > 0 ? (
                                other.map(a => <AnnouncementItem key={a.id} announcement={a} onCTA={handleCTA} onImageClick={() => setSelectedAnnouncement(a)} />)
                            ) : (
                                <div className="xl:col-span-2">
                                    <EmptyState icon={<Megaphone className="w-8 h-8" />} text="Systems are operational" />
                                </div>
                            )}
                        </TabsContent>
                    </div>
                </CardContent>
            </Card>

            {/* Image Modal */}
            <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
                <DialogContent className="bg-[#080808] border-white/10 text-white max-w-3xl p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-4">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">
                            {selectedAnnouncement?.title}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedAnnouncement?.image_url && (
                        <div className="relative w-full">
                            <img 
                                src={selectedAnnouncement.image_url} 
                                alt={selectedAnnouncement.title}
                                className="w-full h-auto max-h-[70vh] object-contain"
                            />
                        </div>
                    )}
                    <div className="p-6 pt-4 space-y-4">
                        <p className="text-sm text-zinc-300 leading-relaxed">
                            {selectedAnnouncement?.content}
                        </p>
                        {selectedAnnouncement?.cta_url && (
                            <Button
                                onClick={() => {
                                    handleCTA(selectedAnnouncement.cta_url);
                                    setSelectedAnnouncement(null);
                                }}
                                className="w-full bg-[#D1F349] text-black hover:bg-[#D1F349]/90 font-black uppercase tracking-wider"
                            >
                                {selectedAnnouncement.cta_label || 'Learn More'}
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Tabs>
    );
}

function AnnouncementItem({ announcement, onCTA, onImageClick }: { 
    announcement: Announcement; 
    onCTA: (url?: string) => void;
    onImageClick: () => void;
}) {
    const hasImage = !!announcement.image_url;

    return (
        <div
            className={`relative p-5 md:p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 group/item overflow-hidden ${
                hasImage ? 'cursor-pointer' : 'bg-white/[0.02] hover:bg-white/[0.04]'
            }`}
            onClick={hasImage ? onImageClick : undefined}
        >
            {/* Background Image with Overlay */}
            {hasImage && (
                <>
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover/item:scale-105"
                        style={{ backgroundImage: `url(${announcement.image_url})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />
                </>
            )}

            {/* Content */}
            <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                        <h4 className={`text-[13px] md:text-base font-black uppercase tracking-tight transition-colors ${
                            hasImage 
                                ? 'text-white group-hover/item:text-[#D1F349]' 
                                : 'text-white group-hover/item:text-[#D1F349]'
                        }`}>
                            {announcement.title}
                        </h4>
                        <div className="hidden sm:block w-1 h-1 rounded-full bg-zinc-700" />
                        <span className="text-[9px] md:text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                            {new Date(announcement.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                    <p className={`text-[12px] md:text-xs leading-relaxed max-w-full line-clamp-2 ${
                        hasImage ? 'text-zinc-200' : 'text-zinc-400'
                    }`}>
                        {announcement.content}
                    </p>
                    {announcement.cta_url && !hasImage && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onCTA(announcement.cta_url);
                            }}
                            className="mt-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#D1F349] hover:text-white transition-colors py-1 group/btn"
                        >
                            {announcement.cta_label || 'Learn More'}
                            <ChevronRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-0.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 opacity-40">
            <div className="text-zinc-600">{icon}</div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">{text}</p>
        </div>
    );
}
