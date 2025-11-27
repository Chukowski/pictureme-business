/**
 * Akito Widget - AI Assistant for PictureMe.Now
 * 
 * A toggleable floating widget that provides AI-powered assistance:
 * - Navigation help
 * - Prompt creation and enhancement
 * - Feature explanations
 * - Event setup guidance
 * 
 * Integrates with CopilotKit for advanced features while maintaining custom branding.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  X,
  Send,
  Loader2,
  Sparkles,
  Minimize2,
  Maximize2,
  Expand,
  Shrink,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ENV } from "@/config/env";

// Akito components
import { AkitoMarkdown } from "./akito/AkitoMarkdown";
import { 
  parseGenerativeUI, 
  RenderGenerativeUI,
  type GenerativeUIComponent 
} from "./akito/AkitoGenerativeUI";

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
  components?: GenerativeUIComponent[]; // Generative UI components
}

interface AkitoWidgetProps {
  className?: string;
  defaultOpen?: boolean;
}

// Constants
const GUEST_MESSAGE_LIMIT = 5; // Max messages for unauthenticated users
const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "¡Hola! 👋 Soy Akito, tu asistente AI para PictureMe.Now. ¿En qué puedo ayudarte hoy?",
  timestamp: new Date(),
};

export function AkitoWidget({ className, defaultOpen = false }: AkitoWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // Full-screen mode
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Try to use CopilotKit chat if available
  const copilotChat = useCopilotChat ? useCopilotChat() : null;

  // Get user info from localStorage - more robust check
  const getUserInfo = useCallback(() => {
    try {
      // Check multiple sources for auth
      const userStr = localStorage.getItem("user");
      const authToken = localStorage.getItem("auth_token");
      
      if (userStr && authToken) {
        const user = JSON.parse(userStr);
        // Validate user object has required fields
        if (user && (user.id || user.email)) {
          // Extract display name - prioritize full_name, then username, then email
          let displayName = null;
          if (user.full_name && user.full_name.trim()) {
            displayName = user.full_name.trim();
          } else if (user.username && user.username.trim()) {
            displayName = user.username.trim();
          } else if (user.name && user.name.trim()) {
            // Better Auth might use 'name' field
            displayName = user.name.trim();
          } else if (user.email) {
            // Fallback to email, extract name part
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

  // Reset chat function - takes auth state as parameter to avoid stale closure
  const resetChatWithAuth = useCallback((authenticated: boolean, userName?: string | null) => {
    // Extract first name only (before space or @)
    let firstName = userName;
    if (userName) {
      if (userName.includes(' ')) {
        firstName = userName.split(' ')[0];
      } else if (userName.includes('@')) {
        firstName = userName.split('@')[0];
      }
    }
    
    const welcomeMsg = authenticated 
      ? `¡Hola${firstName ? ` ${firstName}` : ''}! 👋 Soy Akito, tu asistente AI. ¿En qué puedo ayudarte hoy?`
      : "¡Hola! 👋 Soy Akito. Puedo ayudarte a conocer PictureMe.Now y sus planes. ¿Qué te gustaría saber?";
    
    console.log("🔄 Resetting chat, authenticated:", authenticated);
    setMessages([{ 
      ...WELCOME_MESSAGE, 
      id: `welcome-${Date.now()}`, 
      content: welcomeMsg,
      timestamp: new Date() 
    }]);
    setSuggestions([]);
  }, []);

  // Watch for auth changes (login/logout)
  useEffect(() => {
    const checkAuthChange = () => {
      const userInfo = getUserInfo();
      const newUserId = userInfo.user_id;
      const nowAuthenticated = userInfo.isValid;
      
      // Detect auth state change
      const authChanged = isAuthenticated !== nowAuthenticated;
      const userChanged = currentUserId !== null && currentUserId !== newUserId;
      
      if (authChanged || userChanged) {
        console.log("🔄 Auth changed:", { 
          wasAuthenticated: isAuthenticated, 
          nowAuthenticated, 
          oldUser: currentUserId, 
          newUser: newUserId 
        });
        
        // Update states
        setIsAuthenticated(nowAuthenticated);
        setCurrentUserId(newUserId);
        
        // Reset chat with new auth state
        resetChatWithAuth(nowAuthenticated, userInfo.user_name);
        
        // Reset guest message count when logging in
        if (nowAuthenticated) {
          setGuestMessageCount(0);
        }
      } else if (currentUserId === null && newUserId !== null) {
        // Initial login detection
        console.log("🔐 Initial auth detected:", newUserId);
        setIsAuthenticated(nowAuthenticated);
        setCurrentUserId(newUserId);
        resetChatWithAuth(nowAuthenticated, userInfo.user_name);
        setGuestMessageCount(0);
      }
    };

    // Check immediately
    checkAuthChange();

    // Listen for storage changes (including custom events from logout)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user" || e.key === "auth_token" || e.key === null) {
        console.log("📦 Storage changed:", e.key);
        setTimeout(checkAuthChange, 100); // Small delay to ensure storage is updated
      }
    };

    // Check more frequently for faster detection
    const interval = setInterval(checkAuthChange, 500);

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [currentUserId, getUserInfo, isAuthenticated, resetChatWithAuth]);

  // Alias for manual reset
  const resetChat = useCallback(() => {
    const userInfo = getUserInfo();
    resetChatWithAuth(userInfo.isValid, userInfo.user_name);
    
    setMessages([{ 
      ...WELCOME_MESSAGE, 
      id: `welcome-${Date.now()}`, 
      content: welcomeMsg,
      timestamp: new Date() 
    }]);
    setSuggestions([]);
  }, [isAuthenticated]);

  // Check if guest has reached message limit
  const isGuestLimitReached = !isAuthenticated && guestMessageCount >= GUEST_MESSAGE_LIMIT;

  // Navigate function that Akito can trigger
  const handleNavigation = useCallback((path: string) => {
    console.log("🧭 Akito navigating to:", path);
    navigate(path);
  }, [navigate]);

  // Load contextual suggestions
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/akito/suggestions?current_page=${encodeURIComponent(location.pathname)}`
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (error) {
        console.error("Failed to load suggestions:", error);
        // Fallback suggestions
        setSuggestions([
          "¿Cómo creo un evento?",
          "Ayúdame con un prompt",
          "¿Qué modelos de AI están disponibles?",
        ]);
      }
    };
    
    if (isOpen) {
      loadSuggestions();
    }
  }, [isOpen, location.pathname]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Check guest message limit
    if (!isAuthenticated) {
      if (guestMessageCount >= GUEST_MESSAGE_LIMIT) {
        // Show limit reached message
        const limitMessage: Message = {
          id: `limit-${Date.now()}`,
          role: "assistant",
          content: "Has alcanzado el límite de mensajes para usuarios no registrados. ¡Crea una cuenta gratuita para seguir conversando conmigo! 🚀",
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
      
      // Try CopilotKit first if available
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
      
      // Get fresh user info
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
          message_history: messages.slice(-10).map((m) => ({ // Only last 10 messages
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
      
      // Check for navigation commands in response
      const navigationMatch = responseText.match(/\[\[navigate_now:([^\]]+)\]\]/);
      if (navigationMatch) {
        const path = navigationMatch[1];
        responseText = responseText.replace(/\[\[navigate_now:[^\]]+\]\]/, "");
        // Navigate after a short delay to let the message appear
        setTimeout(() => handleNavigation(path), 500);
      }
      
      // Parse for generative UI components
      const { text: cleanText, components } = parseGenerativeUI(responseText);
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: cleanText,
        timestamp: new Date(),
        components: components.length > 0 ? components : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Update suggestions if provided
      if (data.suggestions?.length > 0) {
        setSuggestions(data.suggestions);
      }

      // Check for navigation commands in response
      handleNavigationCommands(cleanText);
      
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Lo siento, hubo un error. Por favor intenta de nuevo.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigationCommands = (response: string) => {
    // Check if response contains navigation suggestions
    const navPatterns = [
      { pattern: /navega(?:r)? a (\/.+?)(?:\s|$)/i, group: 1 },
      { pattern: /navigate to (\/.+?)(?:\s|$)/i, group: 1 },
      { pattern: /ir a (\/.+?)(?:\s|$)/i, group: 1 },
      { pattern: /go to (\/.+?)(?:\s|$)/i, group: 1 },
    ];

    for (const { pattern, group } of navPatterns) {
      const match = response.match(pattern);
      if (match && match[group]) {
        const path = match[group].trim();
        // Add navigation suggestion
        setSuggestions((prev) => [
          `Ir a ${path}`,
          ...prev.filter((s) => !s.startsWith("Ir a")),
        ]);
        break;
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Check if it's a navigation suggestion
    if (suggestion.startsWith("Ir a ") || suggestion.startsWith("Go to ")) {
      const path = suggestion.replace(/^(Ir a |Go to )/, "");
      if (path.startsWith("/")) {
        navigate(path);
        setMessages((prev) => [
          ...prev,
          {
            id: `nav-${Date.now()}`,
            role: "assistant",
            content: `Navegando a ${path}...`,
            timestamp: new Date(),
          },
        ]);
        return;
      }
    }
    
    // Otherwise send as message
    sendMessage(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    setHasUnread(false);
    if (!isOpen) {
      setIsMinimized(false);
    }
  };

  // Floating button when closed
  if (!isOpen) {
    return (
      <Button
        onClick={toggleOpen}
        className={cn(
          "fixed bottom-6 right-6 h-16 w-16 shadow-lg p-0 bg-transparent hover:bg-transparent",
          "text-white z-50 transition-all duration-300 hover:scale-110 hover:rotate-3",
          hasUnread && "animate-pulse",
          className
        )}
      >
        <img 
          src="/assets/akito-2d.png" 
          alt="Akito" 
          className="w-full h-full object-contain drop-shadow-xl"
        />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 animate-ping" />
        )}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 shadow-2xl transition-all duration-300 rounded-xl overflow-hidden",
        "bg-zinc-900/95 backdrop-blur-lg border border-white/10",
        "flex flex-col",
        isExpanded 
          ? "inset-4 sm:inset-8 md:inset-16 lg:inset-24" // Full screen with padding
          : isMinimized 
            ? "bottom-6 right-6 w-72 h-14" 
            : "bottom-6 right-6 w-96 h-[32rem]",
        className
      )}
    >
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 flex items-center justify-center">
            <img 
              src="/assets/akito-2d.png" 
              alt="Akito" 
              className="w-full h-full object-contain drop-shadow-md"
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Akito</h3>
            {!isMinimized && (
              <p className="text-xs text-zinc-400">Tu asistente AI</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Reset chat button */}
          {!isMinimized && messages.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10"
              onClick={resetChat}
              title="Reiniciar chat"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          {/* Expand/Shrink button */}
          {!isMinimized && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Reducir" : "Expandir"}
            >
              {isExpanded ? (
                <Shrink className="h-4 w-4" />
              ) : (
                <Expand className="h-4 w-4" />
              )}
            </Button>
          )}
          {/* Minimize button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10"
            onClick={() => {
              setIsMinimized(!isMinimized);
              if (!isMinimized) setIsExpanded(false);
            }}
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10"
            onClick={toggleOpen}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1">
                    <img 
                      src="/assets/akito-2d.png" 
                      alt="Akito" 
                      className="w-full h-full object-contain drop-shadow-sm"
                    />
                  </div>
                )}
                <div className="max-w-[85%] space-y-2">
                  {/* Message content with Markdown */}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2 text-sm",
                      message.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-md"
                        : "bg-zinc-800 text-zinc-200 rounded-bl-md"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <AkitoMarkdown content={message.content} />
                    ) : (
                      message.content
                    )}
                  </div>
                  
                  {/* Generative UI Components */}
                  {message.components && message.components.length > 0 && (
                    <div className="space-y-2 pl-0">
                      {message.components.map((component, idx) => (
                        <RenderGenerativeUI key={idx} component={component} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1">
                  <img 
                    src="/assets/akito-2d.png" 
                    alt="Akito" 
                    className="w-full h-full object-contain drop-shadow-sm"
                  />
                </div>
                <div className="bg-zinc-800 rounded-2xl rounded-bl-md px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="px-4 py-2 border-t border-white/5 flex-shrink-0">
              <div className="flex flex-wrap gap-1">
                {suggestions.slice(0, 3).map((suggestion, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="cursor-pointer text-xs border-white/10 text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-colors"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 border-t border-white/10 flex-shrink-0">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje..."
                className="flex-1 bg-zinc-800 border-white/10 text-white placeholder:text-zinc-500 focus:border-indigo-500"
                disabled={isLoading}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AkitoWidget;
