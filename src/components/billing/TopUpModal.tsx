import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/services/eventsApi";
import { Check, Crown, Zap, Building2, Loader2, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ENV } from "@/config/env";

interface TopUpModalProps {
    open: boolean;
    onClose: () => void;
}

// ========== TOKEN PACKS ==========
interface TokenPack {
    id: string;
    name: string;
    price: number;
    tokens: number;
    description: string;
    isPopular?: boolean;
}

const TOKEN_PACKS: TokenPack[] = [
    {
        id: 'pack_starter',
        name: 'Starter Pack',
        price: 4.99,
        tokens: 100,
        description: 'Perfect for trying out new styles and quick experiments.'
    },
    {
        id: 'pack_creative',
        name: 'Creative Pack',
        price: 19.99,
        tokens: 500,
        description: 'Best value for regular creators. Includes bonus tokens.',
        isPopular: true
    },
    {
        id: 'pack_pro',
        name: 'Pro Pack',
        price: 34.99,
        tokens: 1000,
        description: 'Maximum power for heavy usage and extensive projects.'
    }
];

export function TopUpModal({ open, onClose }: TopUpModalProps) {
    const user = getCurrentUser();
    const [isUpgrading, setIsUpgrading] = useState(false);

    if (!user) return null;

    // Determine current plan based on role/subscription
    // Default to 'spark' for individual users instead of 'event_starter'
    const role = (user.role || '').toLowerCase();
    const subscription = (user.subscription_tier || '').toLowerCase();

    let currentPlanId = 'spark'; // Default to Spark for individual interface

    // Only switch to business defaults if explicitly business role
    if (role.includes('business') || subscription.includes('event')) {
        currentPlanId = 'event_starter';
        if (subscription.includes('pro')) currentPlanId = 'event_pro';
        if (subscription.includes('master')) currentPlanId = 'masters';
    } else {
        // Individual logic
        if (subscription.includes('vibe')) currentPlanId = 'vibe';
        if (subscription.includes('studio')) currentPlanId = 'studio';
        // otherwise remain spark
    }

    const handlePurchase = async (packId: string) => {
        setIsUpgrading(true);
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${ENV.API_URL}/api/billing/topup`, { // Utilizing existing topup endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ pack_id: packId })
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
                toast.error("Failed to purchase tokens");
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {TOKEN_PACKS.map((pack) => {
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
                                        <span className="text-4xl font-bold text-white">${pack.price}</span>
                                    </div>
                                    <div className="mb-6 flex items-center gap-2 text-zinc-400">
                                        <span className="text-white font-semibold">{pack.tokens}</span> Tokens
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

function CreditCardIcon({ planId }: { planId: string }) {
    switch (planId) {
        case 'spark': return <Zap className="w-5 h-5" />;
        case 'vibe': return <Zap className="w-5 h-5" />; // Could differentiate
        case 'studio': return <Building2 className="w-5 h-5" />;
        default: return <Zap className="w-5 h-5" />;
    }
}
