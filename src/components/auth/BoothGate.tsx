import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Sparkles, ArrowRight, Lock, User, Mail, Eye, EyeOff } from "lucide-react";
import { ENV } from "@/config/env";
import type { EventConfig } from "@/services/eventsApi";

interface BoothGateProps {
    config: EventConfig;
    onSuccess: () => void;
}

export function BoothGate({ config, onSuccess }: BoothGateProps) {
    const [activeTab, setActiveTab] = useState<"register" | "login">("register");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        fullName: "",
    });

    const [loginData, setLoginData] = useState({
        username: "",
        password: "",
    });

    // Shared legacy login logic
    const performLegacyLogin = async (email: string, password: string) => {
        const authUrl = ENV.AUTH_URL || 'http://localhost:3002';
        const response = await fetch(`${authUrl}/api/auth/sign-in/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                email: email,
                password: password,
            }),
        });

        if (!response.ok) {
            throw new Error("Legacy login failed");
        }

        const data = await response.json();
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('auth_token', data.token); // Critical for AI API calls
        return data;
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords don't match");
            return;
        }

        if (formData.password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        setIsLoading(true);

        try {
            await authClient.signUp.email(
                {
                    email: formData.email,
                    password: formData.password,
                    name: formData.fullName || formData.username,
                },
                {
                    onSuccess: async (ctx) => {
                        const user = ctx.data.user;
                        toast.success(`Welcome to ${config.title}, ${user.name || user.email}!`);

                        // Auto-login to get legacy token
                        try {
                            await performLegacyLogin(formData.email, formData.password);
                            onSuccess(); // Proceed only after token is set
                        } catch (loginError) {
                            console.error("Auto-login failed:", loginError);
                            toast.error("Account created, but could not log in automatically. Please sign in.");
                            setActiveTab("login");
                            setLoginData({ username: formData.email, password: formData.password });
                            setIsLoading(false);
                        }
                    },
                    onError: (ctx) => {
                        toast.error(ctx.error.message || "Registration failed");
                        setIsLoading(false);
                    },
                }
            );
        } catch (error: any) {
            toast.error(error.message || "Registration failed");
            setIsLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        // We strictly use the legacy flow for Booth login to ensure token presence
        e.preventDefault();
        setIsLoading(true);

        try {
            const isEmail = loginData.username.includes('@');
            let emailToUse = loginData.username;

            if (!isEmail) {
                try {
                    const response = await fetch(`${ENV.API_URL}/api/users/email-by-username/${loginData.username}`);
                    if (response.ok) {
                        const data = await response.json();
                        emailToUse = data.email;
                    }
                } catch (e) { console.error(e) }
            }

            await performLegacyLogin(emailToUse, loginData.password);

            toast.success("Welcome back!");
            onSuccess();

        } catch (error: any) {
            toast.error(error.message || "Login failed");
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto animate-in fade-in zoom-in duration-300">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Join {config.title}
                    </h2>
                    <p className="text-zinc-400 text-sm">
                        To continue to the booth, please create an account or sign in.
                    </p>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-white/5 mb-6">
                        <TabsTrigger value="register">Register</TabsTrigger>
                        <TabsTrigger value="login">Sign In</TabsTrigger>
                    </TabsList>

                    <TabsContent value="register" className="space-y-4">
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reg-fullname">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                    <Input
                                        id="reg-fullname"
                                        placeholder="Your Name"
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                        className="pl-9 bg-white/5 border-white/10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reg-username">Username</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                    <Input
                                        id="reg-username"
                                        placeholder="username"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        className="pl-9 bg-white/5 border-white/10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reg-email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                    <Input
                                        id="reg-email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="pl-9 bg-white/5 border-white/10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reg-pass">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                    <Input
                                        id="reg-pass"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="pl-9 bg-white/5 border-white/10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reg-confirm">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                    <Input
                                        id="reg-confirm"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className="pl-9 bg-white/5 border-white/10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="checkbox"
                                    id="show-pass"
                                    checked={showPassword}
                                    onChange={e => setShowPassword(e.target.checked)}
                                    className="rounded bg-white/5 border-white/10"
                                />
                                <label htmlFor="show-pass" className="text-xs text-zinc-400 cursor-pointer select-none">Show password</label>
                            </div>

                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500" disabled={isLoading}>
                                {isLoading ? "creating..." : "Register & Enter"}
                            </Button>
                        </form>
                    </TabsContent>

                    <TabsContent value="login" className="space-y-4">
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="login-user">Email or Username</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                    <Input
                                        id="login-user"
                                        placeholder="username"
                                        value={loginData.username}
                                        onChange={e => setLoginData({ ...loginData, username: e.target.value })}
                                        className="pl-9 bg-white/5 border-white/10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="login-pass">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                    <Input
                                        id="login-pass"
                                        type="password"
                                        placeholder="••••••••"
                                        value={loginData.password}
                                        onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                                        className="pl-9 bg-white/5 border-white/10"
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500" disabled={isLoading}>
                                {isLoading ? "Signing in..." : "Sign In & Enter"}
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
