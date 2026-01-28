import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Sparkles, ArrowRight, Lock, User } from "lucide-react";
import { ENV } from "@/config/env";

export default function AdminAuth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if input is email or username
      const isEmail = loginData.username.includes('@');
      let emailToUse = loginData.username;

      // If it's a username, we need to fetch the email from the backend
      if (!isEmail) {
        // For now, try to find user by username in the old users table
        // This is a temporary solution until Better Auth supports username login
        try {
          const response = await fetch(`${ENV.API_URL}/api/users/email-by-username/${loginData.username}`);
          const contentType = response.headers.get("content-type");

          if (response.ok && contentType && contentType.includes("application/json")) {
            const data = await response.json();
            emailToUse = data.email;
          } else {
            toast.error("Username not found. Please use your email to login.");
            setIsLoading(false);
            return;
          }
        } catch (error) {
          toast.error("Error finding user. Please use your email to login.");
          setIsLoading(false);
          return;
        }
      }

      // Call our custom auth server directly
      const authUrl = ENV.AUTH_URL || 'http://localhost:3002';
      const response = await fetch(`${authUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({
          email: emailToUse.trim(), // Trim just in case
          password: loginData.password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || "Login failed");
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      const user = data.user;
      const token = data.token;

      toast.success(`Welcome back, ${user.name || user.email}!`);

      // Store user data and token in localStorage
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('auth_token', token); // Store token for API calls

      // Redirect based on role
      const searchParams = new URLSearchParams(window.location.search);
      const redirect = searchParams.get("redirect");

      if (redirect) {
        window.location.href = redirect;
      } else {
        const isBusiness = user.role?.startsWith('business') && user.role !== 'business_pending';
        if (isBusiness) {
          navigate("/business/home");
        } else {
          navigate("/creator/dashboard");
        }
      }

      setIsLoading(false);
    } catch (error: any) {
      toast.error(error.message || "Login failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101112] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[100px] -z-10" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-[#101112]/0 to-[#101112]/0 -z-10" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-[.8rem] overflow-hidden bg-white shadow-xl shadow-black/20 group-hover:bg-transparent transition-all duration-300 hover:scale-110">
              <img src="/PicturemeIconv2.png" alt="Pictureme" className="w-full h-full object-cover" />
            </div>
            <span className="text-3xl font-bold tracking-tight text-white">PictureMe</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back</h1>
          <p className="text-zinc-400">Sign in to manage your events</p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl bg-card/50 backdrop-blur-xl border border-white/10 p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="login-username" className="text-zinc-300">Email or Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                <Input
                  id="login-username"
                  type="text"
                  placeholder="Enter your email or username"
                  value={loginData.username}
                  onChange={(e) =>
                    setLoginData({ ...loginData, username: e.target.value })
                  }
                  required
                  disabled={isLoading}
                  className="bg-[#101112]/50 border-white/10 text-white pl-10 h-12 focus:border-indigo-500 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className="text-zinc-300">Password</Label>
                <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                  required
                  disabled={isLoading}
                  className="bg-[#101112]/50 border-white/10 text-white pl-10 h-12 focus:border-indigo-500 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? (
                "Signing in..."
              ) : (
                <span className="flex items-center gap-2">
                  Sign in <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-500">
            Don't have an account?{" "}
            <button onClick={() => navigate("/register")} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Start free trial
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
