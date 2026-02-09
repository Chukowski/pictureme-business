import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { getFeedUrl as getFeedImageUrl } from "@/services/cdn";
import { User } from "@/services/eventsApi";
import { CreatorHomeState, FeedCreation } from "@/pages/creator/dashboard/types";

export function DashboardHero({
    user,
    homeState,
    publicCreations,
    navigate
}: {
    user: User | null;
    homeState: CreatorHomeState;
    publicCreations: FeedCreation[];
    navigate: (path: string) => void
}) {
    return (
        <div className="flex flex-col gap-3 mt-4 md:mt-0">
            <div className="relative w-full aspect-[1.8/1] md:aspect-[5/1] rounded-3xl overflow-hidden group bg-[#080808] shadow-2xl shadow-black/50 border border-white/5">
                <div className="absolute inset-0 z-0 select-none pointer-events-none scale-105">
                    <div className="grid grid-cols-4 md:grid-cols-12 grid-rows-2 gap-2 w-full h-full opacity-60 p-2">
                        {publicCreations.length > 0 ? (
                            <>
                                {/* Hero Grid PATTERN (Higgs Style) */}
                                {/* Image 1: Top Left Big */}
                                {publicCreations[0] && (
                                    <div className="col-span-2 row-span-2 md:col-span-4 md:row-span-2 relative overflow-hidden rounded-2xl">
                                        <img src={getFeedImageUrl(publicCreations[0]?.image_url || '', 800)} alt="" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                {/* Image 2: Top Right Long */}
                                {publicCreations[1] && (
                                    <div className="col-span-2 row-span-1 md:col-span-5 md:row-span-1 relative overflow-hidden rounded-2xl">
                                        <img src={getFeedImageUrl(publicCreations[1]?.image_url || '', 800)} alt="" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                {/* Image 3: Center Bottom Block */}
                                {publicCreations[2] && (
                                    <div className="col-span-2 row-span-1 md:col-span-3 md:row-span-1 relative overflow-hidden rounded-2xl">
                                        <img src={getFeedImageUrl(publicCreations[2]?.image_url || '', 800)} alt="" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                {/* Image 4: Right Bento Tile */}
                                {publicCreations[3] && (
                                    <div className="hidden md:block md:col-span-3 md:row-span-2 relative overflow-hidden rounded-2xl">
                                        <img src={getFeedImageUrl(publicCreations[3]?.image_url || '', 800)} alt="" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                {/* Image 5: Remaining Bottom Bento */}
                                {publicCreations[4] && (
                                    <div className="hidden md:block md:col-span-3 md:row-span-1 relative overflow-hidden rounded-2xl">
                                        <img src={getFeedImageUrl(publicCreations[4]?.image_url || '', 800)} alt="" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </>
                        ) : (
                            // Curated "Visual Proof" Fallback (Bento Pattern)
                            <>
                                <div className="col-span-2 row-span-2 md:col-span-4 md:row-span-2 relative overflow-hidden rounded-2xl">
                                    <img src={getFeedImageUrl("https://images.unsplash.com/photo-1620641788421-7f6c368615b8?q=80&w=800&auto=format&fit=crop", 800)} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="col-span-2 row-span-1 md:col-span-5 md:row-span-1 relative overflow-hidden rounded-2xl">
                                    <img src={getFeedImageUrl("https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=800&auto=format&fit=crop", 800)} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="hidden md:block md:col-span-3 md:row-span-2 relative overflow-hidden rounded-2xl">
                                    <img src={getFeedImageUrl("https://images.unsplash.com/photo-1635322966219-b75ed3a93227?q=80&w=800&auto=format&fit=crop", 800)} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="col-span-2 row-span-1 md:col-span-3 md:row-span-1 relative overflow-hidden rounded-2xl">
                                    <img src={getFeedImageUrl("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop", 800)} alt="" className="w-full h-full object-cover" />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Gradient Overlays for Text Readability & Fade */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#080808] via-[#080808]/70 to-transparent z-0"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#080808]/20 via-transparent to-transparent z-0 md:hidden"></div>

                <div className="absolute w-full h-full z-10 flex flex-row items-center justify-between px-6 md:px-16 pt-2">
                    <div className="flex flex-col items-start text-left max-w-[65%] md:max-w-[70%]">
                        <h1 className="text-2xl md:text-5xl font-black text-white tracking-tighter mb-0.5 md:mb-1 drop-shadow-2xl leading-[1.1]">
                            Create iconic AI photos.
                        </h1>
                        <p className="text-[#AAAAAA] text-[10px] md:text-lg font-bold shadow-black drop-shadow-lg uppercase tracking-[0.15em]">
                            The world's most advanced AI marketplace.
                            {homeState === 'out_of_tokens' && <span className="block text-amber-400 mt-0.5 text-[8px] md:text-sm normal-case tracking-normal">Out of tokens. Upgrade to continue.</span>}
                        </p>
                    </div>

                    <Button
                        size="sm"
                        onClick={() => navigate(homeState === 'out_of_tokens' ? '/creator/settings?tab=billing' : '/creator/studio?view=create')}
                        className="
                          relative -top-1 md:top-0
                          rounded-full px-4 md:px-10 py-2.5 md:py-7 text-[11px] md:text-lg font-black uppercase tracking-widest
                          bg-[#D1F349] hover:bg-[#b9d941] text-black
                          shadow-[0_8px_25px_rgba(209,243,73,0.3)] hover:shadow-[0_12px_35px_rgba(209,243,73,0.4)]
                          hover:scale-105 active:scale-95 transition-all duration-300
                          border border-white/10 shrink-0 h-10 md:h-14
                      "
                    >
                        GO
                        <ChevronRight className="w-3 h-3 md:w-6 md:h-6 ml-1 md:ml-1 font-black" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
