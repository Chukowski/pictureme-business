import { useState } from "react";
import { User } from "@/services/eventsApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Camera, Image as ImageIcon, CreditCard, HelpCircle, Zap, Plus, Palette } from "lucide-react";
import StudioTab from "./StudioTab";

interface IndividualDashboardProps {
    currentUser: User;
}

export default function IndividualDashboard({ currentUser }: IndividualDashboardProps) {
    const [activeTab, setActiveTab] = useState("overview");

    return (
        <div className="space-y-8">
            {/* Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
                <TabsList className="inline-flex h-auto p-1 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-x-auto max-w-full">
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
                        <ImageIcon className="w-4 h-4" />
                        <span>Templates</span>
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

                {/* Create Tab */}
                <TabsContent value="create" className="space-y-6 focus-visible:outline-none">
                    <StudioTab />
                </TabsContent>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6 focus-visible:outline-none">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
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

                        <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Photos This Month</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-white">45</div>
                                <p className="text-xs text-emerald-400 mt-1">+12% from last month</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
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
                        <Button variant="outline" className="h-auto py-4 border-white/10 bg-zinc-900/30 hover:bg-zinc-800 hover:text-white justify-start">
                            <div className="p-2 rounded-lg bg-indigo-500/10 mr-4">
                                <Camera className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-white">Open My Booth</div>
                                <div className="text-xs text-zinc-500">Launch your personal photo booth</div>
                            </div>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 border-white/10 bg-zinc-900/30 hover:bg-zinc-800 hover:text-white justify-start">
                            <div className="p-2 rounded-lg bg-purple-500/10 mr-4">
                                <ImageIcon className="w-6 h-6 text-purple-400" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-white">Manage Templates</div>
                                <div className="text-xs text-zinc-500">Browse and configure styles</div>
                            </div>
                        </Button>
                    </div>
                </TabsContent>

                {/* My Booth Tab */}
                <TabsContent value="my-booth" className="focus-visible:outline-none">
                    <div className="text-center py-12 bg-zinc-900/30 rounded-3xl border border-white/5 border-dashed">
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

                {/* Templates Tab */}
                <TabsContent value="templates" className="focus-visible:outline-none">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-white">My Templates</h3>
                        <Button variant="outline" className="border-white/10 text-white hover:bg-white/10">
                            <Plus className="w-4 h-4 mr-2" /> Create New
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="bg-zinc-900/50 border-white/10 overflow-hidden">
                                <div className="aspect-video bg-zinc-800 w-full" />
                                <CardContent className="p-4">
                                    <h4 className="font-semibold text-white">Template {i}</h4>
                                    <div className="flex items-center justify-between mt-4">
                                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">Edit</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Billing Tab */}
                <TabsContent value="billing" className="focus-visible:outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card className="bg-zinc-900/50 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white">Current Plan</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">Spark</h3>
                                        <p className="text-zinc-400">Individual Plan</p>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-sm font-medium">
                                        Active
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-400">Monthly Tokens</span>
                                        <span className="text-white">200</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-400">Price</span>
                                        <span className="text-white">$9.99/mo</span>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <Button className="flex-1 bg-white text-black hover:bg-zinc-200">Upgrade Plan</Button>
                                    <Button variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/5">Manage Subscription</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
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
