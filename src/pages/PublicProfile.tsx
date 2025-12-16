import { useState, useEffect } from "react";
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
  ExternalLink,
  Loader2,
  Sparkles,
  Play,
  ArrowLeft
} from "lucide-react";
import { ENV } from "@/config/env";
import { getCurrentUser } from "@/services/eventsApi";
import { toast } from "sonner";

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
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [creations, setCreations] = useState<Creation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCreation, setSelectedCreation] = useState<Creation | null>(null);

  const currentUser = getCurrentUser();
  const isOwnProfile = currentUser?.username === username || currentUser?.slug === username;

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${ENV.API_URL}/api/users/profile/${username}`);

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
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Profile not found</h1>
          <p className="text-zinc-400 mb-4">This user doesn't exist or their profile is private.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="bg-black/50 backdrop-blur-sm hover:bg-black/70"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Cover Image */}
      <div className="relative h-48 md:h-64 w-full">
        {profile.cover_image_url ? (
          <img
            src={profile.cover_image_url}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Profile Content */}
      <div className="max-w-5xl mx-auto px-4 -mt-20 relative z-10">
        {/* Avatar & Info */}
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-black overflow-hidden bg-zinc-800 shadow-xl">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name || profile.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">
                  {(profile.name || profile.username || 'U')[0].toUpperCase()}
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
                  onClick={() => navigate((currentUser?.role || '').startsWith('business') ? '/admin/settings/business' : '/creator/settings')}
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit Profile
                </Button>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-red-400" />
                <span className="font-semibold">{profile.stats?.likes || 0}</span>
                <span className="text-zinc-400">likes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                <span className="font-semibold">{profile.stats?.posts || creations.length}</span>
                <span className="text-zinc-400">posts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-green-400" />
                <span className="font-semibold">{profile.stats?.views || 0}</span>
                <span className="text-zinc-400">views</span>
              </div>
            </div>
          </div>

          {/* Share Button */}
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

        {/* Bio */}
        {profile.bio && (
          <p className="text-zinc-300 mb-6 max-w-2xl">{profile.bio}</p>
        )}

        {/* Social Links */}
        {profile.social_links && Object.values(profile.social_links).some(v => v) && (
          <div className="flex items-center gap-3 mb-8">
            {profile.social_links.x && (
              <a
                href={`https://x.com/${profile.social_links.x}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            )}
            {profile.social_links.instagram && (
              <a
                href={`https://instagram.com/${profile.social_links.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            )}
            {profile.social_links.youtube && (
              <a
                href={`https://youtube.com/@${profile.social_links.youtube}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            )}
            {profile.social_links.tiktok && (
              <a
                href={`https://tiktok.com/@${profile.social_links.tiktok}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
              </a>
            )}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900/50 border border-white/10 p-1 mb-6">
            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-black">
              All
            </TabsTrigger>
            <TabsTrigger value="image" className="data-[state=active]:bg-white data-[state=active]:text-black">
              Image
            </TabsTrigger>
            <TabsTrigger value="video" className="data-[state=active]:bg-white data-[state=active]:text-black">
              Video
            </TabsTrigger>
            <TabsTrigger value="boards" className="data-[state=active]:bg-white data-[state=active]:text-black">
              Boards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <CreationsGrid creations={filteredCreations} isOwnProfile={isOwnProfile} />
          </TabsContent>
          <TabsContent value="image" className="mt-0">
            <CreationsGrid creations={filteredCreations} isOwnProfile={isOwnProfile} />
          </TabsContent>
          <TabsContent value="video" className="mt-0">
            <CreationsGrid creations={filteredCreations} isOwnProfile={isOwnProfile} />
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
  );
}

// Creations Grid Component
function CreationsGrid({ creations, isOwnProfile }: { creations: Creation[], isOwnProfile: boolean }) {
  if (creations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        {isOwnProfile ? (
          <>
            <div className="flex -space-x-2 mb-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-16 h-16 rounded-lg bg-zinc-800 border-2 border-black overflow-hidden"
                  style={{ transform: `rotate(${(i - 2.5) * 5}deg)` }}
                >
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
                </div>
              ))}
            </div>
            <h3 className="text-lg font-semibold mb-2">Create. Share. Inspire.</h3>
            <p className="text-zinc-500 text-center max-w-sm mb-4">
              Publish your generations and see how others bring their ideas to life.
            </p>
            <Button className="bg-lime-400 hover:bg-lime-500 text-black font-medium">
              <Sparkles className="w-4 h-4 mr-2" />
              Publish
            </Button>
          </>
        ) : (
          <div className="text-zinc-500">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No published creations yet</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {creations.map((creation) => (
        <div
          key={creation.id}
          className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900 group cursor-pointer"
        >
          {creation.type === 'video' ? (
            <>
              <video
                src={creation.url}
                className="w-full h-full object-cover"
                muted
                loop
                onMouseEnter={(e) => e.currentTarget.play()}
                onMouseLeave={(e) => {
                  e.currentTarget.pause();
                  e.currentTarget.currentTime = 0;
                }}
              />
              <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 backdrop-blur-sm">
                <Play className="w-3 h-3 text-white" fill="white" />
              </div>
            </>
          ) : (
            <img
              src={creation.thumbnail_url || creation.url}
              alt=""
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {creation.likes}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {creation.views}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

