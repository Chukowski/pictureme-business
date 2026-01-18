import { ArrowLeft, ChevronRight, Wand2, QrCode, Eye, Store, Gamepad2, Settings, Layout, Menu, PanelRight, X, Maximize2, Minimize2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect, ReactNode } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { usePlayground } from "./PlaygroundContext";
import { motion, AnimatePresence } from "framer-motion";

interface PlaygroundLayoutProps {
  children: ReactNode;
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'template', label: 'Template Test', icon: Wand2, description: 'Test AI templates' },
  { id: 'badge', label: 'Badge Test', icon: QrCode, description: 'Design badges' },
  { id: 'event', label: 'Event Preview', icon: Eye, description: 'Preview flow' },
  { id: 'booth', label: 'Booth Simulator', icon: Store, description: 'Full simulator' },
];

const SidebarContent = ({ currentTab, onTabChange, onCloseMobileMenu }: { currentTab: string, onTabChange: (id: string) => void, onCloseMobileMenu?: () => void }) => (
  <div className="flex flex-col h-full bg-card">
    <div className="p-4">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-2">Tools</h2>
      <div className="space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onTabChange(item.id);
              if (onCloseMobileMenu) onCloseMobileMenu();
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group text-left relative overflow-hidden",
              currentTab === item.id
                ? "bg-zinc-800 text-white shadow-lg shadow-black/20"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            )}
          >
            {/* Active Indicator */}
            {currentTab === item.id && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
            )}

            <div className={cn(
              "p-2 rounded-lg transition-colors",
              currentTab === item.id ? "bg-purple-500/20 text-purple-300" : "bg-card text-zinc-500 group-hover:text-zinc-300"
            )}>
              <item.icon className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="leading-none">{item.label}</div>
              <div className="text-[10px] text-zinc-500 mt-1 font-normal opacity-80">{item.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>

    <div className="mt-auto p-4 border-t border-white/5">
      <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors">
        <Settings className="w-4 h-4" />
        Settings
      </button>
    </div>
  </div>
);

