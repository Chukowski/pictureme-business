import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Wallet,
    ArrowDownToLine,
    Clock,
    CheckCircle,
    Loader2,
    TrendingUp,
    Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { ENV } from "@/config/env";
import { getTokenStats, TokenStats } from "@/services/billingApi";

interface CreatorBalance {
    user_id: string;
    available_balance: number;
    pending_balance: number;
    total_paid_out: number;
}

interface LedgerEntry {
    id: number;
    user_id: string;
    amount_usd: number;
    source: string;
    booth_id?: string;
    event_id?: string;
    status: string;
    created_at: string;
}

export default function CreatorEarningsCard() {
    const [balance, setBalance] = useState<CreatorBalance | null>(null);
    const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
    const [history, setHistory] = useState<LedgerEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showPayoutDialog, setShowPayoutDialog] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState("");
    const [isRequesting, setIsRequesting] = useState(false);

    useEffect(() => {
        fetchBalance();
        fetchHistory();
        fetchTokenStats();
    }, []);

    const fetchTokenStats = async () => {
        try {
            const stats = await getTokenStats();
            setTokenStats(stats);
        } catch (error) {
            console.error("Failed to fetch token stats:", error);
        }
    };

    const fetchBalance = async () => {
        try {
            const token = localStorage.getItem("auth_token");
            const res = await fetch(`${ENV.API_URL}/api/ledger/balance`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setBalance(await res.json());
            }
        } catch (error) {
            console.error("Failed to fetch balance:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem("auth_token");
            const res = await fetch(`${ENV.API_URL}/api/ledger/history?limit=10`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data.entries || []);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        }
    };

    const handleRequestPayout = async () => {
        const amount = parseFloat(payoutAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error("Enter a valid amount");
            return;
        }
        if (amount < 25) {
            toast.error("Minimum payout is $25");
            return;
        }
        if (balance && amount > balance.available_balance) {
            toast.error("Amount exceeds available balance");
            return;
        }

        setIsRequesting(true);
        try {
            const token = localStorage.getItem("auth_token");
            const res = await fetch(`${ENV.API_URL}/api/ledger/payout`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ amount }),
            });

            if (res.ok) {
                toast.success("Payout request submitted!");
                setShowPayoutDialog(false);
                setPayoutAmount("");
                fetchBalance();
                fetchHistory();
            } else {
                const err = await res.json();
                toast.error(err.error || "Payout request failed");
            }
        } catch (error) {
            toast.error("Failed to request payout");
        } finally {
            setIsRequesting(false);
        }
    };

    const getSourceLabel = (source: string) => {
        switch (source) {
            case "booth_tokens":
                return "Booth (Tokens)";
            case "booth_cash":
                return "Booth (Cash)";
            case "payout":
                return "Payout";
            default:
                return source;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "cleared":
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Cleared
                    </Badge>
                );
            case "pending":
                return (
                    <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                    </Badge>
                );
            case "paid":
                return (
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                        <ArrowDownToLine className="w-3 h-3 mr-1" />
                        Paid
                    </Badge>
                );
            default:
                return <Badge>{status}</Badge>;
        }
    };

    if (isLoading) {
        return (
            <Card className="bg-card/50 border-white/10">
                <CardContent className="flex items-center justify-center h-48">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border-emerald-500/20">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <Wallet className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Creator Earnings</CardTitle>
                                <CardDescription className="text-zinc-400">
                                    Your booth sales earnings
                                </CardDescription>
                            </div>
                        </div>
                        {balance && balance.available_balance >= 25 && (
                            <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => setShowPayoutDialog(true)}
                            >
                                <ArrowDownToLine className="w-4 h-4 mr-1" />
                                Request Payout
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Balance Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 rounded-lg bg-card/50 border border-white/5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Available USD</p>
                            <p className="text-2xl font-bold text-emerald-400">
                                ${balance?.available_balance?.toFixed(2) || "0.00"}
                            </p>
                        </div>
                        <div className="p-4 rounded-lg bg-card/50 border border-white/5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Pending USD</p>
                            <p className="text-2xl font-bold text-yellow-400">
                                ${balance?.pending_balance?.toFixed(2) || "0.00"}
                            </p>
                        </div>
                        <div className="p-4 rounded-lg bg-card/50 border border-white/5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Tokens Earned</p>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-[#D1F349]" />
                                <p className="text-2xl font-bold text-[#D1F349]">
                                    {tokenStats?.tokens_earned || 0}
                                </p>
                            </div>
                        </div>
                        <div className="p-4 rounded-lg bg-card/50 border border-white/5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Total Paid Out</p>
                            <p className="text-2xl font-bold text-zinc-300">
                                ${balance?.total_paid_out?.toFixed(2) || "0.00"}
                            </p>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                        <div className="flex items-start gap-2">
                            <TrendingUp className="w-4 h-4 text-zinc-400 mt-0.5" />
                            <div className="text-sm text-zinc-400">
                                <p>
                                    Earnings from booth sales are credited to your account.
                                    Pending earnings clear after 7 days. Minimum payout is $25.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    {history.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-zinc-300">Recent Activity</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {history.slice(0, 5).map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30"
                                    >
                                        <div>
                                            <p className="text-sm text-white">
                                                {getSourceLabel(entry.source)}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {new Date(entry.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`text-sm font-mono ${entry.amount_usd < 0 ? "text-red-400" : "text-emerald-400"
                                                    }`}
                                            >
                                                {entry.amount_usd < 0 ? "-" : "+"}$
                                                {Math.abs(entry.amount_usd).toFixed(2)}
                                            </span>
                                            {getStatusBadge(entry.status)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Payout Dialog */}
            <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
                <DialogContent className="bg-card border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white">Request Payout</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Enter the amount you'd like to withdraw. Minimum is $25.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Amount (USD)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                                    $
                                </span>
                                <Input
                                    type="number"
                                    min="25"
                                    max={balance?.available_balance || 0}
                                    step="0.01"
                                    value={payoutAmount}
                                    onChange={(e) => setPayoutAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="pl-7 bg-zinc-800 border-zinc-700 text-white"
                                />
                            </div>
                            <p className="text-xs text-zinc-500">
                                Available: ${balance?.available_balance?.toFixed(2) || "0.00"}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowPayoutDialog(false)}
                            className="border-zinc-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRequestPayout}
                            disabled={isRequesting}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isRequesting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                "Request Payout"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
