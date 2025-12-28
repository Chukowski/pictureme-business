import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  Sparkles,
  Wand2,
  ArrowUp,
  Bot,
  Plus,
  ChevronRight,
  Ratio,
  Pencil,
  Image as ImageIcon,
  Video as VideoIcon,
  Clock,
  Volume2,
  VolumeX,
  Zap,
  ChevronDown,
  Layers,
  Monitor,
  Smartphone,
  Maximize2,
  Minus,
  Check,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ENV } from "@/config/env";
import AssistantMarkdown from "@/components/assistant/AssistantMarkdown";
import {
  parseGenerativeUI,
  RenderGenerativeUI,
  type GenerativeUIComponent
} from "@/components/assistant/AssistantGenerativeUI";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AI_MODELS, LOCAL_IMAGE_MODELS, LOCAL_VIDEO_MODELS, type AspectRatio } from "@/services/aiProcessor";

// CopilotKit hook for chat (optional - gracefully degrades if not available)
let useCopilotChat: any = null;
try {
  const copilotCore = require("@copilotkit/react-core");
  useCopilotChat = copilotCore.useCopilotChat;
} catch {
  // CopilotKit not available, will use direct API calls
}

const API_URL = ENV.API_URL || "";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  components?: GenerativeUIComponent[];
}

