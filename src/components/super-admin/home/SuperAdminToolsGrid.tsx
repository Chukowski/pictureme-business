import { useNavigate } from "react-router-dom";
import {
    Users, FileText, Cpu, Calendar, ShoppingBag, Layers,
    CreditCard, Settings, BarChart3, Megaphone
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function SuperAdminToolsGrid() {
    const navigate = useNavigate();

    const tools = [
        {
            label: "Users",
            description: "Manage accounts",
            icon: Users,
            onClick: () => navigate("/super-admin/users"),
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "group-hover:border-blue-500/30",
        },
        {
            label: "Applications",
            description: "Review pending",
            icon: FileText,
            onClick: () => navigate("/super-admin/applications"),
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            border: "group-hover:border-amber-500/30",
        },
        {
            label: "AI Models",
            description: "Configure costs",
            icon: Cpu,
            onClick: () => navigate("/super-admin/models"),
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            border: "group-hover:border-purple-500/30",
        },
        {
            label: "Events",
            description: "Global events",
            icon: Calendar,
            onClick: () => navigate("/super-admin/events"),
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            border: "group-hover:border-emerald-500/30",
        },
        {
            label: "Marketplace",
            description: "Templates & Assets",
            icon: ShoppingBag,
            onClick: () => navigate("/super-admin/marketplace"),
            color: "text-pink-400",
            bg: "bg-pink-500/10",
            border: "group-hover:border-pink-500/30",
        },
        {
            label: "Tiers",
            description: "Subscription plans",
            icon: Layers,
            onClick: () => navigate("/super-admin/tiers"),
            color: "text-indigo-400",
            bg: "bg-indigo-500/10",
            border: "group-hover:border-indigo-500/30",
        },
        {
            label: "Billing",
            description: "Token packages",
            icon: CreditCard,
            onClick: () => navigate("/super-admin/billing"),
            color: "text-green-400",
            bg: "bg-green-500/10",
            border: "group-hover:border-green-500/30",
        },
        {
            label: "Analytics",
            description: "Platform stats",
            icon: BarChart3,
            onClick: () => navigate("/super-admin/analytics"),
            color: "text-cyan-400",
            bg: "bg-cyan-500/10",
            border: "group-hover:border-cyan-500/30",
        },
        {
            label: "Content",
            description: "Announcements",
            icon: Megaphone,
            onClick: () => navigate("/super-admin/content"),
            color: "text-orange-400",
            bg: "bg-orange-500/10",
            border: "group-hover:border-orange-500/30",
        },
        {
            label: "Settings",
            description: "System config",
            icon: Settings,
            onClick: () => navigate("/super-admin/settings"),
            color: "text-zinc-400",
            bg: "bg-zinc-500/10",
            border: "group-hover:border-zinc-500/30",
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {tools.map((tool, index) => (
                <Card
                    key={index}
                    className={`bg-card/40 border-white/5 transition-all duration-300 cursor-pointer group hover:bg-card hover:-translate-y-1 hover:shadow-lg ${tool.border}`}
                    onClick={tool.onClick}
                >
                    <CardContent className="p-4 flex flex-col items-center text-center h-full justify-center space-y-3">
                        <div className={`p-3 rounded-xl ${tool.bg} ${tool.color} mb-1 transition-transform group-hover:scale-110`}>
                            <tool.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-medium text-sm text-zinc-200 group-hover:text-white">{tool.label}</h3>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{tool.description}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
