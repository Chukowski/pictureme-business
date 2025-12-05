import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Coins,
  TrendingDown,
  TrendingUp,
  Calendar,
  ShoppingCart,
  History,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Loader2,
  CreditCard,
  BarChart3,
  Mail
} from "lucide-react";
import { User } from "@/services/eventsApi";
import { 
  getTokenStats, 
  getTokenTransactions, 
  getTokenPackages, 
  getUsageByEvent,
  getUsageByType,
  purchaseTokens,
  type TokenTransaction as ApiTokenTransaction,
  type TokenPackage as ApiTokenPackage,
  type UsageByType
} from "@/services/billingApi";
import { getPlanFeatures } from "@/lib/planFeatures";
import { toast } from "sonner";

interface TokensTabProps {
  currentUser: User;
}

interface TokenTransaction {
  id: number;
  date: string;
  description: string;
  event_name?: string;
  amount: number;
  type: 'generation' | 'purchase' | 'marketplace' | 'bonus' | 'refund';
  balance_after: number;
}

interface TokenPackage {
  id: number;
  name: string;
  description?: string;
  tokens: number;
  price_usd: number;
  popular?: boolean;
  validity_days?: number;
  is_enterprise?: boolean;
  plan_type?: string;
}

interface EventTokenUsage {
  event_id: string;
  event_name: string;
  tokens_used: number;
  last_used: string;
}