const GUEST_MESSAGE_LIMIT = 5;
const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "PictureMe Assist can help you with a variety of creative and technical tasks. Here are some key capabilities:\n\n1. **Event Setup**: Configure your photo booth events, customize branding, and set up emails.\n2. **Image Generation**: Create photorealistic AI images using our studio tools.\n3. **Troubleshooting**: Diagnose issues with your booth or account settings.\n4. **Plan Information**: Learn about our different tiers and features.\n\nHow can I assist you today?",
  timestamp: new Date(),
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Agent UI States
  const [mode, setMode] = useState<"image" | "video">("image");
  const [selectedModel, setSelectedModel] = useState(LOCAL_IMAGE_MODELS[0]?.id || "nano-banana");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [resolution, setResolution] = useState<"Auto" | "2K" | "4K">("Auto");
  const [imageCount, setImageCount] = useState(1);
  const [videoDuration, setVideoDuration] = useState(5);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [movements, setMovements] = useState("Standard");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const copilotChat = useCopilotChat ? useCopilotChat() : null;

  const getUserInfo = useCallback(() => {
    try {
      const userStr = localStorage.getItem("user");
      const authToken = localStorage.getItem("auth_token");

      if (userStr && authToken) {
        const user = JSON.parse(userStr);
        if (user && (user.id || user.email)) {
          let displayName = null;
          if (user.full_name && user.full_name.trim()) {
            displayName = user.full_name.trim();
          } else if (user.username && user.username.trim()) {
            displayName = user.username.trim();
          } else if (user.name && user.name.trim()) {
            displayName = user.name.trim();
          } else if (user.email) {
            displayName = user.email.split('@')[0];
          }

          return {
            user_id: user.id?.toString(),
            user_role: user.role || "individual",
            user_name: displayName,
            isValid: true,
          };
        }
      }
    } catch (e) {
      console.error("Error parsing user info:", e);
    }
    return { user_id: null, user_role: null, user_name: null, isValid: false };
  }, []);

  const resetChatWithAuth = useCallback((authenticated: boolean, userName?: string | null) => {
    // If we want to persist chat or welcome message logic, do it here.
    // For now, we keep the static welcome message or customize it slightly.
    setMessages([WELCOME_MESSAGE]);
    setSuggestions([]);
  }, []);

  useEffect(() => {
    const checkAuthChange = () => {
      const userInfo = getUserInfo();
      const newUserId = userInfo.user_id;
      const nowAuthenticated = userInfo.isValid;

      const authChanged = isAuthenticated !== nowAuthenticated;
      const userChanged = currentUserId !== null && currentUserId !== newUserId;

      if (authChanged || userChanged) {
        setIsAuthenticated(nowAuthenticated);
        setCurrentUserId(newUserId);

        if (nowAuthenticated) {
          setGuestMessageCount(0);
        }
      } else if (currentUserId === null && newUserId !== null) {
        setIsAuthenticated(nowAuthenticated);
        setCurrentUserId(newUserId);
        setGuestMessageCount(0);
      }
    };

    checkAuthChange();
  }, [currentUserId, getUserInfo, isAuthenticated]);

  // Sync model when mode changes
  useEffect(() => {
    if (mode === "image") {
      const currentIsImage = LOCAL_IMAGE_MODELS.some(m => m.id === selectedModel);
      if (!currentIsImage) setSelectedModel(LOCAL_IMAGE_MODELS[0]?.id || "nano-banana");
    } else {
      const currentIsVideo = LOCAL_VIDEO_MODELS.some(m => m.id === selectedModel);
      if (!currentIsVideo) setSelectedModel(LOCAL_VIDEO_MODELS[0]?.id || "kling-2.6-pro");
    }
  }, [mode, selectedModel]);

  // Ratio Icon Helper
  const getRatioIcon = (ratio: string) => {
    switch (ratio) {
      case "1:1": return <Square className="w-3.5 h-3.5" />;
      case "16:9":
      case "21:9":
      case "4:3":
      case "3:2":
      case "5:4": return <RectangleHorizontal className="w-4 h-3" />;
      case "9:16":
      case "3:4":
      case "4:5":
      case "2:3": return <RectangleVertical className="w-3 h-4" />;
      case "auto": return <Wand2 className="w-3.5 h-3.5" />;
      default: return <HelpCircle className="w-3.5 h-3.5" />;
    }
  };

  const handleNavigation = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages.length, isLoading]);

  // Aggressively maintain input focus
  useEffect(() => {
    const interval = setInterval(() => {
      if (inputRef.current &&
        document.activeElement !== inputRef.current &&
        document.activeElement?.tagName !== 'BUTTON' &&
        !isLoading) {
        inputRef.current.focus();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    if (!isAuthenticated) {
      if (guestMessageCount >= GUEST_MESSAGE_LIMIT) {
        const limitMessage: Message = {
          id: `limit-${Date.now()}`,
          role: "assistant",
          content: "You've reached the message limit for guest users. Please sign up to continue chatting! 🚀",
          timestamp: new Date(),
          components: [{ type: "auth", props: { type: "both" } }],
        };
        setMessages((prev) => [...prev, limitMessage]);
        return;
      }
      setGuestMessageCount((prev) => prev + 1);
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      let responseText = "";

      if (copilotChat && copilotChat.appendMessage) {
        try {
          await copilotChat.appendMessage({
            role: "user",
            content: text.trim(),
          });
        } catch (e) {
          console.log("CopilotKit not fully initialized, using direct API");
        }
      }

      const userInfo = getUserInfo();

      const response = await fetch(`${API_URL}/api/akito/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text.trim(),
          current_page: location.pathname,
          is_authenticated: isAuthenticated,
          message_history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          user_id: userInfo.user_id,
          user_role: userInfo.user_role,
          user_name: userInfo.user_name,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      responseText = data.response;

      const navigationMatch = responseText.match(/\[\[navigate_now:([^\]]+)\]\]/);
      if (navigationMatch) {
        const path = navigationMatch[1];
        responseText = responseText.replace(/\[\[navigate_now:[^\]]+\]\]/, "");
        setTimeout(() => handleNavigation(path), 500);
      }

      const { text: cleanText, components } = parseGenerativeUI(responseText);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: cleanText,
        timestamp: new Date(),
        components: components.length > 0 ? components : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#101112] text-white relative font-sans overflow-hidden">

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto scroll-smooth w-full pb-32 scrollbar-hide">
        {messages.length <= 1 ? (
          /* HERO SECTION (Empty State) */
          <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-6 -mt-20">
            <div className="relative">
              <div className="relative w-24 h-24 bg-gradient-to-tr from-[#1A1A1A] to-[#2A2A2A] rounded-3xl border border-white/10 flex items-center justify-center shadow-2xl rotate-3 transform hover:rotate-6 transition-transform duration-500">
                <Wand2 className="w-12 h-12 text-[#d1fe17]" />
              </div>
              <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-[#2A2A2A] rounded-2xl border border-white/10 flex items-center justify-center shadow-xl -rotate-6 transform hover:-rotate-12 transition-transform duration-500">
                <Bot className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="space-y-2 relative z-10">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">
                PictureMe <span className="text-[#D1F349]">Assist</span>
              </h1>
              <p className="text-zinc-500 font-medium max-w-md mx-auto text-lg">
                Your professional AI partner for event setup, image generation, and troubleshooting.
              </p>
            </div>
          </div>
        ) : (
          /* ACTIVE CHAT LIST */
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1 rounded-full bg-[#D1F349]/10 text-[#D1F349] border border-[#D1F349]/20">
                    <Wand2 className="w-4 h-4 fill-current" />
                  </div>
                )}

                <div className={cn(
                  "max-w-[85%] px-6 py-4 rounded-3xl text-[15px] leading-relaxed",
                  message.role === "user"
                    ? "bg-[#2A2A2A] text-white rounded-tr-sm border border-white/5"
                    : "bg-transparent text-zinc-300 pl-0"
                )}>
                  {message.role === "user" ? (
                    <p className="whitespace-pre-wrap font-medium">{message.content}</p>
                  ) : (
                    <div className="prose prose-invert max-w-none prose-p:text-zinc-300 prose-headings:text-white prose-strong:text-white prose-code:text-[#D1F349]">
                      <AssistantMarkdown content={message.content} />

                      {message.components && message.components.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {message.components.map((component, idx) => (
                            <RenderGenerativeUI key={idx} component={component} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4 justify-start animate-in fade-in duration-300">
                <div className="h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1 rounded-full bg-[#D1F349]/10 text-[#D1F349] border border-[#D1F349]/20">
                  <Wand2 className="w-4 h-4 fill-current animate-pulse" />
                </div>
                <div className="flex items-center space-x-1.5 h-8 bg-card/50 px-4 rounded-full border border-white/5">
                  <div className="w-1.5 h-1.5 bg-[#D1F349] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-[#D1F349] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-[#D1F349] rounded-full animate-bounce"></div>
                </div>
              </div>
            )}

            <div ref={scrollRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Input Area (Floating at bottom) */}
      <div className="fixed bottom-[-15px] left-0 right-0 p-4 md:pb-10 flex justify-center z-50 pointer-events-auto">
        <div className="w-full max-w-6xl flex items-center gap-4">

          {/* Mode Switcher Sidebar */}
          <div
            className="flex flex-col w-[60px] h-[120px] p-1 rounded-[20px] shadow-[0_12px_8px_0_rgba(0,0,0,0.20),inset_0_0_0_1px_rgba(255,255,255,0.06)] shrink-0"
            style={{ background: 'var(--selector-bg)' }}
          >
            <div className="flex flex-col gap-1 h-full">
              <button
                onClick={() => setMode("image")}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 flex-1 rounded-2xl transition-all duration-300 group",
                  mode === "image" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {mode === "image" && (
                  <div className="absolute inset-0 bg-white/5 rounded-2xl -z-1" />
                )}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("transition-transform group-hover:scale-110", mode === "image" ? "text-[#d1fe17]" : "currentColor")}>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M3 4.75C3 3.7835 3.7835 3 4.75 3H19.25C20.2165 3 21 3.7835 21 4.75V19.25C21 20.2165 20.2165 21 19.25 21H4.75C3.7835 21 3 20.2165 3 19.25V4.75ZM4.75 4.5C4.61193 4.5 4.5 4.61193 4.5 4.75V14.4393L6.76256 12.1768C7.44598 11.4934 8.55402 11.4934 9.23744 12.1768L16.5607 19.5H19.25C19.3881 19.5 19.5 19.3881 19.5 19.25V4.75C19.5 4.61193 19.3881 4.5 19.25 4.5H4.75ZM14.4393 19.5L8.17678 13.2374C8.07915 13.1398 7.92085 13.1398 7.82322 13.2374L4.5 16.5607V19.25C4.5 19.3881 4.61193 19.5 4.75 19.5H14.4393Z" fill="currentColor" />
                  <path d="M13.4255 8.53727C13.4738 8.51308 13.5131 8.47385 13.5373 8.42546L14.2764 6.94721C14.3685 6.76295 14.6315 6.76295 14.7236 6.94721L15.4627 8.42546C15.4869 8.47385 15.5262 8.51308 15.5745 8.53727L17.0528 9.27639C17.237 9.36852 17.237 9.63148 17.0528 9.72361L15.5745 10.4627C15.5262 10.4869 15.4869 10.5262 15.4627 10.5745L14.7236 12.0528C14.6315 12.237 14.3685 12.237 14.2764 12.0528L13.5373 10.5745C13.5131 10.5262 13.4738 10.4869 13.4255 10.4627L11.9472 9.72361C11.763 9.63148 11.763 9.36852 11.9472 9.27639L13.4255 8.53727Z" fill="currentColor" />
                </svg>
                <span className="text-[10px] font-bold">Image</span>
              </button>
              <button
                onClick={() => setMode("video")}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 flex-1 rounded-2xl transition-all duration-300 group",
                  mode === "video" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {mode === "video" && (
                  <div className="absolute inset-0 bg-white/5 rounded-2xl -z-1" />
                )}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("transition-transform group-hover:scale-110", mode === "video" ? "text-[#d1fe17]" : "currentColor")}>
                  <path d="M2.75 5.75C2.75 5.19771 3.19772 4.75 3.75 4.75H14.25C14.8023 4.75 15.25 5.19772 15.25 5.75V18.25C15.25 18.8023 14.8023 19.25 14.25 19.25H3.75C3.19772 19.25 2.75 18.8023 2.75 18.25V5.75Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                  <path d="M15.25 10L20.5264 7.3618C20.8588 7.19558 21.25 7.43733 21.25 7.80902V16.191C21.25 16.5627 20.8588 16.8044 20.5264 16.6382L15.25 14V10Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                </svg>
                <span className="text-[10px] font-bold">Video</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="premium-panel rounded-[2.5rem] p-2 relative group focus-within:ring-2 focus-within:ring-[#d1fe17]/20 transition-all duration-500">

              {/* Main Interaction Area */}
              <div className="flex gap-3 p-2">

                {/* Plus / Upload Button */}
                <button className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#1c1c1f] text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors shrink-0 mt-1">
                  <Plus className="w-5 h-5" />
                </button>

                <div className="flex-1 flex flex-col justify-center min-h-[56px]">
                  <textarea
                    ref={inputRef as any}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown as any}
                    placeholder={mode === 'image' ? "Describe the scene you imagine..." : "Describe the video you want to generate..."}
                    className="w-full bg-transparent border-none outline-none text-white placeholder:text-zinc-600 resize-none py-3 focus:ring-0 text-[16px] leading-relaxed max-h-32 scrollbar-hide"
                    rows={1}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                {/* Action Buttons Group */}
                <div className="flex gap-2 shrink-0 items-center">
                  {mode === "video" && (
                    <>
                      <button className="w-20 h-20 rounded-2xl bg-[#1c1c1f] border border-white/5 flex flex-col items-center justify-center gap-1 hover:border-white/20 transition-all group overflow-hidden relative shadow-sm active:scale-95">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                        <Plus className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center px-1 leading-tight group-hover:text-zinc-300">Start<br />Frame</span>
                      </button>
                      <button className="w-20 h-20 rounded-2xl bg-[#1c1c1f] border border-white/5 flex flex-col items-center justify-center gap-1 hover:border-white/20 transition-all group overflow-hidden relative shadow-sm active:scale-95">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                        <Plus className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center px-1 leading-tight group-hover:text-zinc-300">End<br />Frame</span>
                      </button>
                    </>
                  )}

                  {/* Send Button */}
                  <Button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading}
                    className={cn(
                      "transition-all duration-300 flex items-center justify-center gap-1.5 uppercase tracking-tight shrink-0 overflow-hidden relative group font-black h-20 w-32 rounded-2xl",
                      "bg-[#d1fe17] text-black shadow-[0_4px_15px_rgba(209,254,23,0.35)] hover:bg-[#bce615] hover:scale-[1.02] active:scale-[0.98]"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <span className="text-[14px] lowercase tracking-tight">send</span>
                        <Wand2 className="w-3.5 h-3.5 fill-black" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Tools Row */}
              <div className="flex items-center gap-2 px-2 pb-2 mt-1">

                {/* Model Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-[13px] font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-all group">
                      <div className="w-5 h-5 rounded-lg bg-[#d1fe17] flex items-center justify-center text-[10px] text-black font-black shadow-[0_0_10px_rgba(209,254,23,0.3)] group-hover:shadow-[0_0_15px_rgba(209,254,23,0.5)] transition-all">
                        {mode === 'image' ? 'G' : 'K'}
                      </div>
                      <span className="truncate max-w-[130px] font-semibold tracking-tight">
                        {mode === 'image'
                          ? LOCAL_IMAGE_MODELS.find(m => m.id === selectedModel)?.name || "Select Model"
                          : LOCAL_VIDEO_MODELS.find(m => m.id === selectedModel)?.name || "Select Model"
                        }
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[300px] bg-[#101112]/95 backdrop-blur-2xl border-white/10 p-2 rounded-[1.5rem] shadow-2xl">
                    <DropdownMenuLabel className="text-[10px] text-zinc-500 uppercase tracking-widest px-3 py-3 font-black">Generation Models</DropdownMenuLabel>
                    <div className="space-y-1">
                      {(mode === 'image' ? LOCAL_IMAGE_MODELS : LOCAL_VIDEO_MODELS).map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onClick={() => setSelectedModel(model.id)}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors focus:bg-white/10",
                            selectedModel === model.id && "bg-white/5"
                          )}
                        >
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400">
                            {model.type === 'video' ? <VideoIcon className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                          </div>
                          <div className="flex flex-col gap-0.5 flex-1">
                            <span className="font-bold text-[13px] text-white">{model.name}</span>
                            <span className="text-[10px] text-zinc-500 leading-tight line-clamp-2">{model.description}</span>
                          </div>
                          {selectedModel === model.id && <Check className="w-4 h-4 text-[#D1F349]" />}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {mode === "image" ? (
                  <>
                    {/* Aspect Ratio */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-[13px] font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-all">
                          {getRatioIcon(aspectRatio)}
                          {aspectRatio}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56 bg-[#101112]/95 backdrop-blur-2xl border-white/10 p-2 rounded-[1.2rem] shadow-2xl">
                        <DropdownMenuLabel className="text-[11px] text-zinc-500 font-bold px-3 py-2">Aspect ratio</DropdownMenuLabel>
                        <div className="space-y-0.5">
                          {["auto", "1:1", "4:3", "16:9", "21:9", "5:4", "3:2", "2:3", "9:16", "3:4", "4:5"].map((ratio) => (
                            <DropdownMenuItem
                              key={ratio}
                              onClick={() => setAspectRatio(ratio as any)}
                              className={cn(
                                "flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors focus:bg-white/10",
                                aspectRatio === ratio && "bg-white/10"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-5 flex justify-center text-zinc-400">{getRatioIcon(ratio)}</div>
                                <span className="text-[13px] font-medium text-white capitalize">{ratio}</span>
                              </div>
                              {aspectRatio === ratio && <Check className="w-3.5 h-3.5 text-[#D1F349]" />}
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <>
                    {/* Duration */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-bold text-zinc-300 hover:text-white transition-colors">
                          <Clock className="w-4 h-4 text-cyan-400" />
                          {videoDuration}s
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-36 bg-[#101112]/95 backdrop-blur-2xl border-white/10 p-2 rounded-xl shadow-2xl">
                        {[5, 10, 15].map((d) => (
                          <DropdownMenuItem
                            key={d}
                            onClick={() => setVideoDuration(d)}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors focus:bg-white/10",
                              videoDuration === d && "bg-white/10 text-white"
                            )}
                          >
                            <span className="text-sm font-medium">{d}s</span>
                            {videoDuration === d && <Check className="w-3.5 h-3.5 text-[#D1F349]" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Audio Toggle next to duration */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setAudioEnabled(!audioEnabled)}
                            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/5 text-zinc-300 hover:text-white transition-all"
                          >
                            {audioEnabled ? <Volume2 className="w-4 h-4 text-green-400" /> : <VolumeX className="w-4 h-4 text-red-500" />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-card border-white/10 text-white font-bold text-xs py-2 px-3 rounded-xl">
                          Audio {audioEnabled ? "On" : "Off"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
              </div>

            </div>

            <p className="text-center text-[9px] text-zinc-700 mt-4 font-black tracking-[0.2em] uppercase">
              PictureMe AI Agent • Creative Engine v2.4.5
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
