import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@/services/eventsApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Camera, Image as ImageIcon, CreditCard, HelpCircle, Zap, Plus, Palette } from "lucide-react";
import StudioTab from "./StudioTab";
import BillingTab from "./BillingTab";

interface IndividualDashboardProps {
    currentUser: User;
}

export default function IndividualDashboard({ currentUser }: IndividualDashboardProps) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("overview");

    return (
        <div className="h-full flex flex-col">
            {/* Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <div className="shrink-0 mb-6">
                    <TabsList className="inline-flex h-auto p-1 bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-x-auto max-w-full">
                        <TabsTrigger
                            value="overview"
                            className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>Overview</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="create"
                            className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
                        >
                            <Palette className="w-4 h-4" />
                            <span>Create</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="my-booth"
                            className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
                        >
                            <Camera className="w-4 h-4" />
                            <span>My Booth</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="templates"
                            className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
                        >
                            <Palette className="w-4 h-4" />
                            <span>My Styles</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="billing"
                            className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
                        >
                            <CreditCard className="w-4 h-4" />
                            <span>Billing</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="support"
                            className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
                        >
                            <HelpCircle className="w-4 h-4" />
                            <span>Support</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Create Tab - Full Height, No Scroll here (handled inside) */}
                <TabsContent value="create" className="flex-1 min-h-0 focus-visible:outline-none mt-0 data-[state=inactive]:hidden">
                    <StudioTab currentUser={currentUser} />
                </TabsContent>

                {/* Overview Tab - Scrollable */}
                <TabsContent value="overview" className="flex-1 min-h-0 overflow-y-auto focus-visible:outline-none mt-0 space-y-6 data-[state=inactive]:hidden">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Available Tokens</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-3xl font-bold text-white">120</span>
                                    <span className="text-sm text-zinc-500">/ 200</span>
                                </div>
                                <Button size="sm" className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white">
                                    <Zap className="w-3 h-3 mr-2" /> Buy More
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Photos This Month</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-white">45</div>
                                <p className="text-xs text-emerald-400 mt-1">+12% from last month</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Top Template</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-semibold text-white truncate">Neon Cyberpunk</div>
                                <p className="text-xs text-zinc-500 mt-1">Used 28 times</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Latest Photos */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Recent Photos</h3>
                            <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300">View All</Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="aspect-[2/3] rounded-lg bg-zinc-800/50 border border-white/5 animate-pulse" />
                            ))}
                        </div>
                    </div>

                    {/* Shortcuts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button variant="outline" className="h-auto py-4 border-white/10 bg-card/30 hover:bg-zinc-800 hover:text-white justify-start">
                            <div className="p-2 rounded-lg bg-indigo-500/10 mr-4">
                                <Camera className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-white">Open My Booth</div>
                                <div className="text-xs text-zinc-500">Launch your personal photo booth</div>
                            </div>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 border-white/10 bg-card/30 hover:bg-zinc-800 hover:text-white justify-start" onClick={() => navigate('/creator/templates')}>
                            <div className="p-2 rounded-lg bg-purple-500/10 mr-4">
                                <Palette className="w-6 h-6 text-purple-400" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-white">Manage Styles</div>
                                <div className="text-xs text-zinc-500">Browse and configure your drafts</div>
                            </div>
                        </Button>
                    </div>
                </TabsContent>

                {/* My Booth Tab */}
                <TabsContent value="my-booth" className="focus-visible:outline-none">
                    <div className="text-center py-12 bg-card/30 rounded-3xl border border-white/5 border-dashed">
                        <Camera className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">My Personal Booth</h3>
                        <p className="text-zinc-400 max-w-md mx-auto mb-6">
                            Configure your personal photo booth settings, scenes, and default templates here.
                        </p>
                        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
                            Launch Booth
                        </Button>
                    </div>
                </TabsContent>

                {/* My Styles Redirect */}
                <TabsContent value="templates" className="focus-visible:outline-none">
                    <div className="flex flex-col items-center justify-center py-20 bg-card/30 rounded-3xl border border-white/5 border-dashed">
                        <Palette className="w-12 h-12 text-zinc-600 mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">My Creative Styles</h3>
                        <p className="text-zinc-400 max-w-md mx-auto mb-6 text-center px-4">
                            Manage your custom AI templates, drafts, and marketplace submissions in the dedicated styles manager.
                        </p>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 h-12 rounded-2xl"
                            onClick={() => navigate('/creator/templates')}
                        >
                            Go to My Styles
                        </Button>
                    </div>
                </TabsContent>

                {/* Billing Tab */}
                <TabsContent value="billing" className="focus-visible:outline-none">
                    <BillingTab currentUser={currentUser} />
                </TabsContent>

                {/* Support Tab */}
                <TabsContent value="support" className="focus-visible:outline-none">
                    <div className="max-w-2xl mx-auto text-center py-12">
                        <HelpCircle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">Need Help?</h3>
                        <p className="text-zinc-400 mb-8">
                            Check our documentation or contact our support team for assistance.
                        </p>
                        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
                            Contact Support
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