export default function TokensTab({ currentUser }: TokensTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [eventUsage, setEventUsage] = useState<EventTokenUsage[]>([]);
  const [usageByType, setUsageByType] = useState<UsageByType[]>([]);
  
  // Get plan tokens from user's role
  const userRole = (currentUser?.role || 'individual') as 'individual' | 'business_starter' | 'business_eventpro' | 'business_masters' | 'superadmin';
  const planFeatures = getPlanFeatures(userRole);
  const planTokens = planFeatures.tokensMonthly;
  
  const [stats, setStats] = useState({
    current_tokens: 0,
    tokens_used_month: 0,
    avg_daily_usage: 0,
    forecast_days: 0,
    plan_tokens: planTokens
  });
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showLedger, setShowLedger] = useState(false);

  useEffect(() => {
    fetchTokenData();
  }, []);

  const fetchTokenData = async () => {
    try {
      setIsLoading(true);

      // Fetch all token data using billingApi service
      const [statsData, transactionsData, packagesData, usageData, usageTypeData] = await Promise.all([
        getTokenStats().catch(() => null),
        getTokenTransactions(20).catch(() => []),
        getTokenPackages().catch(() => []),
        getUsageByEvent().catch(() => []),
        getUsageByType().catch(() => [])
      ]);

      if (statsData) {
        setStats({
          ...statsData,
          plan_tokens: statsData.plan_tokens || planTokens
        });
      } else {
        // Fallback to user data
        setStats({
          current_tokens: currentUser.tokens_remaining || 0,
          tokens_used_month: 0,
          avg_daily_usage: 0,
          forecast_days: 0,
          plan_tokens: planTokens
        });
      }

      setTransactions(transactionsData as TokenTransaction[]);

      if (packagesData.length > 0) {
        setPackages(packagesData);
      } else {
        // Default packages
        setPackages([
          { id: 1, name: "Starter", tokens: 1000, price_usd: 9.99 },
          { id: 2, name: "Pro", tokens: 5000, price_usd: 39.99, popular: true },
          { id: 3, name: "Business", tokens: 15000, price_usd: 99.99 },
          { id: 4, name: "Enterprise", tokens: 50000, price_usd: 299.99 }
        ]);
      }

      setEventUsage(usageData);
      setUsageByType(usageTypeData);
    } catch (error) {
      console.error("Error fetching token data:", error);
      // Use fallback data
      setStats({
        current_tokens: currentUser.tokens_remaining || 0,
        tokens_used_month: 0,
        avg_daily_usage: 0,
        forecast_days: 0,
        plan_tokens: planTokens
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (pkg: TokenPackage) => {
    setIsPurchasing(true);
    try {
      const data = await purchaseTokens(pkg.id);
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.success(`Purchased ${pkg.tokens.toLocaleString()} tokens!`);
        fetchTokenData();
      }
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error("Purchase failed. Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
      case 'generation': return <ArrowDownRight className="w-4 h-4 text-red-400" />;
      case 'marketplace': return <ShoppingCart className="w-4 h-4 text-purple-400" />;
      case 'bonus': return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'refund': return <ArrowUpRight className="w-4 h-4 text-blue-400" />;
      default: return <Coins className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    const styles: Record<string, string> = {
      purchase: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      generation: 'bg-red-500/10 text-red-400 border-red-500/20',
      marketplace: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      bonus: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      refund: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    };
    return styles[type] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  };

  // Helper to safely format dates
  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const tokenPercentage = stats.plan_tokens > 0 ? Math.min(100, (stats.current_tokens / stats.plan_tokens) * 100) : 0;
  const isLowTokens = stats.current_tokens < 100;

  return (
    <div className="space-y-6">
      {/* Low Token Warning */}
      {isLowTokens && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-400">Low Token Balance</p>
            <p className="text-xs text-amber-400/70">You have less than 100 tokens. Consider purchasing more to avoid interruptions.</p>
          </div>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">
            Buy Tokens
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Tokens */}
        <Card className="bg-zinc-900/50 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-400" />
              Current Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">
              {stats.current_tokens.toLocaleString()}
            </div>
            <Progress value={tokenPercentage} className="h-1.5 bg-zinc-800" />
            <p className="text-xs text-zinc-500 mt-2">of {stats.plan_tokens.toLocaleString()} capacity</p>
          </CardContent>
        </Card>

        {/* Used This Month */}
        <Card className="bg-zinc-900/50 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              Used This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.tokens_used_month.toLocaleString()}
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              ~{stats.avg_daily_usage.toFixed(0)} tokens/day avg
            </p>
          </CardContent>
        </Card>

        {/* Forecast */}
        <Card className="bg-zinc-900/50 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.forecast_days > 0 ? `${stats.forecast_days} days` : '∞'}
            </div>
            <p className="text-xs text-zinc-500 mt-2">at current usage rate</p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-zinc-900/50 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" size="sm">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Buy Tokens
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Purchase Token Package</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Choose a package that fits your needs
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`relative p-4 rounded-xl border transition-all ${
                        pkg.is_enterprise
                          ? 'border-amber-500/50 bg-amber-500/10'
                          : pkg.popular 
                            ? 'border-indigo-500/50 bg-indigo-500/10' 
                            : 'border-white/10 bg-zinc-800/50 hover:border-white/20'
                      }`}
                    >
                      {pkg.popular && !pkg.is_enterprise && (
                        <Badge className="absolute -top-2 right-4 bg-indigo-600">
                          Most Popular
                        </Badge>
                      )}
                      {pkg.is_enterprise && (
                        <Badge className="absolute -top-2 right-4 bg-amber-600">
                          Enterprise
                        </Badge>
                      )}
                      <h3 className="text-lg font-semibold text-white">{pkg.name}</h3>
                      
                      {pkg.is_enterprise ? (
                        <>
                          <div className="mt-2">
                            <span className="text-2xl font-bold text-amber-400">Custom Pricing</span>
                          </div>
                          <p className="text-sm text-zinc-400 mt-1">
                            Large-volume token packages
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            Valid for 60 days
                          </p>
                          <ul className="text-xs text-zinc-400 mt-3 space-y-1">
                            <li>• Requires application</li>
                            <li>• For multi-event operators</li>
                            <li>• Optional hardware + revenue-share</li>
                          </ul>
                          <Button
                            className="w-full mt-4 bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => window.open('/contact?type=enterprise', '_blank')}
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            Request Pricing
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="mt-2">
                            <span className="text-3xl font-bold text-white">
                              ${pkg.price_usd.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-400 mt-1">
                            {pkg.tokens.toLocaleString()} tokens
                          </p>
                          {pkg.validity_days && pkg.validity_days > 0 && (
                            <p className="text-xs text-zinc-500 mt-1">
                              Valid for {pkg.validity_days} days
                            </p>
                          )}
                          <Button
                            className={`w-full mt-4 ${pkg.popular ? '' : 'bg-zinc-700 text-white hover:bg-zinc-600 border-zinc-600'}`}
                            variant={pkg.popular ? "default" : "outline"}
                            onClick={() => handlePurchase(pkg)}
                            disabled={isPurchasing}
                          >
                            {isPurchasing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CreditCard className="w-4 h-4 mr-2" />
                                Purchase
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Button 
              variant="outline" 
              className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200" 
              size="sm"
              onClick={() => setShowLedger(true)}
            >
              <History className="w-4 h-4 mr-2" />
              View Ledger
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Usage by Type (Station) */}
      {usageByType.length > 0 && (
        <Card className="bg-zinc-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Usage by Generation Type
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Token consumption breakdown by station type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usageByType.filter(item => item?.generation_type).map((item, index) => {
                const totalUsage = usageByType.reduce((sum, u) => sum + (u?.tokens_used || 0), 0);
                const percentage = totalUsage > 0 ? ((item?.tokens_used || 0) / totalUsage) * 100 : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white capitalize">{(item.generation_type || 'unknown').replace(/_/g, ' ')}</span>
                      <span className="text-sm text-zinc-400">{(item.tokens_used || 0).toLocaleString()} tokens</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-zinc-500">{item.count || 0} generations ({percentage.toFixed(1)}%)</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage by Event */}
      {eventUsage.length > 0 && (
        <Card className="bg-zinc-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />
              Tokens Used by Event
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Track token consumption across your events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eventUsage.map((event) => (
                <div key={event.event_id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                  <div>
                    <p className="font-medium text-white">{event.event_name}</p>
                    <p className="text-xs text-zinc-500">Last used: {new Date(event.last_used).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg text-yellow-400">{event.tokens_used.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500">tokens used</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card className="bg-zinc-900/50 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <History className="w-5 h-5 text-zinc-400" />
              Recent Transactions
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Your latest token activity
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-zinc-400"
            onClick={() => setShowLedger(true)}
          >
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Coins className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-zinc-400">Date</TableHead>
                  <TableHead className="text-zinc-400">Description</TableHead>
                  <TableHead className="text-zinc-400">Event</TableHead>
                  <TableHead className="text-zinc-400 text-right">Amount</TableHead>
                  <TableHead className="text-zinc-400">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 5).map((tx) => (
                  <TableRow key={tx.id} className="border-white/5">
                    <TableCell className="text-zinc-300">
                      {formatDate(tx.date)}
                    </TableCell>
                    <TableCell className="text-white">{tx.description}</TableCell>
                    <TableCell className="text-zinc-400">{tx.event_name || '—'}</TableCell>
                    <TableCell className={`text-right font-mono ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTransactionBadge(tx.type)}>
                        {getTransactionIcon(tx.type)}
                        <span className="ml-1 capitalize">{tx.type}</span>
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Token Ledger Dialog */}
      <Dialog open={showLedger} onOpenChange={setShowLedger}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Token Ledger
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Complete history of your token transactions
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-zinc-400">Date</TableHead>
                <TableHead className="text-zinc-400">Description</TableHead>
                <TableHead className="text-zinc-400">Event</TableHead>
                <TableHead className="text-zinc-400 text-right">Δ Tokens</TableHead>
                <TableHead className="text-zinc-400 text-right">Balance</TableHead>
                <TableHead className="text-zinc-400">Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id} className="border-white/5">
                  <TableCell className="text-zinc-300">
                    {formatDate(tx.date)}
                  </TableCell>
                  <TableCell className="text-white">{tx.description}</TableCell>
                  <TableCell className="text-zinc-400">{tx.event_name || '—'}</TableCell>
                  <TableCell className={`text-right font-mono ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-zinc-300">
                    {tx.balance_after.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getTransactionBadge(tx.type)}>
                      {getTransactionIcon(tx.type)}
                      <span className="ml-1 capitalize">{tx.type}</span>
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}

