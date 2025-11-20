import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, CreditCard, Tag, Package, DollarSign } from "lucide-react";

export default function SuperAdminBilling() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Billing & Pricing</h1>
                <p className="text-zinc-400">Manage plans, token packages, coupons, and view transaction logs.</p>
            </div>

            <Tabs defaultValue="plans" className="space-y-4">
                <TabsList className="bg-zinc-900 border border-white/10">
                    <TabsTrigger value="plans">Plans Manager</TabsTrigger>
                    <TabsTrigger value="packages">Token Packages</TabsTrigger>
                    <TabsTrigger value="coupons">Coupons</TabsTrigger>
                    <TabsTrigger value="logs">Stripe Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="plans" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Subscription Plans</h2>
                        <Button><Plus className="w-4 h-4 mr-2" /> Create Plan</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {['Spark', 'Vibe', 'Studio', 'EventPro', 'Masters'].map((plan) => (
                            <Card key={plan} className="bg-zinc-900/50 border-white/10">
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-center">
                                        {plan}
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>
                                    </CardTitle>
                                    <CardDescription>Monthly Subscription</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold mb-4">$29.00<span className="text-sm font-normal text-zinc-500">/mo</span></div>
                                    <ul className="space-y-2 text-sm text-zinc-400 mb-4">
                                        <li>• 1,000 Tokens included</li>
                                        <li>• 3 Active Events</li>
                                        <li>• Basic Support</li>
                                    </ul>
                                    <Button variant="outline" className="w-full border-white/10">Edit Plan</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="packages" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Token Packages</h2>
                        <Button><Plus className="w-4 h-4 mr-2" /> Add Package</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { tokens: '500', price: '$5' },
                            { tokens: '1,000', price: '$9' },
                            { tokens: '5,000', price: '$39' },
                            { tokens: '10,000', price: '$69' },
                        ].map((pkg, i) => (
                            <Card key={i} className="bg-zinc-900/50 border-white/10">
                                <CardContent className="pt-6 text-center">
                                    <Package className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
                                    <h3 className="font-bold text-lg">{pkg.tokens} Tokens</h3>
                                    <p className="text-2xl font-bold text-white my-2">{pkg.price}</p>
                                    <Button size="sm" variant="secondary" className="w-full mt-2">Edit</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="coupons" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Active Coupons</h2>
                        <Button><Plus className="w-4 h-4 mr-2" /> Create Coupon</Button>
                    </div>
                    <Card className="bg-zinc-900/50 border-white/10">
                        <CardContent className="p-0">
                            <div className="p-4 grid grid-cols-5 gap-4 text-sm font-medium text-zinc-400 border-b border-white/10">
                                <div>Code</div>
                                <div>Discount</div>
                                <div>Uses</div>
                                <div>Expiry</div>
                                <div className="text-right">Status</div>
                            </div>
                            {[
                                { code: 'WELCOME20', discount: '20% OFF', uses: '45/100', expiry: '2023-12-31', status: 'Active' },
                                { code: 'BLACKFRIDAY', discount: '50% OFF', uses: '120/500', expiry: '2023-11-30', status: 'Scheduled' },
                            ].map((coupon, i) => (
                                <div key={i} className="p-4 grid grid-cols-5 gap-4 text-sm items-center border-b border-white/5 last:border-0">
                                    <div className="font-mono text-white bg-white/5 px-2 py-1 rounded w-fit">{coupon.code}</div>
                                    <div className="text-emerald-400">{coupon.discount}</div>
                                    <div className="text-zinc-300">{coupon.uses}</div>
                                    <div className="text-zinc-500">{coupon.expiry}</div>
                                    <div className="text-right">
                                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">{coupon.status}</Badge>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="logs" className="space-y-4">
                    <h2 className="text-xl font-semibold">Recent Transactions</h2>
                    <Card className="bg-zinc-900/50 border-white/10">
                        <CardContent className="p-0">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="p-4 flex items-center justify-between border-b border-white/5 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-400">
                                            <DollarSign className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">Payment from user@example.com</p>
                                            <p className="text-xs text-zinc-500">Invoice #INV-2023-00{i}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white">+$29.00</p>
                                        <p className="text-xs text-zinc-500">Just now</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
