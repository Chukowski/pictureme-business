import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/services/eventsApi";
import { Check, Zap, Building2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ENV } from "@/config/env";

interface UpgradePlanModalProps {
    open: boolean;
    onClose: () => void;
}

interface Plan {
    id: string;
    name: string;
    price: number;
    interval: 'month' | 'year';
    tokens_monthly: number;
    features: string[];
    isCustom?: boolean;
}

// ========== INDIVIDUAL PLANS ==========
const INDIVIDUAL_PLANS: Plan[] = [
    {
        id: 'spark',
        name: 'Spark',
        price: 9,
        interval: 'month',
        tokens_monthly: 50,
        features: [
            '50 tokens/month',
            'Base Models (Nano)',
            'Standard Speed',
            'Personal License'
        ]
    },
    {
        id: 'vibe',
        name: 'Vibe',
        price: 19,
        interval: 'month',
        tokens_monthly: 100,
        features: [
            '100 tokens/month',
            'Everything in Spark',
            'Custom Backgrounds',
            'Priority Generation',
            'No Watermark',
            'Commercial License'
        ]
    },
    {
        id: 'studio',
        name: 'Studio',
        price: 39,
        interval: 'month',
        tokens_monthly: 200,
        features: [
            '200 tokens/month',
            'Everything in Vibe',
            'Faceswap Models',
            'Template Selling',
            'API Access',
            'Priority Support'
        ]
    }
];

export function UpgradePlanModal({ open, onClose }: UpgradePlanModalProps) {
    const user = getCurrentUser();
    const [isUpgrading, setIsUpgrading] = useState(false);

    if (!user) return null;

    // Determine current plan based on role/subscription
    const role = (user.role || '').toLowerCase();
    const subscription = (user.subscription_tier || '').toLowerCase();

    let currentPlanId = 'spark'; // Default to Spark

    // Only switch to business defaults if explicitly business role
    if (role.includes('business') || subscription.includes('event')) {
        currentPlanId = 'event_starter';
        if (subscription.includes('pro')) currentPlanId = 'event_pro';
        if (subscription.includes('master')) currentPlanId = 'masters';
    } else {
        // Individual logic
        if (subscription.includes('vibe')) currentPlanId = 'vibe';
        if (subscription.includes('studio')) currentPlanId = 'studio';
    }

    const handleUpgrade = async (planId: string) => {
        setIsUpgrading(true);
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${ENV.API_URL}/api/billing/upgrade`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ plan_id: planId })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.checkout_url) {
                    window.location.href = data.checkout_url;
                } else {
                    toast.success("Plan upgraded successfully!");
                    onClose();
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error(errorData.error || "Failed to upgrade plan");
            }
        } catch (error) {
            console.error("Upgrade exception:", error);
            toast.error("Upgrade failed. Please try again.");
        } finally {
            setIsUpgrading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-5xl bg-card border-white/10 text-white p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/10 bg-card/50">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Choose Your Plan</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Select the plan that best fits your creative needs
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {INDIVIDUAL_PLANS.map((plan) => {
                            const isCurrent = currentPlanId === plan.id;

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative p-6 rounded-2xl border transition-all duration-300 ${isCurrent
                                        ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)]'
                                        : 'border-white/10 bg-card/50 hover:border-white/20 hover:bg-card'
                                        }`}
                                >
                                    {isCurrent && (
                                        <Badge className="absolute -top-3 right-4 bg-indigo-600 hover:bg-indigo-700 px-3 py-1 shadow-lg border border-white/10">
                                            Current Plan
                                        </Badge>
                                    )}

                                    <div className="flex items-center gap-3 mb-5">
                                        <div className={`p-2 rounded-lg ${isCurrent ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-zinc-400'}`}>
                                            <CreditCardIcon planId={plan.id} />
                                        </div>
                                        <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                    </div>

                                    <div className="mb-6">
                                        <span className="text-4xl font-bold text-white">${plan.price}</span>
                                        <span className="text-zinc-500 font-medium">/month</span>
                                    </div>

                                    <Button
                                        className={`w-full mb-8 font-semibold h-11 ${isCurrent
                                            ? 'bg-zinc-800 text-zinc-400 cursor-default hover:bg-zinc-800'
                                            : 'bg-[#D1F349] text-black hover:bg-[#b0cc3d]'
                                            }`}
                                        onClick={() => !isCurrent && handleUpgrade(plan.id)}
                                        disabled={isCurrent || isUpgrading}
                                    >
                                        {isUpgrading && !isCurrent ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : isCurrent ? (
                                            'Current Plan'
                                        ) : (
                                            'Select Plan'
                                        )}
                                    </Button>

                                    <ul className="space-y-3">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                                                <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isCurrent ? 'text-indigo-400' : 'text-emerald-400'}`} />
                                                <span className="leading-5">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-zinc-500 text-sm">
                            Need more power? <a href="/apply" target="_blank" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">Explore Business Plans</a> for high-volume event capabilities.
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
        case 'vibe': return <Zap className="w-5 h-5" />;
        case 'studio': return <Building2 className="w-5 h-5" />;
        default: return <Zap className="w-5 h-5" />;
    }
}
