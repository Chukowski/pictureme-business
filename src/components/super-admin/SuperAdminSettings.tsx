import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";

export default function SuperAdminSettings() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">System Settings</h1>
                <p className="text-zinc-400">Configure global system parameters and API keys.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card className="bg-zinc-900/50 border-white/10">
                    <CardHeader>
                        <CardTitle>API Configuration</CardTitle>
                        <CardDescription>Manage external service connections.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>FAL.ai API Key</Label>
                            <Input type="password" value="************************" className="bg-zinc-950 border-white/10" />
                        </div>
                        <div className="space-y-2">
                            <Label>Stripe Secret Key</Label>
                            <Input type="password" value="************************" className="bg-zinc-950 border-white/10" />
                        </div>
                        <div className="space-y-2">
                            <Label>AWS S3 Access Key</Label>
                            <Input type="password" value="************************" className="bg-zinc-950 border-white/10" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-white/10">
                    <CardHeader>
                        <CardTitle>System Toggles</CardTitle>
                        <CardDescription>Enable or disable global features.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Maintenance Mode</Label>
                                <p className="text-sm text-zinc-400">Disable access for all non-admin users.</p>
                            </div>
                            <Switch />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">New User Registration</Label>
                                <p className="text-sm text-zinc-400">Allow new users to sign up.</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Global Free Trial</Label>
                                <p className="text-sm text-zinc-400">Give 50 tokens to new users automatically.</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                        <Save className="w-4 h-4 mr-2" /> Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}
