import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { registerUser } from "@/services/eventsApi";
import { Sparkles, ArrowRight, Lock, User, Mail, Check } from "lucide-react";

export default function AdminRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const plan = searchParams.get("plan");

  // Register form state
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (registerData.password !== registerData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (registerData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const { user } = await registerUser(
        registerData.username,
        registerData.email,
        registerData.password,
        registerData.fullName
      );
      toast.success(`Account created! Welcome, ${user.full_name || user.username}!`);
      navigate("/admin/events");
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[100px] -z-10" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-black/0 to-black/0 -z-10" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {["event-pro", "masters"].includes(plan || "") ? "Application Required" : "Create Account"}
          </h1>
          <p className="text-zinc-400">
            {plan ? (
              <span className="flex items-center justify-center gap-2">
                Selected Plan: <span className="text-indigo-400 font-semibold capitalize">{plan.replace("-", " ")}</span>
              </span>
            ) : (
              "Get started with your own photo booth events"
            )}
          </p>
        </div>

        {/* Register Card */}
        <div className="rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 shadow-2xl">
          {["event-pro", "masters"].includes(plan || "") ? (
            <div className="text-center space-y-6">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-sm">
                <p>
                  Business tiers ({plan?.replace("-", " ")}) require a manual application process to ensure quality and hardware compatibility.
                </p>
              </div>
              <Button
                onClick={() => navigate(`/apply?tier=${plan}`)}
                className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-semibold rounded-xl transition-all hover:scale-[1.02]"
              >
                Apply as Partner <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/admin/register")}
                className="text-zinc-400 hover:text-white"
              >
                Register for Individual Plan
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">

              <div className="space-y-2">
                <Label htmlFor="register-fullname" className="text-zinc-300">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                  <Input
                    id="register-fullname"
                    type="text"
                    placeholder="John Doe"
                    value={registerData.fullName}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, fullName: e.target.value })
                    }
                    disabled={isLoading}
                    className="bg-black/50 border-white/10 text-white pl-10 h-12 focus:border-indigo-500 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-username" className="text-zinc-300">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                  <Input
                    id="register-username"
                    type="text"
                    placeholder="Choose a username"
                    value={registerData.username}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, username: e.target.value })
                    }
                    required
                    disabled={isLoading}
                    className="bg-black/50 border-white/10 text-white pl-10 h-12 focus:border-indigo-500 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email" className="text-zinc-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={registerData.email}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, email: e.target.value })
                    }
                    required
                    disabled={isLoading}
                    className="bg-black/50 border-white/10 text-white pl-10 h-12 focus:border-indigo-500 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-zinc-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="******"
                      value={registerData.password}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, password: e.target.value })
                      }
                      required
                      disabled={isLoading}
                      className="bg-black/50 border-white/10 text-white pl-10 h-12 focus:border-indigo-500 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password" className="text-zinc-300">Confirm</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                    <Input
                      id="register-confirm-password"
                      type="password"
                      placeholder="******"
                      value={registerData.confirmPassword}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                      disabled={isLoading}
                      className="bg-black/50 border-white/10 text-white pl-10 h-12 focus:border-indigo-500 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Creating account..."
                ) : (
                  <span className="flex items-center gap-2">
                    Create Account <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-500">
            Already have an account?{" "}
            <button onClick={() => navigate("/admin/auth")} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
