import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Sparkles, ArrowRight, Lock, User, Mail, Check, Eye, EyeOff, Cake, Wand2 } from "lucide-react";
import { ENV } from "@/config/env";

export default function AdminRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const plan = searchParams.get("plan");

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Register form state
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    birthDate: "",
  });
  const [hasManuallyEditedUsername, setHasManuallyEditedUsername] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState<{
    status: 'idle' | 'checking' | 'available' | 'taken';
    message: string;
  }>({ status: 'idle', message: '' });

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailability({ status: 'idle', message: '' });
      return;
    }

    setUsernameAvailability({ status: 'checking', message: 'Checking availability...' });
    try {
      const response = await fetch(`${ENV.API_URL}/api/users/check-username/${username}`);
      const contentType = response.headers.get("content-type");

      if (response.ok && contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.available) {
          setUsernameAvailability({ status: 'available', message: 'Username is available!' });
        } else {
          setUsernameAvailability({ status: 'taken', message: 'Username is already taken' });
        }
      } else {
        // If not JSON or not OK, it's likely a 404/500 HTML page from a routing error
        console.warn("Username check returned non-JSON response:", response.status);
        setUsernameAvailability({ status: 'idle', message: '' });
      }
    } catch (error) {
      console.error("Failed to check username availability:", error);
      setUsernameAvailability({ status: 'idle', message: '' });
    }
  };

  // Debounced check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (registerData.username) {
        checkUsernameAvailability(registerData.username);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [registerData.username]);

  const suggestUsername = (name: string, randomize = false) => {
    if (!name) return "";
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .replace(/^\.|\.$/g, "");

    if (randomize) {
      const random = Math.floor(Math.random() * 1000);
      return `${base}${random}`;
    }
    return base;
  };

  const handleFullNameChange = (name: string) => {
    const newData = { ...registerData, fullName: name };
    if (!hasManuallyEditedUsername) {
      const suggestion = suggestUsername(name);
      newData.username = suggestion;
      // Also trigger check for suggestion immediately
      if (suggestion.length >= 3) {
        checkUsernameAvailability(suggestion);
      }
    }
    setRegisterData(newData);
    if (!name) {
      setUsernameAvailability({ status: 'idle', message: '' });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (registerData.password !== registerData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (registerData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (usernameAvailability.status === 'taken') {
      toast.error("Please choose a different username");
      return;
    }

    setIsLoading(true);

    try {
      await authClient.signUp.email(
        {
          email: registerData.email,
          password: registerData.password,
          name: registerData.fullName || registerData.username,
          username: registerData.username, // Send username separately
          birth_date: registerData.birthDate,
        } as any,
        {
          onSuccess: (ctx) => {
            const user = ctx.data.user;
            toast.success(`Account created! Welcome, ${user.name || user.email}!`);

            // Check for redirect param
            const redirect = searchParams.get("redirect");
            if (redirect) {
              window.location.href = redirect;
              return;
            }

            // For now, all users go to admin/events
            // TODO: Create separate dashboards for different roles
            navigate("/business/events");
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

  return (
    <div className="min-h-screen bg-[#101112] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[100px] -z-10" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-[#101112]/0 to-[#101112]/0 -z-10" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-[.8rem] overflow-hidden bg-white shadow-xl shadow-black/20 group-hover:bg-transparent transition-all duration-300 hover:scale-110">
              <img src="/PicturemeIconv2.png" alt="Pictureme" className="w-full h-full object-cover" />
            </div>
            <span className="text-3xl font-bold tracking-tight text-white">PictureMe</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {["event-starter", "event-pro", "masters"].includes(plan || "") ? "Application Required" : "Create Account"}
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
        <div className="rounded-3xl bg-card/50 backdrop-blur-xl border border-white/10 p-8 shadow-2xl">
          {["event-starter", "event-pro", "masters"].includes(plan || "") ? (
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
                onClick={() => navigate("/register")}
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
                    onChange={(e) => handleFullNameChange(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-[#101112]/50 border-white/10 text-white pl-10 h-12 focus:border-indigo-500 focus:ring-indigo-500/20"
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
                    onChange={(e) => {
                      setHasManuallyEditedUsername(true);
                      setRegisterData({ ...registerData, username: e.target.value });
                    }}
                    required
                    disabled={isLoading}
                    className="bg-[#101112]/50 border-white/10 text-white pl-10 h-12 focus:border-indigo-500 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const suggestion = suggestUsername(registerData.fullName, true);
                      setRegisterData({ ...registerData, username: suggestion });
                      checkUsernameAvailability(suggestion);
                    }}
                    className="absolute right-3 top-3 text-indigo-400 hover:text-indigo-300 p-1 z-20"
                    title="Suggest username"
                  >
                    <Wand2 className="w-4 h-4" />
                  </button>
                </div>
                {usernameAvailability.message && (
                  <p className={`text-xs mt-1 ${usernameAvailability.status === 'available' ? 'text-emerald-400' :
                    usernameAvailability.status === 'taken' ? 'text-red-400' : 'text-zinc-500'
                    }`}>
                    {usernameAvailability.message}
                  </p>
                )}
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
                    className="bg-[#101112]/50 border-white/10 text-white pl-10 h-12 focus:border-indigo-500 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-dob" className="text-zinc-300">Date of Birth</Label>
                <div className="relative">
                  <Cake className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                  <Input
                    id="register-dob"
                    type="date"
                    value={registerData.birthDate}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, birthDate: e.target.value })
                    }
                    required
                    disabled={isLoading}
                    className="bg-[#101112]/50 border-white/10 text-white pl-10 h-12 focus:border-indigo-500 focus:ring-indigo-500/20"
                  />
                </div>
              </div>


              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-zinc-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-zinc-500 z-10" />
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={registerData.password}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, password: e.target.value })
                      }
                      required
                      disabled={isLoading}
                      className="bg-[#101112]/50 border-white/10 text-white pl-10 pr-10 h-12 focus:border-indigo-500 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showPassword ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password" className="text-zinc-300">Confirm</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-zinc-500 z-10" />
                    <Input
                      id="register-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={registerData.confirmPassword}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                      disabled={isLoading}
                      className="bg-[#101112]/50 border-white/10 text-white pl-10 pr-10 h-12 focus:border-indigo-500 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
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
            <button onClick={() => navigate(`/admin/auth?${searchParams.toString()}`)} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div >
  );
}
