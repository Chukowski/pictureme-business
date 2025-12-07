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
  Bot
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ENV } from "@/config/env";
import { AkitoMarkdown } from "@/components/akito/AkitoMarkdown";
import { 
  parseGenerativeUI, 
  RenderGenerativeUI,
  type GenerativeUIComponent 
} from "@/components/akito/AkitoGenerativeUI";

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
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    <div className="flex flex-col h-[calc(100vh-64px)] bg-black text-white relative">
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scroll-smooth w-full">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-4",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1 rounded-full bg-[#19c37d]/10 text-[#19c37d] overflow-hidden">
                   <Sparkles className="w-5 h-5 fill-current" />
                </div>
              )}
              
              <div className={cn(
                "max-w-[85%] space-y-2",
                 message.role === "user" ? "bg-zinc-800 rounded-2xl px-5 py-3" : "" 
              )}>
                {message.role === "user" ? (
                   <p className="text-white whitespace-pre-wrap">{message.content}</p>
                ) : (
                   <div className="text-zinc-100 leading-7">
                      <AkitoMarkdown content={message.content} />
                      
                      {/* Generative UI Components */}
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
            <div className="flex gap-4 justify-start">
              <div className="h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1 rounded-full bg-[#19c37d]/10 text-[#19c37d]">
                <Sparkles className="w-5 h-5 fill-current animate-pulse" />
              </div>
              <div className="flex items-center">
                 <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s] mr-1"></div>
                 <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s] mr-1"></div>
                 <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
          
          {/* Spacer for bottom input */}
          <div className="h-32"></div>
        </div>
      </div>

      {/* Input Area (Floating at bottom) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black to-transparent pt-10 pb-6 z-10">
        <div className="max-w-3xl mx-auto relative">
            <div className="relative bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden focus-within:border-white/20 transition-colors">
                <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Send a message..."
                    className="w-full bg-transparent border-0 text-white placeholder:text-zinc-500 h-14 pl-4 pr-12 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                    disabled={isLoading}
                    autoFocus
                />
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Button
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim() || isLoading}
                        size="icon"
                        className={cn(
                            "h-9 w-9 rounded-lg transition-all",
                            input.trim() 
                                ? "bg-white text-black hover:bg-zinc-200" 
                                : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                        )}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <ArrowUp className="h-5 w-5" />
                        )}
                    </Button>
                </div>
            </div>
            
            <div className="text-center mt-3">
                 <p className="text-xs text-zinc-500">PictureMe Assist can make mistakes. Consider checking important information.</p>
            </div>
        </div>
      </div>
    </div>
  );
}