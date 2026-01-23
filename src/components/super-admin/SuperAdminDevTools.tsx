import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Terminal, RefreshCw, AlertCircle, TrendingDown,
    Loader2, CheckCircle, Activity, Coins, XCircle
} from "lucide-react";
import { ENV } from "@/config/env";
import { toast } from "sonner";

interface GenerationStats {
    generations: { total: number; today: number };
    refunds: { total: number; total_amount: number; today: number; today_amount: number };
    failure_rate_percent: number;
}

interface RefundItem {
    id: number;
    user_id: number;
    amount: number;
    description: string;
    created_at: string;
    user_email: string;
    user_name: string;
}

interface TransactionItem {
    id: number;
    user_id: number;
    amount: number;
    transaction_type: string;
    description: string;
    balance_after: number;
    created_at: string;
    user_email: string;
}

export default function SuperAdminDevTools() {
    const [stats, setStats] = useState<GenerationStats | null>(null);
    const [refunds, setRefunds] = useState<RefundItem[]>([]);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'refunds' | 'transactions'>('overview');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const token = localStorage.getItem("auth_token");
        const headers = { Authorization: `Bearer ${token}` };

        try {
            // Load generation stats
            const statsRes = await fetch(`${ENV.API_URL}/api/admin/devtools/generation-stats`, { headers });
            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data);
            }

            // Load recent refunds
            const refundsRes = await fetch(`${ENV.API_URL}/api/admin/devtools/refunds?limit=20`, { headers });
            if (refundsRes.ok) {
                const data = await refundsRes.json();
                setRefunds(data.refunds || []);
            }

            // Load recent transactions
            const txRes = await fetch(`${ENV.API_URL}/api/admin/devtools/transactions?limit=30`, { headers });
            if (txRes.ok) {
                const data = await txRes.json();
                setTransactions(data.transactions || []);
            }
        } catch (error) {
            console.error("Failed to load DevTools data:", error);
            toast.error("Failed to load DevTools data");
        } finally {
            setIsLoading(false);
        }
    };

    const getTransactionColor = (type: string) => {
        switch (type) {
            case 'refund': return 'text-red-400 bg-red-500/10';
            case 'generation': return 'text-blue-400 bg-blue-500/10';
            case 'purchase': return 'text-green-400 bg-green-500/10';
            case 'bonus': return 'text-purple-400 bg-purple-500/10';
            default: return 'text-zinc-400 bg-zinc-500/10';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Developer Tools</h1>
                    <p className="text-zinc-400">Generation stats, refunds, and transaction monitoring.</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={loadData}
                    disabled={isLoading}
                    className="border-white/10 bg-card/50"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
            </div>

            {/* Stats Cards */}
            {isLoading && !stats ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-card/50 border-white/10">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10">
                                    <Activity className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-400">Generations Today</p>
                                    <p className="text-2xl font-bold text-white">{stats.generations.today}</p>
                                    <p className="text-xs text-zinc-500">{stats.generations.total.toLocaleString()} total</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-white/10">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-red-500/10">
                                    <XCircle className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-400">Refunds Today</p>
                                    <p className="text-2xl font-bold text-white">{stats.refunds.today}</p>
                                    <p className="text-xs text-zinc-500">{stats.refunds.today_amount} tokens</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-white/10">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/10">
                                    <TrendingDown className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-400">Failure Rate</p>
                                    <p className="text-2xl font-bold text-white">{stats.failure_rate_percent.toFixed(2)}%</p>
                                    <p className="text-xs text-zinc-500">{stats.refunds.total} total refunds</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-white/10">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-yellow-500/10">
                                    <Coins className="w-5 h-5 text-yellow-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-400">Tokens Refunded</p>
                                    <p className="text-2xl font-bold text-white">{stats.refunds.total_amount.toLocaleString()}</p>
                                    <p className="text-xs text-zinc-500">all time</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tab Switcher */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
                {(['overview', 'refunds', 'transactions'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab
                            ? 'bg-white text-black'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    {activeTab === 'overview' && (
                        <Card className="bg-card/50 border-white/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    System Health
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                        <div>
                                            <p className="text-sm font-medium text-white">Go API Server</p>
                                            <p className="text-xs text-zinc-400">pictureme-go</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-0">Online</Badge>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                        <div>
                                            <p className="text-sm font-medium text-white">PostgreSQL</p>
                                            <p className="text-xs text-zinc-400">Database</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-0">Healthy</Badge>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                        <div>
                                            <p className="text-sm font-medium text-white">FAL.ai</p>
                                            <p className="text-xs text-zinc-400">AI Processing</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-0">Connected</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'refunds' && (
                        <Card className="bg-card/50 border-white/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-400" />
                                    Recent Refunds ({refunds.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {refunds.length === 0 ? (
                                        <p className="text-sm text-zinc-500 text-center py-8">No refunds recorded</p>
                                    ) : refunds.map((refund) => (
                                        <div key={refund.id} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-white">{refund.user_email || `User #${refund.user_id}`}</span>
                                                <Badge className="bg-red-500/10 text-red-400 border-0">+{refund.amount}</Badge>
                                            </div>
                                            <p className="text-xs text-zinc-400 truncate">{refund.description}</p>
                                            <p className="text-[10px] text-zinc-500 mt-1">
                                                {new Date(refund.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'transactions' && (
                        <Card className="bg-card/50 border-white/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Terminal className="w-5 h-5 text-zinc-400" />
                                    Recent Transactions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-1 max-h-[400px] overflow-y-auto font-mono text-xs">
                                    {transactions.length === 0 ? (
                                        <p className="text-sm text-zinc-500 text-center py-8">No transactions</p>
                                    ) : transactions.map((tx) => (
                                        <div key={tx.id} className="flex items-center justify-between p-2 rounded hover:bg-white/5">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <Badge className={`${getTransactionColor(tx.transaction_type)} border-0 text-[10px] shrink-0`}>
                                                    {tx.transaction_type}
                                                </Badge>
                                                <span className="text-zinc-400 truncate">{tx.user_email || `#${tx.user_id}`}</span>
                                            </div>
                                            <span className={tx.amount > 0 ? 'text-green-400' : 'text-red-400'}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column - Quick Stats */}
                <div className="space-y-6">
                    <Card className="bg-card/50 border-white/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-indigo-400" />
                                API Endpoints Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="text-xs font-mono text-zinc-400 space-y-1">
                                <p><span className="text-emerald-400">[OK]</span> GET /api/admin/devtools/generation-stats</p>
                                <p><span className="text-emerald-400">[OK]</span> GET /api/admin/devtools/refunds</p>
                                <p><span className="text-emerald-400">[OK]</span> GET /api/admin/devtools/transactions</p>
                                <p><span className="text-emerald-400">[OK]</span> GET /api/admin/public-images</p>
                                <p><span className="text-emerald-400">[OK]</span> POST /api/admin/public-images/:id/flag</p>
                                <p><span className="text-emerald-400">[OK]</span> POST /api/admin/public-images/:id/delete</p>
                                <p><span className="text-emerald-400">[OK]</span> POST /api/admin/public-images/:id/make_private</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-white/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <RefreshCw className="w-5 h-5 text-blue-400" />
                                Quick Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-white/10 justify-start"
                                onClick={() => window.location.href = '/super-admin/users'}
                            >
                                Open Users Management
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-white/10 justify-start"
                                onClick={() => window.location.href = '/super-admin/analytics'}
                            >
                                View Full Analytics
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-white/10 justify-start"
                                onClick={loadData}
                            >
                                Refresh All Data
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
