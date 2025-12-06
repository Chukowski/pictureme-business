import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CreditCard,
  Download,
  Check,
  Crown,
  Zap,
  Building2,
  Loader2,
  Plus,
  Trash2,
  FileText,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  Link2,
  ExternalLink
} from "lucide-react";
import { User } from "@/services/eventsApi";
import { ENV } from "@/config/env";
import { toast } from "sonner";

interface BillingTabProps {
  currentUser: User;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  tokens_monthly: number;
  max_events: number;
  features: string[];
  current?: boolean;
  isCustom?: boolean; // For Masters plan - shows "Contact Sales"
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  pdf_url?: string;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

interface StripeConnectStatus {
  connected: boolean;
  account_id?: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  onboarding_url?: string;
}

// ========== INDIVIDUAL PLANS ==========
const INDIVIDUAL_PLANS: Plan[] = [
  {
    id: 'spark',
    name: 'Spark',
    price: 9,
    interval: 'month',
    tokens_monthly: 50,
    max_events: 0,
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
    max_events: 0,
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
    max_events: 0,
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

// ========== BUSINESS PLANS ==========
const BUSINESS_PLANS: Plan[] = [
  {
    id: 'event_starter',
    name: 'Event Starter',
    price: 400,
    interval: 'month',
    tokens_monthly: 1000,
    max_events: 1,
    features: [
      '1,000 tokens/month',
      '1 active event',
      'Basic analytics',
      'BYOH (Bring Your Own Hardware)',
      'Email support'
    ]
  },
  {
    id: 'event_pro',
    name: 'Event Pro',
    price: 1500,
    interval: 'month',
    tokens_monthly: 5000,
    max_events: 2,
    features: [
      '5,000 tokens/month',
      'Up to 2 active events',
      'Advanced analytics',
      'BYOH (Bring Your Own Hardware)',
      'Lead capture & branded feeds',
      'Priority support'
    ]
  },
  {
    id: 'masters',
    name: 'Masters',
    price: 3000,
    interval: 'month',
    tokens_monthly: 8000,
    max_events: 3,
    features: [
      '8,000 tokens/month',
      'Up to 3 active events',
      'Premium templates & LoRA models',
      'Revenue-share & Stripe Connect',
      'Print module & POS',
      'Dedicated account manager'
    ],
    isCustom: true
  }
];

// For backward compatibility
const PLANS = BUSINESS_PLANS;

// Note for UI
const PLAN_NOTE = "Tokens are shared across your active events. When tokens run out, you can top up with extra packs.";

// Map user role/subscription_tier to plan IDs (normalized to lowercase, no spaces)
const ROLE_TO_PLAN_MAP: Record<string, string> = {
  // Business plans
  'business_starter': 'event_starter',
  'businessstarter': 'event_starter',
  'business starter': 'event_starter',
  'event_starter': 'event_starter',
  'eventstarter': 'event_starter',
  
  'business_eventpro': 'event_pro',
  'businesseventpro': 'event_pro',
  'business eventpro': 'event_pro',
  'event_pro': 'event_pro',
  'eventpro': 'event_pro',
  
  'business_masters': 'masters',
  'businessmasters': 'masters',
  'business masters': 'masters',
  'masters': 'masters',
  
  // Individual plans
  'spark': 'spark',
  'vibe': 'vibe',
  'studio': 'studio',
  'individual': 'spark', // Default individual
  
  // Free/default
  'free': 'event_starter',
};

// Helper to normalize role string for lookup
const normalizeRole = (role: string): string => {
  return role.toLowerCase().replace(/[_\s]+/g, ' ').trim();
};

export default function BillingTab({ currentUser }: BillingTabProps) {
  // Helper to get plan from user role
  const getPlanFromUserRole = (): Plan | null => {
    const userRole = currentUser?.role || currentUser?.subscription_tier || '';
    const normalizedRole = normalizeRole(userRole);
    
    // Try exact match first, then normalized
    let planId = ROLE_TO_PLAN_MAP[userRole] || ROLE_TO_PLAN_MAP[normalizedRole];
    
    // If still no match, try partial matching for common patterns
    if (!planId) {
      if (normalizedRole.includes('masters')) {
        planId = 'masters';
      } else if (normalizedRole.includes('pro') || normalizedRole.includes('eventpro')) {
        planId = 'event_pro';
      } else if (normalizedRole.includes('starter')) {
        planId = 'event_starter';
      } else if (normalizedRole.includes('studio')) {
        planId = 'studio';
      } else if (normalizedRole.includes('vibe')) {
        planId = 'vibe';
      } else if (normalizedRole.includes('spark')) {
        planId = 'spark';
      } else {
        planId = 'event_starter'; // Default fallback
      }
    }
    
    console.log('🔍 getPlanFromUserRole:', { userRole, normalizedRole, planId });
    
    const allPlans = [...BUSINESS_PLANS, ...INDIVIDUAL_PLANS];
    const matchedPlan = allPlans.find(p => p.id === planId);
    return matchedPlan ? { ...matchedPlan, current: true } : null;
  };
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showPlansDialog, setShowPlansDialog] = useState(false);
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [planType, setPlanType] = useState<'individual' | 'business'>('business');
  
  // Determine if user is on a business plan (has events, etc.)
  const isBusinessUser = currentUser?.role?.includes('business') || 
                         currentUser?.subscription_tier?.includes('event') ||
                         currentUser?.subscription_tier?.includes('masters');

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("auth_token");
      const headers = { Authorization: `Bearer ${token}` };

      const [invoicesRes, methodsRes, planRes, connectRes] = await Promise.all([
        fetch(`${ENV.API_URL}/api/billing/invoices`, { headers }),
        fetch(`${ENV.API_URL}/api/billing/payment-methods`, { headers }),
        fetch(`${ENV.API_URL}/api/billing/current-plan`, { headers }),
        fetch(`${ENV.API_URL}/api/billing/connect/status`, { headers })
      ]);

      if (invoicesRes.ok) {
        setInvoices(await invoicesRes.json());
      }

      if (methodsRes.ok) {
        setPaymentMethods(await methodsRes.json());
      }

      if (planRes.ok) {
        const planData = await planRes.json();
        console.log('📋 Plan data from API:', planData);
        
        // Try to match from all plans (business + individual)
        const allPlans = [...BUSINESS_PLANS, ...INDIVIDUAL_PLANS];
        
        // Try multiple fields to find a match
        const planIdToMatch = planData.plan_id || planData.id || planData.name?.toLowerCase().replace(/\s+/g, '_');
        let matchedPlan = allPlans.find(p => p.id === planIdToMatch);
        
        // If no exact match, try normalized name matching
        if (!matchedPlan && planData.name) {
          const normalizedName = normalizeRole(planData.name);
          if (normalizedName.includes('masters')) {
            matchedPlan = allPlans.find(p => p.id === 'masters');
          } else if (normalizedName.includes('pro')) {
            matchedPlan = allPlans.find(p => p.id === 'event_pro');
          } else if (normalizedName.includes('starter')) {
            matchedPlan = allPlans.find(p => p.id === 'event_starter');
          }
        }
        
        // Determine role-based desired plan (fallback / override)
        const rolePlan = getPlanFromUserRole();

        let finalPlan = matchedPlan;

        // If API says starter/pro but role is masters, override to masters for display
        if (rolePlan && rolePlan.id === 'masters' && finalPlan && finalPlan.id !== 'masters') {
          finalPlan = rolePlan;
        }

        if (finalPlan) {
          setCurrentPlan({ ...finalPlan, current: true });
          setPlanType(INDIVIDUAL_PLANS.some(p => p.id === finalPlan!.id) ? 'individual' : 'business');
        } else if (rolePlan) {
          console.log('⚠️ No plan match from API, using role plan');
          setCurrentPlan(rolePlan);
        } else {
          console.log('⚠️ No plan match from API or role');
          setCurrentPlan(getPlanFromUserRole());
        }
      } else {
        // Default based on user role
        console.log('⚠️ Plan API failed, falling back to user role');
        setCurrentPlan(getPlanFromUserRole());
      }
      
      // Fetch Stripe Connect status
      if (connectRes.ok) {
        const connectData = await connectRes.json();
        setConnectStatus(connectData);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
      // Set default plan based on user role
      setCurrentPlan(getPlanFromUserRole());
    } finally {
      setIsLoading(false);
    }
  };

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
          fetchBillingData();
          setShowPlansDialog(false);
        }
      } else {
        toast.error("Failed to upgrade plan");
      }
    } catch (error) {
      toast.error("Upgrade failed. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${ENV.API_URL}/api/billing/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success("Subscription cancelled. You'll have access until the end of your billing period.");
        fetchBillingData();
      } else {
        toast.error("Failed to cancel subscription");
      }
    } catch (error) {
      toast.error("Cancellation failed. Please try again.");
    }
  };

  const handleAddPaymentMethod = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${ENV.API_URL}/api/billing/payment-methods`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        } else if (data.client_secret) {
          toast.info("Payment setup initiated. Please complete in Stripe.");
        } else {
          toast.error("Failed to start payment method setup");
        }
      } else {
        toast.error("Failed to set up payment method");
      }
    } catch (error) {
      toast.error("Setup failed. Please try again.");
    }
  };
  
  // Handle Stripe Connect onboarding
  const handleConnectStripe = async () => {
    setIsConnecting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${ENV.API_URL}/api/billing/connect/onboard`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.onboarding_url) {
          window.location.href = data.onboarding_url;
        }
      } else {
        const error = await response.json();
        if (response.status === 403) {
          toast.error("Stripe Connect is only available for Masters plan");
        } else {
          toast.error(error.error || "Failed to start Stripe Connect");
        }
      }
    } catch (error) {
      toast.error("Connection failed. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Handle Stripe Connect dashboard
  const handleOpenStripeDashboard = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${ENV.API_URL}/api/billing/connect/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.dashboard_url) {
          window.open(data.dashboard_url, '_blank');
        }
      } else {
        toast.error("Failed to open Stripe dashboard");
      }
    } catch (error) {
      toast.error("Failed to open dashboard");
    }
  };

  // Cancel Stripe Connect (clear connect ID)
  const handleCancelConnect = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${ENV.API_URL}/api/billing/connect`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success("Stripe Connect reset. You can restart onboarding.");
        await fetchBillingData();
      } else {
        const err = await response.json();
        toast.error(err.error || "Failed to reset Stripe Connect");
      }
    } catch (error) {
      toast.error("Failed to reset Stripe Connect");
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'event_starter': return <Zap className="w-5 h-5 text-blue-400" />;
      case 'event_pro': return <Building2 className="w-5 h-5 text-purple-400" />;
      case 'masters': return <Crown className="w-5 h-5 text-amber-400" />;
      default: return <CreditCard className="w-5 h-5 text-zinc-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card className="bg-zinc-900/50 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                {currentPlan && getPlanIcon(currentPlan.id)}
              </div>
              <div>
                <CardTitle className="text-white">
                  {currentPlan?.name || 'Free'} Plan
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Your current subscription status
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-zinc-400">Monthly Price</p>
              {currentPlan?.isCustom ? (
                <p className="text-xl font-bold text-amber-400">Custom Agreement</p>
              ) : (
                <p className="text-2xl font-bold text-white">
                  ${(currentPlan?.price || 0).toLocaleString()}<span className="text-sm text-zinc-400">/mo</span>
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-zinc-400">Tokens Included</p>
              <p className="text-2xl font-bold text-white">
                {(currentPlan?.tokens_monthly || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-zinc-400">Active Events Limit</p>
              <p className="text-2xl font-bold text-white">
                {currentPlan?.max_events || 0}
              </p>
            </div>
          </div>
          
          {/* Token sharing info */}
          <p className="text-xs text-zinc-500 mt-4">
            {PLAN_NOTE}
          </p>

          <div className="flex gap-3 mt-6">
            <Dialog open={showPlansDialog} onOpenChange={setShowPlansDialog}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Upgrade Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Choose Your Plan</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Select the plan that best fits your business needs
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {PLANS.map((plan) => (
                    <div
                      key={plan.id}
                      className={`relative p-6 rounded-xl border ${
                        plan.isCustom
                          ? 'border-amber-500/50 bg-gradient-to-br from-amber-900/20 to-orange-900/20'
                          : currentPlan?.id === plan.id
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-white/10 bg-zinc-800/50 hover:border-white/20'
                      }`}
                    >
                      {currentPlan?.id === plan.id && (
                        <Badge className="absolute -top-2 right-4 bg-indigo-600">
                          Current Plan
                        </Badge>
                      )}
                      {plan.isCustom && currentPlan?.id !== plan.id && (
                        <Badge className="absolute -top-2 right-4 bg-amber-500 text-black">
                          <Crown className="w-3 h-3 mr-1" />
                          Premium
                        </Badge>
                      )}
                      <div className="flex items-center gap-2 mb-4">
                        {getPlanIcon(plan.id)}
                        <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                      </div>
                      <div className="mb-4">
                        {plan.isCustom ? (
                          <>
                            <span className="text-2xl font-bold text-amber-400">Custom</span>
                            <p className="text-xs text-zinc-400 mt-1">From ${plan.price.toLocaleString()}/month</p>
                          </>
                        ) : (
                          <>
                            <span className="text-3xl font-bold text-white">${plan.price.toLocaleString()}</span>
                            <span className="text-zinc-400">/month</span>
                          </>
                        )}
                      </div>
                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      {plan.isCustom ? (
                        <Button
                          className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                          onClick={() => window.open('/apply', '_blank')}
                        >
                          Contact Sales
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          variant={currentPlan?.id === plan.id ? "outline" : "default"}
                          disabled={currentPlan?.id === plan.id || isUpgrading}
                          onClick={() => handleUpgrade(plan.id)}
                        >
                          {isUpgrading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : currentPlan?.id === plan.id ? (
                            'Current Plan'
                          ) : (
                            'Select Plan'
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Token sharing note */}
                <p className="text-xs text-zinc-500 text-center mt-4 px-4">
                  {PLAN_NOTE}
                </p>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10">
                  Cancel Subscription
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-zinc-900 border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Cancel Subscription?</AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400">
                    You'll lose access to premium features at the end of your current billing period.
                    Your tokens and data will be preserved.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-zinc-800 border-white/10 text-white">
                    Keep Subscription
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelSubscription}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Cancel Subscription
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <Card className="bg-zinc-900/50 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Methods
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Manage your payment options
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" className="border-white/10" onClick={handleAddPaymentMethod}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            {paymentMethods.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No payment methods added</p>
                <Button
                  variant="link"
                  className="text-indigo-400 mt-2"
                  onClick={handleAddPaymentMethod}
                >
                  Add your first card
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 rounded bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {method.brand.toUpperCase().slice(0, 4)}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-mono">•••• {method.last4}</p>
                        <p className="text-xs text-zinc-500">
                          Expires {method.exp_month}/{method.exp_year}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {method.is_default && (
                        <Badge variant="outline" className="border-emerald-500/20 text-emerald-400">
                          Default
                        </Badge>
                      )}
                      <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card className="bg-zinc-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoices
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Your billing history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No invoices yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-zinc-400">Date</TableHead>
                    <TableHead className="text-zinc-400">Amount</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="border-white/5">
                      <TableCell className="text-zinc-300">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-zinc-500" />
                          {new Date(invoice.date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-white font-mono">
                        ${invoice.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            invoice.status === 'paid'
                              ? 'border-emerald-500/20 text-emerald-400'
                              : invoice.status === 'pending'
                              ? 'border-yellow-500/20 text-yellow-400'
                              : 'border-red-500/20 text-red-400'
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invoice.pdf_url && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-zinc-400 hover:text-white"
                            asChild
                          >
                            <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stripe Connect Section (Business Users Only) */}
      {isBusinessUser && (
        <Card className="bg-zinc-900/50 border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <Link2 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-white">Stripe Connect</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Accept payments and enable revenue sharing
                  </CardDescription>
                </div>
              </div>
              {connectStatus?.connected && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  <Check className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {connectStatus?.connected ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-zinc-800/50">
                    <p className="text-sm text-zinc-400">Charges Enabled</p>
                    <p className="text-lg font-semibold text-white flex items-center gap-2">
                      {connectStatus.charges_enabled ? (
                        <><Check className="w-4 h-4 text-emerald-400" /> Yes</>
                      ) : (
                        <><AlertTriangle className="w-4 h-4 text-yellow-400" /> Pending</>
                      )}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-800/50">
                    <p className="text-sm text-zinc-400">Payouts Enabled</p>
                    <p className="text-lg font-semibold text-white flex items-center gap-2">
                      {connectStatus.payouts_enabled ? (
                        <><Check className="w-4 h-4 text-emerald-400" /> Yes</>
                      ) : (
                        <><AlertTriangle className="w-4 h-4 text-yellow-400" /> Pending</>
                      )}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  onClick={handleOpenStripeDashboard}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Stripe Dashboard
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Link2 className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Enable Revenue Sharing</h3>
                <p className="text-sm text-zinc-400 mb-4 max-w-md mx-auto">
                  Connect your Stripe account to accept payments from album sales and enable automatic revenue sharing.
                </p>
                {currentPlan?.id === 'masters' || currentPlan?.id === 'business_masters' ? (
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={handleConnectStripe}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4 mr-2" />
                    )}
                    Connect Stripe Account
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Badge variant="outline" className="border-amber-500/20 text-amber-400">
                      <Crown className="w-3 h-3 mr-1" />
                      Masters Plan Required
                    </Badge>
                    <p className="text-xs text-zinc-500">
                      Upgrade to Masters to enable Stripe Connect and revenue sharing
                    </p>
                  </div>
                )}
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    className="border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                    onClick={handleCancelConnect}
                  >
                    Cancel / Reset Stripe Connect
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