export function PlaygroundLayout({
  children,
  currentTab,
  onTabChange
}: PlaygroundLayoutProps) {
  const navigate = useNavigate();
  const { preview, previewToolbar, isRightSidebarOpen, setIsRightSidebarOpen, isPreviewFullscreen, setIsPreviewFullscreen, hasNewAsset, setHasNewAsset } = usePlayground();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Left sidebar
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Notify global navbar to hide when any sidebar is open
  useEffect(() => {
    // Hide navbar if mobile menu is open OR if right sidebar is open OR if left desktop sidebar is expanded
    const shouldHideNavbar = isMobileMenuOpen || isRightSidebarOpen || (isSidebarOpen && !isMobile);
    window.dispatchEvent(new CustomEvent('navbar-visibility', {
      detail: { visible: !shouldHideNavbar }
    }));
    return () => {
      window.dispatchEvent(new CustomEvent('navbar-visibility', {
        detail: { visible: true }
      }));
    };
  }, [isMobileMenuOpen, isSidebarOpen, isRightSidebarOpen, isMobile]);

  // Clear notification when sidebar opens
  useEffect(() => {
    if (isRightSidebarOpen && hasNewAsset) {
      setHasNewAsset(false);
    }
  }, [isRightSidebarOpen, hasNewAsset, setHasNewAsset]);

  const getTabLabel = () => navItems.find(t => t.id === currentTab)?.label || 'Playground';

  return (
    <div className="h-screen w-full flex flex-col bg-[#101112] overflow-hidden font-sans">
      {/* Sticky Header */}
      <header className="h-14 border-b border-white/10 bg-card flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile Menu Trigger */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="flex items-center justify-center -ml-2 text-zinc-400 hover:text-white h-9 w-9">
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85%] max-w-[300px] p-0 bg-[#101112] border-r border-white/10 z-[110]" overlayClassName="z-[110]">
                <SheetTitle className="sr-only">Playground Navigation</SheetTitle>
                <SidebarContent currentTab={currentTab} onTabChange={onTabChange} onCloseMobileMenu={() => setIsMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-zinc-400 hover:text-white h-8 w-8 hidden md:flex"
          >
            <Layout className={cn("w-4 h-4 transition-transform", !isSidebarOpen && "rotate-180")} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin')}
            className="text-zinc-400 hover:text-white h-8 w-8 hidden md:flex"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-5 bg-white/10 hidden md:block" />

          <div className="flex items-center gap-2 text-xs">
            <span className="hidden md:inline text-zinc-400 cursor-pointer hover:text-white transition-colors" onClick={() => navigate('/admin')}>
              Dashboard
            </span>
            <ChevronRight className="w-3 h-3 text-zinc-600 hidden md:block" />
            <span className="font-semibold text-white flex items-center gap-2 truncate max-w-[150px] md:max-w-none">
              <Gamepad2 className="w-3 h-3 text-purple-400 hidden sm:block" />
              Playground
            </span>
          </div>
        </div>

        {/* Right Side Actions (Placeholder for HUD or other global actions) */}
        <div className="flex items-center gap-2">
          <div className="flex md:hidden items-center text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em] mr-2">
            {navItems.find(t => t.id === currentTab)?.label}
          </div>
          <Separator orientation="vertical" className="h-5 bg-white/10 md:hidden" />
          {preview && (
            <div className="relative md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsRightSidebarOpen(!isRightSidebarOpen);
                  setHasNewAsset(false);
                }}
                className={cn(
                  "text-zinc-400 hover:text-white h-8 w-8",
                  isRightSidebarOpen && "text-white"
                )}
              >
                <PanelRight className="w-4 h-4" />
              </Button>
              {hasNewAsset && !isRightSidebarOpen && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
              )}
            </div>
          )}

          {/* Desktop Toggle */}
          {preview && (
            <div className="relative hidden md:block">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsRightSidebarOpen(!isRightSidebarOpen);
                  setHasNewAsset(false);
                }}
                className={cn(
                  "text-zinc-400 hover:text-white h-8 w-8",
                  isRightSidebarOpen && "bg-white/10 text-white"
                )}
              >
                <PanelRight className="w-4 h-4" />
              </Button>
              {hasNewAsset && !isRightSidebarOpen && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR - Desktop Navigation */}
        <aside className={cn(
          "bg-card border-r border-white/10 hidden md:flex flex-col shrink-0 transition-all duration-300 z-30",
          isSidebarOpen ? "w-56" : "w-0 opacity-0 border-none overflow-hidden"
        )}>
          <SidebarContent currentTab={currentTab} onTabChange={onTabChange} />
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col overflow-hidden bg-card relative">
          <div className="flex-1 overflow-y-auto">
            <div className="pb-32 md:pb-8">
              {children}
            </div>
          </div>
        </main>

        {/* RIGHT SIDEBAR - Preview / Assets */}
        <AnimatePresence mode="wait">
          {preview && isRightSidebarOpen && (
            <motion.aside
              initial={isMobile || isPreviewFullscreen ? { opacity: 0, x: "100%" } : { width: 0, opacity: 0 }}
              animate={isMobile || isPreviewFullscreen
                ? { opacity: 1, x: 0, width: "100%" }
                : { width: "45%", opacity: 1 }
              }
              exit={isMobile || isPreviewFullscreen ? { opacity: 0, x: "100%" } : { width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={cn(
                "bg-[#09090b] flex flex-col z-[60] overflow-hidden border-l border-white/10",
                (isMobile || isPreviewFullscreen) ? "fixed inset-0" : "relative min-w-[450px] max-w-[800px] shrink-0"
              )}
            >
              <div className="h-14 border-b border-white/10 flex items-center px-4 bg-card/80 backdrop-blur-xl z-20">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsRightSidebarOpen(false)}
                  className="mr-2 text-zinc-400 hover:text-white"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </Button>

                {!isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPreviewFullscreen(!isPreviewFullscreen)}
                    className="mr-4 text-zinc-400 hover:text-white"
                    title={isPreviewFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  >
                    {isPreviewFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                )}

                <div className="flex-1">
                  {previewToolbar}
                </div>
              </div>

              <div className="flex-1 overflow-hidden relative">
                {preview}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
