import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  Eye,
  Image as ImageIcon,
  Video,
  Grid3X3,
  Edit2,
  Share2,
  Loader2,
  Sparkles,
  Play,
  ArrowLeft
} from "lucide-react";
import { ENV } from "@/config/env";
import { getCurrentUser, toggleLike } from "@/services/eventsApi";
import { updateCreationAdultStatus } from "@/services/api/business";
import { toast } from "sonner";
import { CreationDetailView, GalleryItem } from "@/components/creator/CreationDetailView";
// CDN service for public content (Cloudflare Image Resizing)
import { getAvatarUrl, getViewUrl as getOptimizedUrl, getThumbnailUrl, getDownloadUrl, getProcessingUrl, getProxyDownloadUrl } from "@/services/cdn";
import { useUserTier } from "@/services/userTier";
import { isUserAdult } from "@/lib/utils";


interface UserProfile {
  id: number;
  username: string;
  slug: string;
  name: string;
  full_name: string;
  email: string;
  avatar_url: string;
  cover_image_url: string;
  bio: string;
  social_links: {
    x?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
  };
  is_public: boolean;
  created_at: string;
  stats: {
    likes: number;
    posts: number;
    views: number;
    is_liked?: boolean;
  };
}

interface Creation {
  id: string;
  url: string;
  thumbnail_url?: string;
  type: 'image' | 'video';
  prompt?: string;
  model?: string;
  likes: number;
  views: number;
  created_at: string;
  is_published: boolean;
  is_liked?: boolean;
  parent_id?: number | string;
  parent_username?: string;
  is_adult?: boolean;
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [creations, setCreations] = useState<Creation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [hasAdultContent, setHasAdultContent] = useState(false); // Flag from backend

