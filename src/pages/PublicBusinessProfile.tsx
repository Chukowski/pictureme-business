import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Globe, Instagram, Linkedin, Twitter, Calendar, Image as ImageIcon } from 'lucide-react';
import { getPublicUserProfile, type PublicProfileResponse, type UserCreation, getPublicEvent } from '@/services/eventsApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PublicBusinessProfile() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState<PublicProfileResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'events' | 'creations'>('events');

    useEffect(() => {
        if (slug) {
            loadProfile(slug);
        }
    }, [slug]);

    const loadProfile = async (s: string) => {
        try {
            setIsLoading(true);
            const data = await getPublicUserProfile(s);
            setProfileData(data);
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
                <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
                <p className="text-zinc-400">The organization you are looking for does not exist.</p>
            </div>
        );
    }

    const { profile, creations } = profileData;
    const settings = (profile as any).settings || {}; // Type cast until updated in frontend types
    const themeMode = settings.themeMode || 'dark';

    // Apply theme styles (basic implementation)
    const isLight = themeMode === 'light';
    const bgColor = isLight ? 'bg-zinc-50' : 'bg-black';
    const textColor = isLight ? 'text-zinc-900' : 'text-white';
    const cardBg = isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900/50 border-white/10';
    const mutedText = isLight ? 'text-zinc-500' : 'text-zinc-400';

    const socialLinks = [
        { icon: Globe, url: settings.website, label: 'Website' },
        { icon: Instagram, url: settings.instagram || profile.social_links?.instagram, label: 'Instagram' },
        { icon: Twitter, url: settings.twitter || profile.social_links?.x, label: 'Twitter' }, // legacy x mapping
        { icon: Linkedin, url: settings.linkedin, label: 'LinkedIn' },
        // TikTok icon isn't standard in lucide-react (depending on version), fallback to Globe or omit
    ].filter(link => link.url);

    return (
        <div className={`min-h-screen ${bgColor} ${textColor} font-sans`}>
            {/* Header / Cover */}
            <div className="h-64 relative overflow-hidden bg-gradient-to-r from-indigo-900/20 to-purple-900/20">
                {profile.cover_image_url ? (
                    <img
                        src={profile.cover_image_url}
                        alt="Cover"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-full h-full opacity-30 bg-[url('/grid-pattern.svg')]"></div>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            </div>

            {/* Profile Info */}
            <div className="container mx-auto px-4 -mt-20 relative z-10">
                <div className="flex flex-col md:flex-row items-start gap-6">
                    {/* Avatar */}
                    <div className={`w-36 h-36 rounded-2xl overflow-hidden border-4 ${isLight ? 'border-white' : 'border-black'} shadow-xl bg-zinc-800`}>
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white text-4xl font-bold">
                                {profile.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 pt-20 md:pt-24 lg:pt-20">
                        <h1 className="text-3xl font-bold mb-2">{profile.name}</h1>
                        {settings.description && (
                            <p className={`text-lg ${mutedText} max-w-2xl mb-4`}>{settings.description}</p>
                        )}

                        {/* Social Links */}
                        <div className="flex flex-wrap gap-3">
                            {socialLinks.map((link, i) => (
                                <a
                                    key={i}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`p-2 rounded-full ${isLight ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'} transition-colors`}
                                    title={link.label}
                                >
                                    <link.icon className="w-5 h-5" />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-12 mb-8 border-b border-white/10">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab('events')}
                            className={`pb-4 px-2 font-medium text-lg border-b-2 transition-colors ${activeTab === 'events' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Events
                        </button>
                        <button
                            onClick={() => setActiveTab('creations')}
                            className={`pb-4 px-2 font-medium text-lg border-b-2 transition-colors ${activeTab === 'creations' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Gallery
                        </button>
                    </div>
                </div>

                {/* Content */}
                {activeTab === 'events' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                        {profileData.events && profileData.events.length > 0 ? (
                            profileData.events.map((event) => (
                                <Card key={event._id} className={`${cardBg} overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer`} onClick={() => navigate(`/events/${profile.slug}/${event.slug}`)}>
                                    <div className="aspect-video relative bg-zinc-800">
                                        {event.branding?.logoPath ? (
                                            <img src={event.branding.logoPath} alt={event.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                <ImageIcon className="w-12 h-12" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2">
                                            <Badge className="bg-emerald-500 hover:bg-emerald-600">Live</Badge>
                                        </div>
                                    </div>
                                    <CardContent className="p-4">
                                        <h3 className="text-xl font-bold mb-1 truncate">{event.title}</h3>
                                        <p className={`text-sm ${mutedText} line-clamp-2 h-10 mb-4`}>{event.description || 'No description available.'}</p>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs ${mutedText} flex items-center gap-1`}>
                                                <Calendar className="w-3 h-3" />
                                                {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'Continuous'}
                                            </span>
                                            <Button size="sm" variant="ghost" className="text-indigo-500 hover:text-indigo-400 p-0">
                                                View Feed
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className={`col-span-full py-12 text-center border-2 border-dashed ${isLight ? 'border-zinc-200' : 'border-white/10'} rounded-lg`}>
                                <Calendar className={`w-12 h-12 mx-auto mb-4 ${mutedText}`} />
                                <h3 className="text-xl font-medium mb-2">No Upcoming Events</h3>
                                <p className={mutedText}>Check back later for new events.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'creations' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                        {creations.map((creation) => (
                            <a href={`/gallery/${creation.id}`} key={creation.id} className="block group relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-800">
                                <img
                                    src={creation.url}
                                    alt="Creation"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <ImageIcon className="text-white w-8 h-8" />
                                </div>
                            </a>
                        ))}
                        {creations.length === 0 && (
                            <div className={`col-span-full py-12 text-center border-2 border-dashed ${isLight ? 'border-zinc-200' : 'border-white/10'} rounded-lg`}>
                                <ImageIcon className={`w-12 h-12 mx-auto mb-4 ${mutedText}`} />
                                <h3 className="text-xl font-medium mb-2">No Gallery Items</h3>
                                <p className={mutedText}>This organization hasn't posted anything yet.</p>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
