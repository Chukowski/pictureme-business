import { useRef } from "react";
import { SEO } from "@/components/SEO";
import { useNavigate } from "react-router-dom";
import { Slider } from "@/components/ui/slider";
import { Layout, ChevronRight, Columns2, Columns3 } from "lucide-react";
import { WhatsNewCard } from "@/components/dashboard/WhatsNewCard";
import { RecommendedTemplates } from "@/components/home/RecommendedTemplates";
import { CreationDetailView, GalleryItem } from "@/components/creator/CreationDetailView";
import { useCreatorDashboard } from "@/hooks/useCreatorDashboard";
import { useUserTier } from "@/services/userTier";
import { cn } from "@/lib/utils";

// Refactored Components
import { DashboardHero } from "@/components/dashboard/creator/DashboardHero";
import { FeaturedStyleCard } from "@/components/dashboard/creator/FeaturedStyleCard";
import { CreatorsGallerySection } from "@/components/dashboard/creator/CreatorsGallerySection";
import { RecentCreationsCard } from "@/components/dashboard/creator/BentoCards/RecentCreationsCard";
import { TrendingTagsCard } from "@/components/dashboard/creator/BentoCards/TrendingTagsCard";
import { CommunityChallengeCard } from "@/components/dashboard/creator/BentoCards/CommunityChallengeCard";
import { InfiniteScrollTrigger } from "@/components/dashboard/creator/FeedControls";

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const { tier: userTier } = useUserTier();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const {
    user,
    isLoading,
    publicCreations,
    isFeedLoading,
    hasMore,
    showAdultContent,
    setShowAdultContent,
    loadMorePublicCreations,
    homeState,
    featuredTemplates,
    imageOnlyCreations,
    feedZoom,
    setFeedZoom,
    maxFeedColumns,
    isMobileViewport,
    previewOpen,
    setPreviewOpen,
    previewIndex,
    setPreviewIndex,
    handleDownload,
    handleReusePrompt,
    creations,
    marketplaceTemplates
  } = useCreatorDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const recentCreations = creations.slice(0, 4);
  const hasCreations = creations.length > 0;

  return (
    <>
      <SEO
        title="Creator Dashboard"
        description="Manage your AI creative assets, browse templates, and create stunning new identities."
      />
      <div className="max-w-7xl mx-auto space-y-5 md:space-y-12 px-0 md:px-12 pt-0 md:pt-4">
        <div className="px-1 md:px-0">
          <DashboardHero
            user={user}
            homeState={homeState}
            publicCreations={imageOnlyCreations.slice(0, 6)}
            navigate={navigate}
          />
        </div>

        <div className="w-full px-2 md:px-0">
          <WhatsNewCard userType="personal" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 px-2 md:px-0">
          <div className="lg:col-span-1 h-full">
            <FeaturedStyleCard navigate={navigate} templates={featuredTemplates} user={user} />
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
            <RecentCreationsCard
              creations={recentCreations}
              hasCreations={hasCreations}
              navigate={navigate}
            />

            <div className="flex flex-col gap-4">
              <div className="flex items-end justify-between px-1">
                <div className="flex flex-col">
                  <h3 className="text-sm font-black text-white tracking-widest uppercase mb-0.5">Featured Styles</h3>
                  <p className="text-[11px] text-zinc-500 font-medium">Creator-templates tailored for you</p>
                </div>
                <button
                  onClick={() => navigate('/creator/marketplace')}
                  className="px-4 py-1.5 bg-zinc-800/50 hover:bg-zinc-800 border border-white/10 rounded-full text-xs font-bold text-white flex items-center gap-2 transition-all"
                >
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <RecommendedTemplates templates={marketplaceTemplates} />
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-6">
            <TrendingTagsCard navigate={navigate} templates={marketplaceTemplates} />
            <CommunityChallengeCard navigate={navigate} />
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between mb-6 px-4 md:px-0">
            <h2 className="text-xl font-bold text-white tracking-tight">Feed</h2>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-card/50 rounded-xl border border-white/5">
                <span className="text-xs text-zinc-400 font-medium">Show 18+</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAdultContent}
                    onChange={(e) => setShowAdultContent(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                </label>
              </div>

              {isMobileViewport ? (
                <div className="flex items-center gap-1 bg-card/50 rounded-xl border border-white/5 p-1">
                  {[
                    { num: 2, icon: Columns2 },
                    { num: 3, icon: Columns3 }
                  ].map(({ num, icon: Icon }) => (
                    <button
                      key={num}
                      onClick={() => setFeedZoom([num])}
                      className={cn(
                        "w-9 h-9 rounded-lg transition-all flex items-center justify-center",
                        feedZoom[0] === num
                          ? "bg-[#D1F349] text-black shadow-lg"
                          : "text-zinc-500 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-card/50 rounded-xl border border-white/5">
                  <Layout className="w-3.5 h-3.5 text-zinc-500" />
                  <div className="w-24">
                    <Slider
                      value={feedZoom}
                      onValueChange={setFeedZoom}
                      min={2}
                      max={maxFeedColumns}
                      step={1}
                      className="[&_.bg-primary]:bg-[#D1F349] [&_.border-primary]:border-[#D1F349]"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 w-4">{feedZoom[0]}</span>
                </div>
              )}
            </div>
          </div>

          <div className="px-0.5 md:px-0">
            <CreatorsGallerySection
              creations={publicCreations}
              columnsCount={feedZoom[0]}
              showAdultContent={showAdultContent}
              onImageClick={(creation, index) => {
                setPreviewIndex(index);
                setPreviewOpen(true);
              }}
              onRemixClick={(creation, remixMode = 'full') => {
                handleReusePrompt(creation, remixMode);
              }}
            />
          </div>

          {hasMore && (
            <InfiniteScrollTrigger
              onIntersect={loadMorePublicCreations}
              isLoading={isFeedLoading}
            />
          )}
        </div>
      </div>

      <CreationDetailView
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        items={publicCreations.map(c => ({
          ...c,
          url: c.image_url,
          previewUrl: c.thumbnail_url || c.image_url,
          type: c.type || 'image',
          prompt: c.prompt,
          model: c.model,
          creator_avatar: c.creator_avatar,
          creator_username: c.creator_username,
          creator_slug: c.creator_slug,
          isOwner: false,
          parent_id: c.parent_id,
          parent_username: c.parent_username
        })) as GalleryItem[]}
        initialIndex={previewIndex}
        onDownload={(item) => handleDownload(item, userTier)}
        onReusePrompt={handleReusePrompt}
        onDelete={undefined}
        onTogglePublic={undefined}
      />
    </>
  );
}
