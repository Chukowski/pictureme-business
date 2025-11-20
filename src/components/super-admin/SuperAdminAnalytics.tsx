import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, ImageIcon } from "lucide-react";

export default function SuperAdminAnalytics() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Global Analytics</h1>
                <p className="text-zinc-400">Deep dive into system performance and growth metrics.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-zinc-900/50 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                            Revenue Growth (YTD)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center text-zinc-500">
                        [Chart Placeholder: Revenue Line Chart]
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-pink-400" />
                            Photo Generations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center text-zinc-500">
                        [Chart Placeholder: Generations Bar Chart]
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-400" />
                            User Acquisition
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center text-zinc-500">
                        [Chart Placeholder: User Growth Area Chart]
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-purple-400" />
                            Token Consumption by Tier
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center text-zinc-500">
                        [Chart Placeholder: Pie Chart]
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
