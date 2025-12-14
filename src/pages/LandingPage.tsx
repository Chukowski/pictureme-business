import { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles, Zap, Shield, Aperture, Wand2, Layers, Smartphone, Info, User, LogOut } from "lucide-react";
import { logoutUser } from "@/services/eventsApi";

const Akito3DScene = lazy(() => import("@/components/Akito3DScene"));
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { ENV } from "@/config/env";

interface Tier {
  id: string;
  name: string;
  code: string;
  price: number;
  currency: string;
  token_limit: number;
  features: string[];
  category: string;
  highlight: string;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [pricingTab, setPricingTab] = useState<'individual' | 'business'>('individual');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [isLoadingTiers, setIsLoadingTiers] = useState(true);

  // Check for logged-in user
  useEffect(() => {
    // Check user
    const checkUser = () => {
      try {
        const userStr = localStorage.getItem('user');
        const authToken = localStorage.getItem('auth_token');
        if (userStr && authToken) {
          const user = JSON.parse(userStr);
          if (user && (user.id || user.email)) {
            setCurrentUser(user);
            return;
          }
        }
        setCurrentUser(null);
      } catch {
        setCurrentUser(null);
      }
    };
    checkUser();
    window.addEventListener('storage', checkUser);
    const interval = setInterval(checkUser, 500);

    // Fetch Tiers
    const fetchTiers = async () => {
      try {
        // Use ENV.API_URL which deals with production/dev
        const res = await fetch(`${ENV.API_URL || 'http://localhost:3002'}/api/tiers`);
        if (res.ok) {
          const data = await res.json();
          setTiers(data || []);
        }
      } catch (e) {
        console.error("Failed to fetch tiers", e);
      } finally {
        setIsLoadingTiers(false);
      }
    };
    fetchTiers();

    return () => {
      window.removeEventListener('storage', checkUser);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500 selection:text-white font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">PictureMe.now</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors">Features</button>
            <button onClick={() => scrollToSection("showcase")} className="hover:text-white transition-colors">Showcase</button>
            <button onClick={() => scrollToSection("pricing")} className="hover:text-white transition-colors">Pricing</button>
            <button onClick={() => scrollToSection("about-akita")} className="hover:text-white transition-colors text-indigo-400">About Akitá</button>
          </div>
          <div className="flex items-center gap-4">
            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 text-zinc-300 hover:text-white hover:bg-white/5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={currentUser.avatar_url} />
                      <AvatarFallback className="bg-indigo-600 text-white text-xs">
                        {getInitials(currentUser.full_name || currentUser.name || currentUser.username || currentUser.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline">{currentUser.full_name || currentUser.name || currentUser.username || currentUser.email?.split('@')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/10">
                  <DropdownMenuLabel className="text-zinc-400 flex flex-col">
                    <span className="text-white font-medium">{currentUser.full_name || currentUser.name || currentUser.username || 'User'}</span>
                    {currentUser.email && <span className="text-xs text-zinc-500 font-normal">{currentUser.email}</span>}
                    {currentUser.role && <span className="text-xs text-indigo-400 font-normal capitalize mt-1">{currentUser.role.replace(/_/g, ' ')}</span>}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    className="text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer"
                    onClick={() => navigate("/admin")}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer"
                    onClick={() => navigate("/admin/settings")}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Configuración
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5" onClick={() => navigate("/admin/auth")}>
                  Log in
                </Button>
                <Button className="bg-white text-black hover:bg-zinc-200 rounded-full px-6 font-semibold" onClick={() => navigate("/admin/register")}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 md:pt-52 md:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/20 rounded-[100%] blur-[120px] -z-10 opacity-50" />

        <div className="container mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 animate-fade-in backdrop-blur-md hover:bg-white/10 transition-colors cursor-pointer" onClick={() => window.open('https://akitapr.com', '_blank')}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-sm text-zinc-300 font-medium">Part of Akitá Smart Spaces</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 leading-tight">
            Creative work, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">reimagined.</span>
          </h1>

          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Transform standard event photos into professional, themed masterpieces instantly using advanced generative AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-14 px-8 text-lg bg-white text-black hover:bg-zinc-200 rounded-full w-full sm:w-auto font-semibold shadow-xl shadow-white/5" onClick={() => navigate("/admin/register")}>
              Start Creating
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full w-full sm:w-auto backdrop-blur-md" onClick={() => scrollToSection("showcase")}>
              View Gallery
            </Button>
          </div>

          {/* Hero Visuals - Floating Cards Effect */}
          <div className="mt-24 relative max-w-5xl mx-auto h-[400px] hidden md:block">
            <div className="absolute left-0 top-10 w-64 h-80 bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl rotate-[-6deg] hover:rotate-0 transition-all duration-500 z-10">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80" alt="Portrait" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
            </div>
            <div className="absolute right-0 top-10 w-64 h-80 bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl rotate-[6deg] hover:rotate-0 transition-all duration-500 z-10">
              <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80" alt="Portrait" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[500px] h-[350px] bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl z-20 hover:scale-105 transition-transform duration-500">
              <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80" alt="Abstract" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden">
                    <img src="https://github.com/shadcn.png" alt="User" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">AI Processing</p>
                    <p className="text-xs text-zinc-400">Generating masterpiece...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Section */}
      <section id="features" className="py-32 bg-zinc-950/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Enhance your photos <br />with AI magic.</h2>
              <p className="text-xl text-zinc-400">Powerful tools designed for modern event experiences.</p>
            </div>
            <Button variant="link" className="text-indigo-400 hover:text-indigo-300 text-lg p-0 mt-4 md:mt-0">
              Explore all features &rarr;
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Large Card */}
            <div className="md:col-span-2 h-[400px] rounded-3xl bg-zinc-900 border border-white/5 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img src="https://images.unsplash.com/photo-1621609764180-2ca554a9d6f2?w=1200&q=80" alt="AI Art" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute bottom-0 left-0 p-8">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-4 border border-white/10">
                  <Wand2 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Instant Transformation</h3>
                <p className="text-zinc-300 max-w-md">Turn selfies into stylized characters, professional portraits, or artistic masterpieces in seconds.</p>
              </div>
            </div>

            {/* Tall Card */}
            <div className="md:row-span-2 h-[400px] md:h-auto rounded-3xl bg-zinc-900 border border-white/5 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&q=80" alt="Portrait" className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute bottom-0 left-0 p-8 z-20">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-4 border border-white/10">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Mobile First</h3>
                <p className="text-zinc-300">Optimized for instant sharing via QR codes and social media integration.</p>
              </div>
            </div>

            {/* Small Card 1 */}
            <div className="h-[300px] rounded-3xl bg-zinc-900 border border-white/5 p-8 relative overflow-hidden group hover:border-white/10 transition-colors">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/20 blur-[50px] rounded-full -mr-10 -mt-10" />
              <Layers className="w-10 h-10 text-pink-400 mb-6" />
              <h3 className="text-xl font-bold mb-2">Brand Overlay</h3>
              <p className="text-zinc-400">Automatically apply logos, frames, and watermarks to every generated image.</p>
            </div>

            {/* Small Card 2 */}
            <div className="h-[300px] rounded-3xl bg-zinc-900 border border-white/5 p-8 relative overflow-hidden group hover:border-white/10 transition-colors">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-[50px] rounded-full -mr-10 -mt-10" />
              <Zap className="w-10 h-10 text-emerald-400 mb-6" />
              <h3 className="text-xl font-bold mb-2">Lightning Fast</h3>
              <p className="text-zinc-400">Optimized pipelines ensure guests get their photos before they leave the booth.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[120px] -z-10" />

        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Pick Your Plan</h2>
            <p className="text-xl text-zinc-400 mb-8">Scale your creativity with higher limits and priority access.</p>

            {/* Toggle */}
            <div className="inline-flex items-center p-1 rounded-full bg-zinc-900 border border-white/10 relative">
              <button
                onClick={() => setPricingTab('individual')}
                className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${pricingTab === 'individual' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                Individual
              </button>
              <button
                onClick={() => setPricingTab('business')}
                className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${pricingTab === 'business' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                Business
              </button>
              <div
                className={`absolute top-1 bottom-1 rounded-full bg-zinc-800 transition-all duration-300 ease-in-out ${pricingTab === 'individual' ? 'left-1 w-[calc(50%-4px)]' : 'left-[calc(50%+4px)] w-[calc(50%-8px)]'}`}
              />
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="max-w-7xl mx-auto">
            {isLoadingTiers ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {tiers
                    .filter(t => (t.category || 'individual') === pricingTab)
                    .map((tier) => {
                      const isPopular = tier.highlight?.includes("POPULAR");
                      const isPremium = tier.highlight?.includes("PREMIUM");
                      // Custom styling based on highlight or code
                      let cardClasses = "rounded-3xl bg-zinc-950 border p-8 flex flex-col transition-all relative";
                      if (isPopular) {
                        cardClasses += " border-indigo-500/50 shadow-2xl shadow-indigo-500/10 hover:border-indigo-500 scale-[1.02] md:scale-105 z-10";
                      } else if (isPremium) {
                        cardClasses += " border-amber-500/30 hover:border-amber-500/50";
                      } else {
                        cardClasses += " border-zinc-800 hover:border-zinc-700";
                      }

                      return (
                        <div key={tier.id} className={cardClasses}>
                          {isPopular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                              {tier.highlight}
                            </div>
                          )}
                          {isPremium && (
                            <div className="absolute top-8 right-8 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                              {tier.highlight}
                            </div>
                          )}

                          <div className="mb-6">
                            <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                            <div className="flex items-baseline gap-1">
                              {tier.price > 0 ? (
                                <>
                                  <span className="text-4xl font-bold text-white">${tier.price}</span>
                                  <span className="text-zinc-500">/month</span>
                                </>
                              ) : (
                                <span className="text-4xl font-bold text-white">Free</span>
                              )}
                            </div>
                            <p className="text-zinc-400 text-sm mt-4">
                              {tier.token_limit > 0 ? `${tier.token_limit.toLocaleString()} tokens per month` : "Basic access"}
                            </p>
                          </div>

                          <Button
                            className={`w-full mb-8 rounded-xl font-semibold ${isPopular
                              ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20"
                              : isPremium
                                ? "variant-outline border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                : "bg-white text-black hover:bg-zinc-200"
                              }`}
                            variant={isPremium ? "outline" : "default"}
                            onClick={() => {
                              if (pricingTab === 'business') {
                                navigate(`/apply?tier=${tier.code}`);
                              } else {
                                navigate(`/admin/register?plan=${tier.code}`);
                              }
                            }}
                          >
                            {pricingTab === 'business' ? 'Apply Now' : 'Get Started'}
                          </Button>

                          <div className="space-y-4 flex-1">
                            <div className="text-sm font-medium text-white mb-4">Includes:</div>
                            {/* Always show token limit as first feature */}
                            <div className="flex items-center gap-3 text-sm text-zinc-300">
                              <Check className={`w-4 h-4 shrink-0 ${isPopular ? "text-indigo-400" : isPremium ? "text-amber-500" : "text-white"}`} />
                              <span>{tier.token_limit.toLocaleString()} tokens / month</span>
                            </div>

                            {Array.isArray(tier.features) && tier.features.map((feature, i) => (
                              <div key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                                <Check className={`w-4 h-4 shrink-0 ${isPopular ? "text-indigo-400" : isPremium ? "text-amber-500" : "text-white"}`} />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {pricingTab === 'individual' && (
                  <div className="mt-12 rounded-2xl bg-zinc-950 border border-white/10 p-8 flex flex-col md:flex-row items-center justify-between gap-6 max-w-3xl mx-auto shadow-2xl animate-fade-in">
                    <span className="text-lg text-white font-medium">Ready to start your own business?</span>
                    <Button
                      onClick={() => setPricingTab('business')}
                      className="bg-[#D9F99D] hover:bg-[#BEF264] text-black font-bold rounded-xl px-8 h-12 text-base shadow-[0_0_20px_-5px_rgba(217,249,157,0.5)] transition-all hover:scale-105"
                    >
                      See Business Plans
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* About Akitá Section */}
      <section id="about-akita" className="py-24 bg-zinc-900/30 relative overflow-hidden border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 relative order-2 md:order-1">
              {/* 3D Akito Model */}
              <div className="relative z-10 w-full max-w-md mx-auto group h-[400px] md:h-[500px]">
                <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full -z-10" />
                <Suspense fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                }>
                  <Akito3DScene />
                </Suspense>
              </div>
            </div>

            <div className="flex-1 space-y-8 order-1 md:order-2">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-6">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  Powered by Akitá
                </div>

                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  Smart Spaces, <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Intelligently Connected.</span>
                </h2>

                <p className="text-lg text-zinc-400 leading-relaxed">
                  PictureMe is a flagship initiative of <a href="https://akitapr.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-indigo-400 transition-colors font-semibold underline decoration-indigo-500/30 underline-offset-4">Akitá</a>'s "Smart Spaces" program.
                </p>
                <p className="text-lg text-zinc-400 leading-relaxed mt-4">
                  We're moving beyond IoT to integrate true Artificial Intelligence into physical environments. Our mission is to create spaces that don't just function, but interact, adapt, and enhance the human experience.
                </p>
              </div>

              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors cursor-default">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Meet Akito</h4>
                    <p className="text-zinc-400 leading-relaxed">
                      More than just a mascot, Akito is the AI soul of our platform. He guides users, optimizes workflows, and brings a friendly face to advanced technology.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  className="bg-white text-black hover:bg-zinc-200 rounded-xl px-8 font-semibold"
                  onClick={() => window.open('https://akitapr.com', '_blank')}
                >
                  Visit Akitá
                </Button>
                <Button
                  variant="outline"
                  className="bg-transparent border border-white/20 text-white hover:bg-white/10 hover:text-white hover:border-white/30 rounded-xl px-8"
                  onClick={() => scrollToSection('features')}
                >
                  Explore Features
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-black text-zinc-500 text-sm">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img
              src="/assets/akita-logo.png"
              alt="Akitá"
              className="h-8 w-auto mr-2 opacity-80 hover:opacity-100 transition-opacity"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center hidden">
              <Sparkles className="w-3 h-3 text-zinc-400" />
            </div>
            <span className="font-semibold text-zinc-300">PictureMe.now</span>
            <span className="text-zinc-600 text-xs ml-2 border-l border-zinc-800 pl-2">by Akitá</span>
          </div>
          <div className="flex gap-8">
            <button onClick={() => navigate("/privacy")} className="hover:text-white transition-colors">Privacy</button>
            <button onClick={() => navigate("/terms")} className="hover:text-white transition-colors">Terms</button>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
          </div>
          <p>© 2025 PictureMe.now. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
