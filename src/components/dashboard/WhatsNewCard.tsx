import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Package, Zap, ExternalLink, Megaphone, ChevronRight } from "lucide-react";
import { getHomeContent, type Announcement } from "@/services/contentApi";
import { useNavigate } from "react-router-dom";

interface WhatsNewCardProps {
    userType?: 'personal' | 'business';
}

export function WhatsNewCard({ userType = 'business' }: WhatsNewCardProps) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("features");
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
                <CardHeader className="pb-4 pt-6 px-5 md:px-8 flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
                        <div className="w-8 h-8 rounded-full bg-[#D1F349]/10 flex items-center justify-center shrink-0">
                            <Zap className="w-4 h-4 text-[#D1F349] fill-[#D1F349]" />
                        </div>
                        <CardTitle className="text-lg md:text-xl font-black tracking-tight text-white uppercase leading-none">What's New</CardTitle>
                    </div>

                    <TabsList className="bg-white/5 border border-white/5 h-10 p-1 w-fit mx-auto sm:mx-0">
                        <TabsTrigger value="features" className="text-[10px] font-bold uppercase tracking-wider h-8 px-4 md:px-6 data-[state=active]:bg-[#D1F349] data-[state=active]:text-black flex-none">Features</TabsTrigger>
                        <TabsTrigger value="templates" className="text-[10px] font-bold uppercase tracking-wider h-8 px-4 md:px-6 data-[state=active]:bg-[#D1F349] data-[state=active]:text-black flex-none">Tips</TabsTrigger>
                        <TabsTrigger value="other" className="text-[10px] font-bold uppercase tracking-wider h-8 px-4 md:px-6 data-[state=active]:bg-[#D1F349] data-[state=active]:text-black flex-none">Alerts</TabsTrigger>
                    </TabsList>
                </CardHeader>

                <CardContent className="px-5 md:px-8 pb-6 md:pb-8 pt-2">
                    <div className="min-h-[140px]">
                        <TabsContent value="features" className="m-0 grid grid-cols-1 xl:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                            {features.length > 0 ? (
                                features.map(a => <AnnouncementItem key={a.id} announcement={a} onCTA={handleCTA} />)
                            ) : (
                                <div className="xl:col-span-2">
                                    <EmptyState icon={<Package className="w-8 h-8" />} text="No new features yet" />
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="templates" className="m-0 grid grid-cols-1 xl:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                            {templates.length > 0 ? (
                                templates.map(a => <AnnouncementItem key={a.id} announcement={a} onCTA={handleCTA} />)
                            ) : (
                                <div className="xl:col-span-2">
                                    <EmptyState icon={<Sparkles className="w-8 h-8" />} text="Stay tuned for pro tips" />
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="other" className="m-0 grid grid-cols-1 xl:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                            {other.length > 0 ? (
                                other.map(a => <AnnouncementItem key={a.id} announcement={a} onCTA={handleCTA} />)
                            ) : (
                                <div className="xl:col-span-2">
                                    <EmptyState icon={<Megaphone className="w-8 h-8" />} text="Systems are operational" />
                                </div>
                            )}
                        </TabsContent>
                    </div>
                </CardContent>
            </Card>
        </Tabs>
    );
}

function AnnouncementItem({ announcement, onCTA }: { announcement: Announcement; onCTA: (url?: string) => void }) {
    return (
        <div
            className={`relative p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all duration-300 group/item`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white group-hover/item:text-[#D1F349] transition-colors uppercase tracking-tight">
                            {announcement.title}
                        </h4>
                        <div className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                            {new Date(announcement.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-full">
                        {announcement.content}
                    </p>
                    {announcement.cta_url && (
                        <button
                            onClick={() => onCTA(announcement.cta_url)}
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
