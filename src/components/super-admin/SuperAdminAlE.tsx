import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Settings as SettingsIcon, 
  Mail, 
  Zap, 
  Terminal as TerminalIcon,
  Cpu,
  History,
  Layout,
  X,
  ChevronLeft,
  Menu,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// Modularized Components
import { TechnicalTooltip, TabAnimationWrapper, DecorativeGrid, ScanLine } from "./SuperAdminAlE/ale-shared";
import { AlESettingsTab } from "./SuperAdminAlE/AlESettingsTab";
import { EmailComposerTab } from "./SuperAdminAlE/EmailComposerTab";
import { TemplatesTab } from "./SuperAdminAlE/TemplatesTab";
import { TriggersTab } from "./SuperAdminAlE/TriggersTab";
import { CommunicationLogsTab } from "./SuperAdminAlE/CommunicationLogsTab";

export default function SuperAdminAlE() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'settings';
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const tabs = [
    { id: 'settings', label: 'CORE_CONFIG', icon: SettingsIcon, tooltip: 'Global system configuration and master switches.' },
    { id: 'composer', label: 'TRANSMISSION', icon: Mail, tooltip: 'Manual manual message routing and broadcast control.' },
    { id: 'templates', label: 'DATA_VAULT', icon: Layout, tooltip: 'Manage reusable transmission protocols and templates.' },
    { id: 'triggers', label: 'NEURAL_LINKS', icon: Zap, tooltip: 'Configure event-to-action autonomous protocols.' },
    { id: 'logs', label: 'COMMS_LOG', icon: History, tooltip: 'Immutable stream of all system-human interactions.' },
  ];

  return (
    <TooltipProvider>
      <div className="fixed inset-0 z-[40] bg-[#050505] text-white flex flex-col font-mono selection:bg-indigo-500/30">
        <DecorativeGrid />
        <ScanLine />
        
        {/* Header HUD */}
        <header className="h-20 border-b border-white/5 bg-black/80 backdrop-blur-md flex items-center justify-between px-8 shrink-0 relative z-10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hover:bg-white/5 border border-white/5 h-10 w-10 transition-all"
            >
              {isSidebarOpen ? <ChevronLeft className="w-5 h-5 text-zinc-400" /> : <Menu className="w-5 h-5 text-zinc-400" />}
            </Button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-md opacity-20 animate-pulse" />
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg relative">
                  <TerminalIcon className="w-6 h-6 text-indigo-400" />
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-[0.2em] uppercase text-white/90">AL-E CONSOLE</h1>
                  <Badge variant="outline" className="text-[8px] border-indigo-500/30 text-indigo-400 bg-indigo-500/5 px-1.5 py-0 h-4">v2.4.0_STABLE</Badge>
                </div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-3 h-3 text-green-500 animate-pulse" />
                  Neural CRM Engine // Status: Optimal
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-[8px] text-zinc-500 uppercase tracking-[0.2em]">Uptime Buffer</span>
              <span className="text-[10px] text-zinc-300 font-bold uppercase">99.998% Synchronized</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/super-admin')}
              className="rounded-full hover:bg-white/5 border border-white/5 h-12 w-12 group transition-all"
            >
              <X className="w-5 h-5 text-zinc-500 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative z-10">
          <Tabs 
            value={activeTab} 
            onValueChange={handleTabChange} 
            orientation="vertical"
            className="flex w-full h-full relative"
          >
            {/* Sidebar Navigation */}
            <AnimatePresence initial={false}>
              {isSidebarOpen && (
                <motion.div 
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 288, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="border-r border-white/5 bg-zinc-950/50 flex flex-col pt-8 overflow-hidden shrink-0"
                >
                  <div className="w-72">
                    <div className="px-6 mb-8">
                      <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.3em]">Operational_Sectors</span>
                    </div>
                    <TabsList className="flex flex-col h-auto bg-transparent gap-2 px-3">
                      {tabs.map((tab) => (
                        <TechnicalTooltip key={tab.id} text={tab.tooltip}>
                          <TabsTrigger
                            value={tab.id}
                            className={cn(
                              "w-full justify-start gap-4 px-4 py-4 rounded-none border-l-2 transition-all font-mono text-[11px] uppercase tracking-widest text-left",
                              "data-[state=active]:bg-indigo-500/10 data-[state=active]:border-indigo-500 data-[state=active]:text-white",
                              "data-[state=inactive]:border-transparent data-[state=inactive]:text-zinc-600 data-[state=inactive]:hover:text-zinc-400 data-[state=inactive]:hover:bg-white/5"
                            )}
                          >
                            <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-indigo-400" : "text-zinc-700")} />
                            {tab.label}
                          </TabsTrigger>
                        </TechnicalTooltip>
                      ))}
                    </TabsList>

                    <div className="mt-auto p-8 border-t border-white/5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Al-e Uplink Active</span>
                      </div>
                      <div className="p-4 bg-zinc-900/50 border border-white/5 rounded space-y-2">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-3 h-3 text-indigo-400" />
                          <span className="text-[8px] text-indigo-400 font-bold uppercase">Neural Engine</span>
                        </div>
                        <p className="text-[9px] text-zinc-500 leading-relaxed uppercase">Awaiting manual oversight for Phase 4 deployment.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content Viewport */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 p-10">
              <TabsContent value="settings" className="m-0 focus-visible:ring-0">
                <AnimatePresence mode="wait">
                  {activeTab === 'settings' && (
                    <TabAnimationWrapper key="settings">
                      <AlESettingsTab />
                    </TabAnimationWrapper>
                  )}
                </AnimatePresence>
              </TabsContent>
              
              <TabsContent value="composer" className="m-0 focus-visible:ring-0">
                <AnimatePresence mode="wait">
                  {activeTab === 'composer' && (
                    <TabAnimationWrapper key="composer">
                      <EmailComposerTab />
                    </TabAnimationWrapper>
                  )}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="templates" className="m-0 focus-visible:ring-0">
                <AnimatePresence mode="wait">
                  {activeTab === 'templates' && (
                    <TabAnimationWrapper key="templates">
                      <TemplatesTab />
                    </TabAnimationWrapper>
                  )}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="triggers" className="m-0 focus-visible:ring-0">
                <AnimatePresence mode="wait">
                  {activeTab === 'triggers' && (
                    <TabAnimationWrapper key="triggers">
                      <TriggersTab />
                    </TabAnimationWrapper>
                  )}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="logs" className="m-0 focus-visible:ring-0">
                <AnimatePresence mode="wait">
                  {activeTab === 'logs' && (
                    <TabAnimationWrapper key="logs">
                      <CommunicationLogsTab />
                    </TabAnimationWrapper>
                  )}
                </AnimatePresence>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer HUD */}
        <footer className="h-10 border-t border-white/5 bg-black flex items-center justify-between px-8 text-[9px] font-mono text-zinc-600 uppercase tracking-widest shrink-0 relative z-10">
          <div className="flex gap-6">
            <span>Terminal: Al-e_v2.4.0</span>
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
              Node: Super_Admin_Root
            </span>
          </div>
          <div className="flex gap-6 items-center">
            <span className="text-indigo-500/50">Core_Access: Granted</span>
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              System_Sync: 100%
            </span>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
