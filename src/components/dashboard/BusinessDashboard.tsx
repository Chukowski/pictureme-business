import { useState } from "react";
import { User } from "@/services/eventsApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderKanban, BarChart3, Coins, CreditCard, ShoppingBag } from "lucide-react";
import AdminEventsTab from "@/components/admin/AdminEventsTab";
import AdminAnalyticsTab from "@/components/admin/AdminAnalyticsTab";

interface BusinessDashboardProps {
    currentUser: User;
}

export default function BusinessDashboard({ currentUser }: BusinessDashboardProps) {
    const [activeTab, setActiveTab] = useState("events");

    return (
        <div className="space-y-8">
            {/* Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
                <TabsList className="inline-flex h-auto p-1 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-x-auto max-w-full">
                    <TabsTrigger
                        value="events"
                        className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
                    >
                        <FolderKanban className="w-4 h-4" />
                        <span>Events</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="analytics"
                        className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
                    >
                        <BarChart3 className="w-4 h-4" />
                        <span>Analytics</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="tokens"
                        className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
                    >
                        <Coins className="w-4 h-4" />
                        <span>Tokens</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="billing"
                        className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
                    >
                        <CreditCard className="w-4 h-4" />
                        <span>Billing</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="marketplace"
                        className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Marketplace</span>
                    </TabsTrigger>
                </TabsList>

                {/* Events Tab */}
                <TabsContent value="events" className="mt-0 focus-visible:outline-none">
                    <AdminEventsTab currentUser={currentUser} />
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="mt-0 focus-visible:outline-none">
                    <AdminAnalyticsTab currentUser={currentUser} />
                </TabsContent>

                {/* Tokens Tab */}
                <TabsContent value="tokens" className="mt-0 focus-visible:outline-none">
                    <div className="flex items-center justify-center h-64 bg-zinc-900/30 rounded-3xl border border-white/5 border-dashed">
                        <div className="text-center">
                            <Coins className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Token Management</h3>
                            <p className="text-zinc-400">Coming soon: Purchase and track your token usage.</p>
                        </div>
                    </div>
                </TabsContent>

                {/* Billing Tab */}
                <TabsContent value="billing" className="mt-0 focus-visible:outline-none">
                    <div className="flex items-center justify-center h-64 bg-zinc-900/30 rounded-3xl border border-white/5 border-dashed">
                        <div className="text-center">
                            <CreditCard className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Billing & Subscription</h3>
                            <p className="text-zinc-400">Coming soon: Manage your plan and invoices.</p>
                        </div>
                    </div>
                </TabsContent>

                {/* Marketplace Tab */}
                <TabsContent value="marketplace" className="mt-0 focus-visible:outline-none">
                    <div className="flex items-center justify-center h-64 bg-zinc-900/30 rounded-3xl border border-white/5 border-dashed">
                        <div className="text-center">
                            <ShoppingBag className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Template Marketplace</h3>
                            <p className="text-zinc-400">Coming soon: Buy and sell premium templates.</p>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