  // Immersive Preview State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const currentUser = getCurrentUser();
  const { tier: userTier } = useUserTier();
  const isOwnProfile = currentUser?.username === username || currentUser?.slug === username;

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${ENV.API_URL}/api/users/profile/${username}`, { headers });

      if (!response.ok) {
        if (response.status === 404) {
          navigate('/404');
          return;
        }
        throw new Error('Failed to load profile');
      }

      const data = await response.json();
      setProfile(data.profile);
      setCreations(data.creations || []);
      setHasAdultContent(data.has_adult_content || false);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLike = async (creation: Creation, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!currentUser) {
      toast.error("Please login to like creations");
      return;
    }

    const previousCreations = [...creations];
    const previousProfile = profile ? { ...profile } : null;

    const updatedCreations = creations.map(c => {
      if (c.id === creation.id) {
        return {
          ...c,
          likes: c.is_liked ? c.likes - 1 : c.likes + 1,
          is_liked: !c.is_liked
        };
      }
      return c;
    });
    setCreations(updatedCreations);

    if (profile) {
      setProfile({
        ...profile,
        stats: {
          ...profile.stats,
          likes: creation.is_liked
            ? profile.stats.likes - 1
            : profile.stats.likes + 1
        }
      });
    }

    try {
      const result = await toggleLike(parseInt(creation.id));
      if (!result.success) throw new Error("Failed to like");
    } catch (error) {
      console.error("Like failed", error);
      toast.error("Failed to update like");
      setCreations(previousCreations);
      if (previousProfile) setProfile(previousProfile);
    }
  };

  const handleToggleAdult = async (creation: Creation) => {
    const newStatus = !creation.is_adult;
    const previousCreations = [...creations];

    setCreations(creations.map(c => c.id === creation.id ? { ...c, is_adult: newStatus } : c));

    try {
      await updateCreationAdultStatus(Number(creation.id), newStatus);
      toast.success(newStatus ? "Marked as Adult Content" : "Adult Content filter removed");
    } catch (error) {
      console.error("Update adult status failed", error);
      toast.error("Failed to update adult status");
      setCreations(previousCreations);
    }
  };

  const filteredCreations = creations.filter(c => {
    if (activeTab === 'all') return true;
    if (activeTab === 'image') return c.type === 'image';
    if (activeTab === 'video') return c.type === 'video';
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#101112] text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#101112] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Profile not found</h1>
          <p className="text-zinc-400 mb-4">This user doesn't exist or their profile is private.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={profile?.username ? `@${profile.username}` : "Public Profile"}
        description={`Check out ${profile?.username || 'this user'}'s AI-generated creations on PictureMe.Now.`}
        image={profile?.avatar_url || undefined}
      />
      <div className="min-h-screen bg-[#101112] text-white">
        {/* Back Button */}
        <div className="fixed top-4 left-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="bg-[#101112]/50 backdrop-blur-sm hover:bg-[#101112]/70"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Cover Image */}
        <div className="relative h-48 md:h-64 w-full">
          {profile.cover_image_url ? (
            <img
              src={getOptimizedUrl(profile.cover_image_url, 1400)}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#101112]/60 to-transparent" />
        </div>

        {/* Profile Content */}
        <div className="max-w-5xl mx-auto px-4 -mt-20 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-black overflow-hidden bg-zinc-800 shadow-xl">
              {profile.avatar_url ? (
                <img
                  src={getAvatarUrl(profile.avatar_url, 200)}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">
                    {(profile.username || 'U')[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold">{profile.username}</h1>
                {isOwnProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/business/settings')}
                    className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit Profile
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-red-400" />
                  <span className="font-semibold">{profile.stats?.likes || 0}</span>
                  <span className="text-zinc-400">likes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold">{creations.length}</span>
                  <span className="text-zinc-400">posts</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-green-400" />
                  <span className="font-semibold">{profile.stats?.views || 0}</span>
                  <span className="text-zinc-400">views</span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Profile link copied!");
              }}
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 self-start md:self-auto"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          {profile.bio && <p className="text-zinc-300 mb-6 max-w-2xl">{profile.bio}</p>}

          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="bg-card/50 border border-white/10 p-1 mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="image">Image</TabsTrigger>
              <TabsTrigger value="video">Video</TabsTrigger>
              <TabsTrigger value="boards">Boards</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              <CreationsGrid
                creations={filteredCreations}
                isOwnProfile={isOwnProfile}
                isAuthenticated={!!currentUser}
                hasAdultContent={hasAdultContent}
                onLike={handleToggleLike}
                onItemClick={(index) => {
                  setPreviewIndex(index);
                  setPreviewOpen(true);
                }}
              />
            </TabsContent>
            <TabsContent value="image" className="mt-0">
              <CreationsGrid
                creations={filteredCreations}
                isOwnProfile={isOwnProfile}
                isAuthenticated={!!currentUser}
                hasAdultContent={hasAdultContent}
                onLike={handleToggleLike}
                onItemClick={(index) => {
                  setPreviewIndex(index);
                  setPreviewOpen(true);
                }}
              />
            </TabsContent>
            <TabsContent value="video" className="mt-0">
              <CreationsGrid
                creations={filteredCreations}
                isOwnProfile={isOwnProfile}
                isAuthenticated={!!currentUser}
                hasAdultContent={hasAdultContent}
                onLike={handleToggleLike}
                onItemClick={(index) => {
                  setPreviewIndex(index);
                  setPreviewOpen(true);
                }}
              />
            </TabsContent>
            <TabsContent value="boards" className="mt-0">
              <div className="text-center py-12 text-zinc-500">
                <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No boards yet</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <CreationDetailView
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        items={creations.map(c => ({
          ...c,
          previewUrl: c.thumbnail_url || c.url,
          prompt: c.prompt,
          model: c.model,
          isOwner: isOwnProfile,
          creator_username: profile.username,
          creator_avatar: profile.avatar_url,
          creator_slug: profile?.slug || username,
          creator_user_id: profile.id,
          isAdult: c.is_adult,
          parent_id: c.parent_id,
          parent_username: c.parent_username
        })) as GalleryItem[]}
        initialIndex={previewIndex}
        onDownload={async (item) => {
          try {
            if (item.type === 'video') {
              const proxyUrl = getProxyDownloadUrl(item.url, `creation-${item.id}.mp4`);
              window.location.href = proxyUrl;
              return;
            }

            // 1. Get optimized imgproxy URL
            const optimizedUrl = getDownloadUrl(item.url, userTier);

            // 2. Wrap in backend proxy to force download header
            const proxyUrl = getProxyDownloadUrl(optimizedUrl, `creation-${item.id}.webp`);

            // 3. Trigger download
            window.location.href = proxyUrl;

            toast.success("Download started");
          } catch (e) {
            console.error("Download failed", e);
            window.open(item.url, '_blank');
          }
        }}
        onReusePrompt={(item, remixMode) => {
          setPreviewOpen(false);
          // Use imgproxy-processed URL for remix to avoid 413 errors
          const optimizedSourceUrl = item.type === 'image'
            ? getProcessingUrl(item.url, 2048)
            : item.url;
          const remixState = {
            prompt: item.prompt || '',
            selectedTemplate: (item as any).template || null,
            sourceImageUrl: optimizedSourceUrl,
            remixFrom: item.id,
            remixFromUsername: item.creator_username,
            remixMode: remixMode,
            view: 'create'
          };
          navigate('/business/playground', { state: remixState });
        }}
        onToggleAdult={handleToggleAdult}
      />
    </>
  );
}

function CreationsGrid({ creations, isOwnProfile, isAuthenticated, hasAdultContent, onLike, onItemClick }: {
  creations: Creation[],
  isOwnProfile: boolean,
  isAuthenticated: boolean,
  hasAdultContent: boolean, // Flag from backend indicating profile has 18+ content
  onLike: (c: Creation, e: React.MouseEvent) => void,
  onItemClick: (index: number) => void
}) {
  const [showAdultContent, setShowAdultContent] = useState(false);
  const [blurredItems, setBlurredItems] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const isAdult = isUserAdult(currentUser?.birth_date);

  // 18+ Content Policy:
  // - Owner: sees ALL their content (no filter needed, backend handles)
  // - Authenticated users (18+): can opt-in to see 18+ content (blurred)
  // - Minor users (<18): CANNOT see 18+ content at all
  // - Anonymous visitors: CANNOT see 18+ content at all (filtered by backend)
  
  // Filter creations based on adult content toggle and user age
  // Only allow showing adult content if user is an adult
  const filteredCreations = (showAdultContent && isAdult) || isOwnProfile
    ? creations
    : creations.filter(c => !c.is_adult);

  // Initialize blurred state for all adult content when showAdultContent is enabled
  useEffect(() => {
    if (showAdultContent) {
      const adultIds = new Set(creations.filter(c => c.is_adult).map(c => c.id));
      setBlurredItems(adultIds);
    }
  }, [showAdultContent, creations]);

  const toggleBlur = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBlurredItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (filteredCreations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50 text-zinc-500" />
        <p className="text-zinc-500 mb-4 text-center max-w-sm">
          {creations.length > 0 && !showAdultContent && !isOwnProfile
            ? isAuthenticated
              ? isAdult
                ? "All content is marked as 18+. Enable the filter to view (content will be blurred)."
                : "This profile contains 18+ content which is restricted for your account."
              : "All content is marked as 18+. Please sign in to view."
            : "No creations yet"}
        </p>
        {!isAuthenticated && creations.length > 0 && (
          <Button
            onClick={() => navigate('/auth')}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            Sign In to View 18+ Content
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Adult Content Filter - Only show for authenticated non-owners who are 18+ */}
      {!isOwnProfile && isAuthenticated && isAdult && creations.some(c => c.is_adult) && (
        <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-zinc-300">Adult Content (18+)</span>
            <span className="text-xs text-zinc-500">Sensitive content will appear blurred. Click to reveal.</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showAdultContent}
              onChange={(e) => setShowAdultContent(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
          </label>
        </div>
      )}
      
      {/* Message for anonymous users or minors if there's adult content */}
      {!isOwnProfile && hasAdultContent && (
        <div className="mb-4 pb-4 border-b border-white/10">
          {!isAuthenticated ? (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-zinc-300 mb-2">
                  This profile contains 18+ content that requires authentication to view.
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate('/auth')}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  Sign In to View All Content
                </Button>
              </div>
            </div>
          ) : !isAdult && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-400">
                  Some content on this profile has been hidden based on your account age restrictions.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredCreations.map((creation, index) => {
          const isHero = (creation as any).is_hero || false;
          const isBlurred = creation.is_adult && showAdultContent && blurredItems.has(creation.id);
          
          return (
            <div
              key={creation.id}
              onClick={() => !isBlurred && onItemClick(index)}
              className="relative aspect-square rounded-xl overflow-hidden bg-card group cursor-pointer"
            >
              {creation.type === 'video' ? (
                <>
                  <video
                    src={creation.url}
                    className={`w-full h-full object-cover ${isBlurred ? 'blur-2xl' : ''}`}
                    muted
                    loop
                    onMouseEnter={(e) => !isBlurred && e.currentTarget.play()}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                  />
                  <div className="absolute top-2 right-2 p-1.5 rounded-full bg-[#101112]/50 backdrop-blur-sm z-20">
                    <Play className="w-3 h-3 text-white" fill="white" />
                  </div>
                </>
              ) : (
                <img
                  src={getThumbnailUrl(creation.thumbnail_url || creation.url, 400)}
                  alt=""
                  className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${isBlurred ? 'blur-2xl' : ''}`}
                  loading={isHero ? "eager" : "lazy"}
                  decoding="async"
                />
              )}

              {/* 18+ Badge */}
              {creation.is_adult && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-red-500/80 backdrop-blur-sm rounded-md z-20">
                  <span className="text-white text-[10px] font-black">18+</span>
                </div>
              )}

              {/* Blur Overlay for 18+ content */}
              {isBlurred && (
                <div 
                  className="absolute inset-0 backdrop-blur-2xl bg-black/40 flex flex-col items-center justify-center z-30 cursor-pointer"
                  onClick={(e) => toggleBlur(creation.id, e)}
                >
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-3 border border-red-500/30">
                    <span className="text-red-500 font-black text-sm">18+</span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/80 mb-1">Adult Content</p>
                  <p className="text-[8px] text-white/60">Click to view</p>
                </div>
              )}

              <div className="absolute inset-0 bg-[#101112]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 z-10">
                <div className="flex items-center gap-4 text-sm w-full">
                  <button
                    className="flex items-center gap-1 hover:scale-105 transition-transform"
                    onClick={(e) => onLike(creation, e)}
                  >
                    <Heart
                      className={`w-4 h-4 ${creation.is_liked ? "fill-red-500 text-red-500" : "text-white"}`}
                    />
                    <span className="text-white font-medium">{creation.likes}</span>
                  </button>
                  <span className="flex items-center gap-1 text-white/80">
                    <Eye className="w-4 h-4" />
                    {creation.views}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
