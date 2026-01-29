import { type MarketplaceTemplate } from "@/services/marketplaceApi";
import { cn } from "@/lib/utils";
import { Building2, User, Sparkles, Wand2, ShieldCheck, Heart, DollarSign } from "lucide-react";
import { LOCAL_IMAGE_MODELS, LOCAL_VIDEO_MODELS } from "@/services/aiProcessor";

interface TemplatePreviewProps {
    formData: Partial<MarketplaceTemplate>;
    currentStep: string;
}

export function TemplatePreview({ formData, currentStep }: TemplatePreviewProps) {
    const isBusiness = formData.template_type === 'business';
    const previewUrl = formData.preview_url || (formData.backgrounds && formData.backgrounds[0]);
    
    // Calculate GENERATION COST (what it costs to generate the image)
    const imageModelId = formData.pipeline_config?.imageModel || 'seedream-v4.5';
    const videoModelId = formData.pipeline_config?.videoModel;
    
    const imageModel = LOCAL_IMAGE_MODELS.find(m => m.shortId === imageModelId);
    const videoModel = videoModelId ? LOCAL_VIDEO_MODELS.find(m => m.shortId === videoModelId) : null;
    
    const imageCost = imageModel?.cost || 2;
    const videoCost = videoModel?.cost || 0;
    const faceswapCost = formData.pipeline_config?.faceswapEnabled ? 1 : 0;
    
    const generationCost = imageCost + videoCost + faceswapCost; // Cost to generate
    
    // SALE PRICE (what the creator charges users)
    // Only consider it a price if it's explicitly greater than 0
    const hasMoneyPrice = (formData.price ?? 0) > 0;
    const hasTokenPrice = (formData.tokens_cost ?? 0) > 0;
    const isFree = !hasMoneyPrice && !hasTokenPrice;

    return (
        <div className="flex flex-col h-full bg-[#101112] text-white">
            {/* Template Header / Banner Preview */}
            <div className="relative h-[250px] shrink-0 overflow-hidden group">
                {previewUrl ? (
                    <img 
                        src={previewUrl} 
                        alt="Template Preview" 
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-white/10" />
                    </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold truncate max-w-[200px]">
                                {formData.name || "Untitled Template"}
                            </h2>
                            {isBusiness ? (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] h-4">BUSINESS</Badge>
                            ) : (
                                <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-[9px] h-4">CREATOR</Badge>
                            )}
                        </div>
                        <p className="text-xs text-zinc-400 line-clamp-1 italic">
                            By You • {formData.category}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* SALE PRICE - What the creator charges */}
                        {hasMoneyPrice && (
                            <div className="flex items-center gap-1 bg-green-500/20 backdrop-blur-md px-2 py-1 rounded-full border border-green-500/30">
                                <DollarSign className="w-3 h-3 text-green-400" />
                                <span className="text-[10px] font-bold text-green-400">{formData.price?.toFixed(2)}</span>
                            </div>
                        )}
                        {hasTokenPrice && (
                            <div className="flex items-center gap-1.5 bg-purple-500/20 backdrop-blur-md px-2 py-1 rounded-full border border-purple-500/30">
                                <span className="text-[10px] font-bold text-purple-400">{formData.tokens_cost}</span>
                                <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                            </div>
                        )}
                        {isFree && (
                            <div className="flex items-center gap-1.5 bg-emerald-500/20 backdrop-blur-md px-2 py-1 rounded-full border border-emerald-500/30">
                                <span className="text-[10px] font-bold text-emerald-400">FREE</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-hide">
                {/* AI Pipeline Info */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles className="w-3 h-3" />
                            AI Pipeline
                        </h3>
                        <div className="text-[10px] text-indigo-400 font-mono">{imageModel?.name || formData.pipeline_config?.imageModel}</div>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                        <p className="text-[10px] text-zinc-400 leading-relaxed italic">
                            {formData.prompt || "No prompt defined yet..."}
                        </p>
                        {formData.pipeline_config?.faceswapEnabled && (
                            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                <span className="text-[9px] font-medium text-emerald-500/80">Face-Swap Protected</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Generation Cost (What it costs to generate) */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        Generation Cost
                    </h3>
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                        <p className="text-[9px] text-zinc-500 mb-2 italic">Cost to generate each image:</p>
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-zinc-400">Image Model:</span>
                            <span className="text-amber-400 font-bold">{imageCost} tokens</span>
                        </div>
                        {videoModel && (
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="text-zinc-400">Video Model:</span>
                                <span className="text-amber-400 font-bold">{videoCost} tokens</span>
                            </div>
                        )}
                        {formData.pipeline_config?.faceswapEnabled && (
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="text-zinc-400">Face-Swap:</span>
                                <span className="text-amber-400 font-bold">{faceswapCost} tokens</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-amber-500/20">
                            <span className="text-amber-500 font-bold">Total per generation:</span>
                            <span className="text-amber-500 font-black">~{generationCost} tokens</span>
                        </div>
                    </div>
                </div>

                {/* Sale Price (What the creator charges) */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <DollarSign className="w-3 h-3" />
                        Template Price
                    </h3>
                    {isFree && (
                        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
                            <span className="text-[11px] font-bold text-emerald-400">FREE FOR ALL USERS</span>
                        </div>
                    )}
                    {hasTokenPrice && (
                        <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 flex items-center justify-between">
                            <span className="text-[10px] text-purple-400 font-medium">Token Cost:</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[12px] font-bold text-purple-400">{formData.tokens_cost}</span>
                                <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                            </div>
                        </div>
                    )}
                    {hasMoneyPrice && (
                        <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 flex items-center justify-between">
                            <span className="text-[10px] text-green-400 font-medium">Purchase Price:</span>
                            <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-green-400" />
                                <span className="text-[12px] font-bold text-green-400">{formData.price?.toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Business Placeholders (The Core Request) */}
                {isBusiness && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <h3 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                            <Building2 className="w-3 h-3" />
                            Business Overlays
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                            <PlaceholderBox 
                                label="Header Logo" 
                                enabled={formData.business_config?.include_header} 
                                icon={ImageIcon}
                            />
                            <PlaceholderBox 
                                label="Event Branding" 
                                enabled={formData.business_config?.include_branding} 
                                icon={Building2}
                            />
                            <PlaceholderBox 
                                label="Custom Tagline" 
                                enabled={formData.business_config?.include_tagline} 
                                icon={Wand2}
                            />
                            <PlaceholderBox 
                                label="Watermark" 
                                enabled={formData.business_config?.include_watermark} 
                                icon={ShieldCheck}
                            />
                        </div>

                        {formData.business_config?.access_overrides?.leadCaptureRequired && (
                            <div className="p-3 rounded-lg border border-dashed border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
                                <div className="p-1.5 rounded bg-emerald-500/20 text-emerald-400">
                                    <User className="w-3 h-3" />
                                </div>
                                <span className="text-[9px] text-emerald-500/70 font-medium">Lead Capture Form Placeholder</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Individual/Creator Stats */}
                {!isBusiness && (
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Creator Engagement</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-zinc-500">
                                    <Heart className="w-3 h-3" />
                                    <span className="text-[9px]">Likes</span>
                                </div>
                                <span className="text-sm font-bold">0</span>
                            </div>
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-zinc-500">
                                    <Download className="w-3 h-3" />
                                    <span className="text-[9px]">Uses</span>
                                </div>
                                <span className="text-sm font-bold">0</span>
                            </div>
                        </div>
                        {formData.is_adult && (
                            <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-center">
                                <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">18+ Restricted</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Preview Footer */}
            <div className="p-6 border-t border-white/10 bg-black/20">
                <button className="w-full py-3 rounded-xl bg-indigo-600 font-bold text-xs shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-colors">
                    {isBusiness ? "Select for Business Event" : "Generate Now"}
                </button>
            </div>
        </div>
    );
}

function PlaceholderBox({ label, enabled, icon: Icon }: { label: string, enabled: boolean, icon: any }) {
    return (
        <div className={cn(
            "p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition-all",
            enabled 
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                : "bg-zinc-900/50 border-white/5 text-zinc-600 opacity-40 grayscale"
        )}>
            <Icon className="w-4 h-4" />
            <span className="text-[9px] font-medium leading-tight">{label}</span>
        </div>
    );
}

import { Image as ImageIcon, Download, Badge } from "lucide-react";
