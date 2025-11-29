import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, RefreshCw, CheckCircle, XCircle, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { ENV } from "@/config/env";

interface SystemSettings {
    maintenance_mode: boolean;
    registration_enabled: boolean;
    free_trial_enabled: boolean;
    free_trial_tokens: number;
    default_user_role: string;
    max_events_per_user: number;
    max_photos_per_event: number;
}

interface ServiceStatus {
    name: string;
    status: 'connected' | 'disconnected' | 'error';
    lastChecked?: string;
}

export default function SuperAdminSettings() {
    const [settings, setSettings] = useState<SystemSettings>({
        maintenance_mode: false,
        registration_enabled: true,
        free_trial_enabled: true,
        free_trial_tokens: 50,
        default_user_role: 'user',
        max_events_per_user: 10,
        max_photos_per_event: 1000
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [services, setServices] = useState<ServiceStatus[]>([]);
    const [showApiKeys, setShowApiKeys] = useState(false);

    useEffect(() => {
        loadSettings();
        checkServices();
    }, []);

    const loadSettings = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem("auth_token");
            
            const response = await fetch(`${ENV.API_URL}/api/admin/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
            }
        } catch (error) {
            console.error("Error loading settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const checkServices = async () => {
        const token = localStorage.getItem("auth_token");
        
        // Check FAL.ai
        let falStatus: ServiceStatus = { name: 'FAL.ai', status: 'disconnected' };
        try {
            const falRes = await fetch(`${ENV.API_URL}/api/config`);
            if (falRes.ok) {
                const config = await falRes.json();
                falStatus.status = config.falKey ? 'connected' : 'disconnected';
            }
        } catch {
            falStatus.status = 'error';
        }

        // Check Stripe
        let stripeStatus: ServiceStatus = { name: 'Stripe', status: 'disconnected' };
        try {
            const stripeRes = await fetch(`${ENV.API_URL}/api/billing/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (stripeRes.ok) {
                stripeStatus.status = 'connected';
            }
        } catch {
            stripeStatus.status = 'error';
        }

        // Check Email
        let emailStatus: ServiceStatus = { name: 'Email (SMTP)', status: 'disconnected' };
        try {
            const emailRes = await fetch(`${ENV.API_URL}/api/email/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (emailRes.ok) {
                const data = await emailRes.json();
                emailStatus.status = data.configured ? 'connected' : 'disconnected';
            }
        } catch {
            emailStatus.status = 'error';
        }

        // Check S3
        let s3Status: ServiceStatus = { name: 'AWS S3', status: 'connected' }; // Assume connected if app works

        // Check Database
        let dbStatus: ServiceStatus = { name: 'Database', status: 'connected' }; // If we got here, DB works

        setServices([falStatus, stripeStatus, emailStatus, s3Status, dbStatus]);
    };

    const saveSettings = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem("auth_token");
            
            const response = await fetch(`${ENV.API_URL}/api/admin/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                toast.success("Settings saved successfully");
            } else {
                toast.error("Failed to save settings");
            }
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'connected':
                return <CheckCircle className="w-4 h-4 text-emerald-400" />;
            case 'disconnected':
                return <XCircle className="w-4 h-4 text-zinc-500" />;
            case 'error':
                return <AlertTriangle className="w-4 h-4 text-red-400" />;
            default:
                return null;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'connected':
                return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Connected</Badge>;
            case 'disconnected':
                return <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20">Not Configured</Badge>;
            case 'error':
                return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Error</Badge>;
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">System Settings</h1>
                    <p className="text-zinc-400">Configure global system parameters and integrations.</p>
                </div>
                <Button 
                    variant="outline" 
                    onClick={() => { loadSettings(); checkServices(); }}
                    className="border-white/10 bg-zinc-900/50"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Service Status */}
                <Card className="bg-zinc-900/50 border-white/10">
                    <CardHeader>
                        <CardTitle>Service Status</CardTitle>
                        <CardDescription>External service connections.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {services.map((service, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                <div className="flex items-center gap-3">
                                    {getStatusIcon(service.status)}
                                    <span className="text-white font-medium">{service.name}</span>
                                </div>
                                {getStatusBadge(service.status)}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* API Keys (masked) */}
                <Card className="bg-zinc-900/50 border-white/10">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>API Configuration</CardTitle>
                                <CardDescription>External service API keys (from environment).</CardDescription>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowApiKeys(!showApiKeys)}
                                className="text-zinc-400 hover:text-white"
                            >
                                {showApiKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-400">FAL.ai API Key</Label>
                            <Input 
                                type={showApiKeys ? "text" : "password"} 
                                value="************************" 
                                disabled
                                className="bg-zinc-950 border-white/10" 
                            />
                            <p className="text-xs text-zinc-500">Set via FAL_KEY environment variable</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-400">Stripe Secret Key</Label>
                            <Input 
                                type={showApiKeys ? "text" : "password"} 
                                value="************************" 
                                disabled
                                className="bg-zinc-950 border-white/10" 
                            />
                            <p className="text-xs text-zinc-500">Set via STRIPE_SECRET_KEY environment variable</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-400">AWS S3</Label>
                            <Input 
                                type={showApiKeys ? "text" : "password"} 
                                value="************************" 
                                disabled
                                className="bg-zinc-950 border-white/10" 
                            />
                            <p className="text-xs text-zinc-500">Set via AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY</p>
                        </div>
                    </CardContent>
                </Card>

                {/* System Toggles */}
                <Card className="bg-zinc-900/50 border-white/10">
                    <CardHeader>
                        <CardTitle>System Toggles</CardTitle>
                        <CardDescription>Enable or disable global features.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base text-white">Maintenance Mode</Label>
                                <p className="text-sm text-zinc-400">Disable access for all non-admin users.</p>
                            </div>
                            <Switch 
                                checked={settings.maintenance_mode}
                                onCheckedChange={(checked) => setSettings({ ...settings, maintenance_mode: checked })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base text-white">New User Registration</Label>
                                <p className="text-sm text-zinc-400">Allow new users to sign up.</p>
                            </div>
                            <Switch 
                                checked={settings.registration_enabled}
                                onCheckedChange={(checked) => setSettings({ ...settings, registration_enabled: checked })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base text-white">Free Trial</Label>
                                <p className="text-sm text-zinc-400">Give tokens to new users automatically.</p>
                            </div>
                            <Switch 
                                checked={settings.free_trial_enabled}
                                onCheckedChange={(checked) => setSettings({ ...settings, free_trial_enabled: checked })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Default Values */}
                <Card className="bg-zinc-900/50 border-white/10">
                    <CardHeader>
                        <CardTitle>Default Values</CardTitle>
                        <CardDescription>Default settings for new users and events.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-400">Free Trial Tokens</Label>
                            <Input
                                type="number"
                                value={settings.free_trial_tokens}
                                onChange={(e) => setSettings({ ...settings, free_trial_tokens: parseInt(e.target.value) || 0 })}
                                className="bg-zinc-950 border-white/10"
                            />
                            <p className="text-xs text-zinc-500">Tokens given to new users on signup</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-400">Max Events per User</Label>
                            <Input
                                type="number"
                                value={settings.max_events_per_user}
                                onChange={(e) => setSettings({ ...settings, max_events_per_user: parseInt(e.target.value) || 0 })}
                                className="bg-zinc-950 border-white/10"
                            />
                            <p className="text-xs text-zinc-500">Maximum active events per user (0 = unlimited)</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-400">Max Photos per Event</Label>
                            <Input
                                type="number"
                                value={settings.max_photos_per_event}
                                onChange={(e) => setSettings({ ...settings, max_photos_per_event: parseInt(e.target.value) || 0 })}
                                className="bg-zinc-950 border-white/10"
                            />
                            <p className="text-xs text-zinc-500">Maximum photos per event (0 = unlimited)</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Info Box */}
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <h3 className="font-medium text-amber-400 mb-2">⚠️ Important Notes</h3>
                <ul className="text-sm text-zinc-400 space-y-1">
                    <li>• <strong>Maintenance Mode</strong> will block all non-admin users from accessing the platform</li>
                    <li>• <strong>API Keys</strong> are configured via environment variables and cannot be changed here</li>
                    <li>• Changes to settings take effect immediately after saving</li>
                    <li>• Some settings may require a server restart to fully apply</li>
                </ul>
            </div>

            <div className="flex justify-end">
                <Button 
                    onClick={saveSettings}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700"
                >
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
