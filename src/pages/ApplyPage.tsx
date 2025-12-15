import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Building2, ArrowRight, MapPin, Mail, Briefcase, CheckCircle2 } from "lucide-react";
import { ENV } from "@/config/env";

interface Tier {
    id: string;
    name: string;
    code: string;
    category: string;
}

export default function ApplyPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tier = searchParams.get("tier") || "event-pro";
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [tiers, setTiers] = useState<Tier[]>([]);

    useEffect(() => {
        const fetchTiers = async () => {
            try {
                const res = await fetch(`${ENV.API_URL || 'http://localhost:3002'}/api/tiers`);
                if (res.ok) {
                    const data = await res.json();
                    setTiers(data || []);
                }
            } catch (error) {
                console.error("Failed to fetch tiers", error);
            }
        };
        fetchTiers();
    }, []);

    const [formData, setFormData] = useState({
        fullName: "",
        companyName: "",
        email: "",
        location: "",
        eventVolume: "",
        hasHardware: "no",
        hardwareDetails: "",
        eventTypes: [] as string[],
        tierInterest: tier,
    });

    const eventTypesList = [
        "Corporate",
        "Mall / Retail",
        "Weddings",
        "Private Parties",
        "Festivals",
        "Other",
    ];

    const handleEventTypeChange = (type: string) => {
        setFormData((prev) => {
            if (prev.eventTypes.includes(type)) {
                return { ...prev, eventTypes: prev.eventTypes.filter((t) => t !== type) };
            } else {
                return { ...prev, eventTypes: [...prev.eventTypes, type] };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(`${ENV.API_URL}/api/applications`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to submit application');
            }

            setIsLoading(false);
            setIsSubmitted(true);
            toast.success("Application received!");
        } catch (error) {
            console.error("Submission error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to submit application. Please try again.");
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-900/20 rounded-full blur-[100px] -z-10" />

                <div className="max-w-md w-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl animate-fade-in">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Application Received</h2>
                    <p className="text-zinc-400 mb-8">
                        Thank you for your interest in our Business tiers. Our team will review your application and get back to you shortly at <span className="text-white font-medium">{formData.email}</span>.
                    </p>
                    <Button
                        onClick={() => navigate("/")}
                        className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-semibold rounded-xl"
                    >
                        Return to Home
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-black/0 to-black/0 -z-10" />
            <div className="fixed bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-purple-900/20 via-black/0 to-black/0 -z-10" />

            <div className="w-full max-w-2xl relative z-10">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">Partner Application</h1>
                    <p className="text-zinc-400 text-lg max-w-lg mx-auto">
                        Join our network of professional event photographers and agencies.
                        Apply for <span className="text-white font-semibold">Event Pro</span> or <span className="text-white font-semibold">Masters</span> access.
                    </p>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* Personal & Company Info */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-semibold flex items-center gap-2 text-white/90">
                                <Building2 className="w-5 h-5 text-indigo-400" />
                                Business Details
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName" className="text-zinc-400">Full Name</Label>
                                    <Input
                                        id="fullName"
                                        placeholder="Jane Doe"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        required
                                        className="bg-black/50 border-white/10 text-white focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="companyName" className="text-zinc-400">Company / Brand</Label>
                                    <Input
                                        id="companyName"
                                        placeholder="Acme Events"
                                        value={formData.companyName}
                                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                        required
                                        className="bg-black/50 border-white/10 text-white focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-zinc-400">Business Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="contact@acme.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            className="bg-black/50 border-white/10 text-white pl-10 focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location" className="text-zinc-400">City & Country</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                        <Input
                                            id="location"
                                            placeholder="New York, USA"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            required
                                            className="bg-black/50 border-white/10 text-white pl-10 focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-white/10" />

                        {/* Operations Info */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-semibold flex items-center gap-2 text-white/90">
                                <Briefcase className="w-5 h-5 text-purple-400" />
                                Operations
                            </h3>

                            <div className="space-y-3">
                                <Label className="text-zinc-400">Event Types (Select all that apply)</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {eventTypesList.map((type) => (
                                        <div key={type} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`type-${type}`}
                                                checked={formData.eventTypes.includes(type)}
                                                onCheckedChange={() => handleEventTypeChange(type)}
                                                className="border-white/20 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                            />
                                            <label
                                                htmlFor={`type-${type}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-300"
                                            >
                                                {type}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="eventVolume" className="text-zinc-400">Monthly Events (Approx)</Label>
                                    <Select
                                        value={formData.eventVolume}
                                        onValueChange={(val) => setFormData({ ...formData, eventVolume: val })}
                                    >
                                        <SelectTrigger className="bg-black/50 border-white/10 text-white">
                                            <SelectValue placeholder="Select volume" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                            <SelectItem value="1-2">1-2 events</SelectItem>
                                            <SelectItem value="3-5">3-5 events</SelectItem>
                                            <SelectItem value="6-10">6-10 events</SelectItem>
                                            <SelectItem value="10+">10+ events</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="tierInterest" className="text-zinc-400">Interested Tier</Label>
                                    <Select
                                        value={formData.tierInterest}
                                        onValueChange={(val) => setFormData({ ...formData, tierInterest: val })}
                                    >
                                        <SelectTrigger className="bg-black/50 border-white/10 text-white">
                                            <SelectValue placeholder="Select tier" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                            {tiers.filter(t => t.category === 'business').map((t) => (
                                                <SelectItem key={t.id} value={t.code}>{t.name}</SelectItem>
                                            ))}
                                            {tiers.filter(t => t.category === 'business').length === 0 && (
                                                <>
                                                    <SelectItem value="event-starter">Event Starter</SelectItem>
                                                    <SelectItem value="event-pro">Event Pro</SelectItem>
                                                    <SelectItem value="masters">Masters</SelectItem>
                                                </>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-zinc-400">Do you have your own photo booth hardware?</Label>
                                <div className="flex gap-6">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="hw-yes"
                                            checked={formData.hasHardware === "yes"}
                                            onCheckedChange={(c) => setFormData({ ...formData, hasHardware: c ? "yes" : "no" })}
                                            className="border-white/20 data-[state=checked]:bg-indigo-600"
                                        />
                                        <label htmlFor="hw-yes" className="text-sm text-zinc-300">Yes</label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="hw-no"
                                            checked={formData.hasHardware === "no"}
                                            onCheckedChange={(c) => setFormData({ ...formData, hasHardware: c ? "no" : "yes" })}
                                            className="border-white/20 data-[state=checked]:bg-indigo-600"
                                        />
                                        <label htmlFor="hw-no" className="text-sm text-zinc-300">No</label>
                                    </div>
                                </div>
                            </div>

                            {formData.hasHardware === "yes" && (
                                <div className="space-y-2 animate-fade-in">
                                    <Label htmlFor="hardwareDetails" className="text-zinc-400">Hardware Details (Optional)</Label>
                                    <Textarea
                                        id="hardwareDetails"
                                        placeholder="e.g. iPad Pro 12.9, Ring Light, Custom Enclosure..."
                                        value={formData.hardwareDetails}
                                        onChange={(e) => setFormData({ ...formData, hardwareDetails: e.target.value })}
                                        className="bg-black/50 border-white/10 text-white min-h-[80px] focus:border-indigo-500"
                                    />
                                </div>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]"
                        >
                            {isLoading ? "Submitting..." : (
                                <span className="flex items-center gap-2">
                                    Submit Application <ArrowRight className="w-5 h-5" />
                                </span>
                            )}
                        </Button>

                    </form>
                </div>
            </div>
        </div>
    );
}
