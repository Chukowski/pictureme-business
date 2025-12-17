import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ENV } from "@/config/env";

interface TopUpModalProps {
    open: boolean;
    onClose: () => void;
}

// ========== TOKEN PACKS ==========
interface TokenPack {
    id: number;
    name: string;
    price: number;
    tokens: number;
    description: string;
    isPopular?: boolean;
}

// Hardcoded fallback defaults matching database
const DEFAULT_PACKS: TokenPack[] = [
    {
        id: 955,
        name: 'Starter Pack',
        price: 4.99,
        tokens: 100,
        description: 'Perfect for trying out new styles and quick experiments.'
    },
    {
        id: 953,
        name: 'Creative Pack',
        price: 19.99,
        tokens: 500,
        description: 'Best value for regular creators. Includes bonus tokens.',
        isPopular: true
    },
    {
        id: 954,
        name: 'Pro Pack',
        price: 34.99,
        tokens: 1000,
        description: 'Maximum power for heavy usage and extensive projects.'
    }
];

export function TopUpModal({ open, onClose }: TopUpModalProps) {
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [packs, setPacks] = useState<TokenPack[]>(DEFAULT_PACKS);

    // Fetch real packs from API when modal opens
    useEffect(() => {
        if (open) {
            fetchPacks();
        }
    }, [open]);

    const fetchPacks = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem("auth_token");
            // Force individual plan type for creator top-up
            const response = await fetch(`${ENV.API_URL}/api/tokens/packages?plan_type=individual`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    // Map API response to our format
                    const mappedPacks: TokenPack[] = data.map((pkg: {
                        id: number;
                        name: string;
                        price_usd?: number;
                        price?: number;
                        tokens: number;
                        description?: string;
                        is_popular?: boolean;
                        popular?: boolean;
                    }) => ({
                        id: pkg.id,
                        name: pkg.name,
                        price: pkg.price_usd || pkg.price || 0,
                        tokens: pkg.tokens || 0,
                        description: pkg.description || '',
                        isPopular: pkg.is_popular || pkg.popular || pkg.name.toLowerCase().includes('creative')
                    }));
                    setPacks(mappedPacks);
                }
            }
        } catch (error) {
            console.error("Failed to fetch token packs:", error);
            // Keep using defaults on error
        } finally {
            setIsLoading(false);
        }
    };

    const handlePurchase = async (packId: number) => {
        setIsUpgrading(true);
        try {
            const token = localStorage.getItem("auth_token");
            // Use the tokens/purchase endpoint with numeric package_id
            const response = await fetch(`${ENV.API_URL}/api/billing/tokens/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ package_id: packId })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.checkout_url) {
                    window.location.href = data.checkout_url;
                } else {
                    toast.success("Tokens added successfully!");
                    onClose();
                }
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "Failed to purchase tokens");
            }
        } catch (error) {
            console.error("Purchase exception:", error);
            toast.error("Purchase failed. Please try again.");
        } finally {
            setIsUpgrading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-5xl bg-zinc-950 border-white/10 text-white p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/10 bg-zinc-900/50">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Top Up Tokens</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Get more tokens to power your creative studio generations
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {packs.map((pack) => {
                                const isPopular = pack.isPopular;

                                return (
                                    <div
                                        key={pack.id}
                                        className={`relative p-6 rounded-2xl border transition-all duration-300 ${isPopular
                                            ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)]'
                                            : 'border-white/10 bg-zinc-900/50 hover:border-white/20 hover:bg-zinc-900'
                                            }`}
                                    >
                                        {isPopular && (
                                            <Badge className="absolute -top-3 right-4 bg-indigo-600 hover:bg-indigo-700 px-3 py-1 shadow-lg border border-white/10">
                                                Best Value
                                            </Badge>
                                        )}

                                        <div className="flex items-center gap-3 mb-5">
                                            <div className={`p-2 rounded-lg ${isPopular ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-zinc-400'}`}>
                                                <Zap className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white">{pack.name}</h3>
                                        </div>

                                        <div className="mb-2">
                                            <span className="text-4xl font-bold text-white">${pack.price.toFixed(2)}</span>
                                        </div>
                                        <div className="mb-6 flex items-center gap-2 text-zinc-400">
                                            <span className="text-white font-semibold">{pack.tokens.toLocaleString()}</span> Tokens
                                        </div>

                                        <Button
                                            className={`w-full mb-6 font-semibold h-11 ${isPopular
                                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                                : 'bg-[#D1F349] text-black hover:bg-[#b0cc3d]'
                                                }`}
                                            onClick={() => handlePurchase(pack.id)}
                                            disabled={isUpgrading}
                                        >
                                            {isUpgrading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                'Buy Pack'
                                            )}
                                        </Button>

                                        <p className="text-sm text-zinc-400 leading-relaxed">
                                            {pack.description}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-8 text-center bg-zinc-900/30 p-4 rounded-xl border border-white/5">
                        <p className="text-zinc-400 text-sm">
                            Need a monthly refill? <a href="/creator/billing" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">Upgrade your subscription plan</a> to get tokens automatically every month.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
