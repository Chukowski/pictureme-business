import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  Sparkles,
  ArrowUp,
  Bot,
  Plus,
  ChevronRight,
  Ratio,
  Pencil
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ENV } from "@/config/env";
import AssistantMarkdown from "@/components/assistant/AssistantMarkdown";
import {
  parseGenerativeUI,
  RenderGenerativeUI,
  type GenerativeUIComponent
} from "@/components/assistant/AssistantGenerativeUI";

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

  const handleNavigation = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

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
    <div className="flex flex-col h-[calc(100vh-64px)] bg-black text-white relative font-sans overflow-hidden">

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scroll-smooth w-full pb-32 scrollbar-hide">
        {messages.length <= 1 ? (
          /* HERO SECTION (Empty State) */
          <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-6 -mt-20">
            <div className="relative">
              <div className="absolute inset-0 bg-[#D1F349]/20 blur-3xl rounded-full" />
              <div className="relative w-24 h-24 bg-gradient-to-tr from-[#1A1A1A] to-[#2A2A2A] rounded-3xl border border-white/10 flex items-center justify-center shadow-2xl rotate-3 transform hover:rotate-6 transition-transform duration-500">
                <Sparkles className="w-12 h-12 text-[#D1F349]" />
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
                    <Sparkles className="w-4 h-4 fill-current" />
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
                  <Sparkles className="w-4 h-4 fill-current animate-pulse" />
                </div>
                <div className="flex items-center space-x-1.5 h-8 bg-zinc-900/50 px-4 rounded-full border border-white/5">
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
      <div className="fixed bottom-[-25px] left-0 right-0 p-4 md:pb-8 flex justify-center z-50 pointer-events-none bg-gradient-to-t from-black via-black/90 to-transparent backdrop-blur-[2px]">
        <div className="w-full max-w-3xl pointer-events-auto">
          <div className="bg-[#18181b] rounded-[2rem] border border-white/10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] p-3 relative group focus-within:border-white/20 transition-all duration-300">

            {/* Input Row */}
            <div className="flex items-center gap-3">
              {/* Accessory Button */}
              <button className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors shrink-0">
                <Plus className="w-5 h-5" />
              </button>

              {/* TextArea */}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={messages.length <= 1 ? "Describe what you need help with..." : "Ask a follow-up..."}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-zinc-500 h-12 focus:ring-0 text-[16px] px-2"
                disabled={isLoading}
                autoFocus
              />

              {/* Generate Button */}
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "h-12 px-6 rounded-xl font-bold transition-all shadow-lg shrink-0",
                  input.trim() && !isLoading
                    ? "bg-[#D1F349] text-black hover:bg-[#b0cc3d] shadow-[#D1F349]/20"
                    : "bg-zinc-800 text-zinc-500 hover:bg-zinc-800"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{messages.length <= 1 ? "Start" : "Send"}</span>
                    <ArrowUp className={cn("w-4 h-4", input.trim() ? "opacity-100" : "opacity-50")} />
                  </div>
                )}
              </Button>
            </div>

            {/* Bottom Tools Row (Visual Only for now) */}
            <div className="flex items-center gap-2 mt-2 pl-14 overflow-x-auto no-scrollbar pb-1">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors whitespace-nowrap">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                Assistant V2
                <ChevronRight className="w-3 h-3 opacity-50" />
              </button>

              <div className="w-px h-4 bg-white/10 mx-1" />

              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors whitespace-nowrap">
                <Ratio className="w-3 h-3" />
                Auto-detect
                <Plus className="w-3 h-3 opacity-50" />
              </button>

              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors whitespace-nowrap">
                <Pencil className="w-3 h-3" />
                Draw Context
              </button>
            </div>

          </div>

          <p className="text-center text-[10px] text-zinc-600 mt-4 font-medium tracking-wide">
            PICTUREME AI ENGINE • V2.4.0
          </p>
        </div>
      </div>
    </div>
  );
}
