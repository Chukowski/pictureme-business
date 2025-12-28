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
    Pencil,
    Building2
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

const WELCOME_MESSAGE: Message = {
    id: "welcome",
    role: "assistant",
    content: "Welcome to **Business Assist**. I am your dedicated partner for enterprise-level operations. I can help you with:\n\n1. **Business Operations**: Manage your organization, staff, and multi-event workflows.\n2. **Advanced Event Meta**: Configure complex event logic, custom data capture, and API integrations.\n3. **Analytics & Growth**: Review performance metrics and optimize your photo booth business.\n4. **Technical Support**: Enterprise-grade troubleshooting for your stations.\n\nHow can I support your business growth today?",
    timestamp: new Date(),
};

export default function AdminChatPage() {
    const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(true); // Admin pages are usually authenticated

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
                        user_role: user.role || "business",
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

    useEffect(() => {
        const userInfo = getUserInfo();
        if (userInfo.user_id) {
            setCurrentUserId(userInfo.user_id);
        }
    }, [getUserInfo]);

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

            // For now, we use the same endpoint but eventually we can point to /api/akito/business-chat
            const response = await fetch(`${API_URL}/api/akito/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: text.trim(),
                    current_page: location.pathname,
                    is_authenticated: true,
                    agent_tier: "business", // Added flag for separate agent logic
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
        <div className="flex flex-col h-[calc(100vh-160px)] bg-[#101112] text-white relative font-sans overflow-hidden rounded-3xl shadow-2xl">

            {/* Messages Area */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto scroll-smooth w-full pb-32 scrollbar-hide">
                {messages.length <= 1 ? (
                    /* HERO SECTION (Empty State) */
                    <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                            <div className="relative w-24 h-24 bg-gradient-to-tr from-[#1A1A1A] to-[#2A2A2A] rounded-3xl border border-white/10 flex items-center justify-center shadow-2xl rotate-3 transform hover:rotate-6 transition-transform duration-500">
                                <Building2 className="w-12 h-12 text-blue-400" />
                            </div>
                            <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-[#2A2A2A] rounded-2xl border border-white/10 flex items-center justify-center shadow-xl -rotate-6 transform hover:-rotate-12 transition-transform duration-500">
                                <Sparkles className="w-6 h-6 text-[#D1F349]" />
                            </div>
                        </div>

                        <div className="space-y-2 relative z-10">
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">
                                Business <span className="text-blue-400">Assist</span>
                            </h1>
                            <p className="text-zinc-500 font-medium max-w-md mx-auto text-lg">
                                Your dedicated AI partner for organizational management and enterprise workflows.
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
                                    <div className="h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1 rounded-full bg-blue-500/10 text-blue-400">
                                        <Building2 className="w-4 h-4" />
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
                                <div className="h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    <Building2 className="w-4 h-4 animate-pulse" />
                                </div>
                                <div className="flex items-center space-x-1.5 h-8 bg-card/50 px-4 rounded-full border border-white/5">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        )}

                        <div ref={scrollRef} className="h-4" />
                    </div>
                )}
            </div>

            {/* Input Area (Pinned to bottom of container) */}
            <div className="absolute bottom-4 left-0 right-0 p-4 md:pb-8 flex justify-center z-50 bg-gradient-to-t from-[#101112] via-[#101112]/90 to-transparent backdrop-blur-[2px]">
                <div className="w-full max-w-3xl">
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
                                onBlur={(e) => {
                                    // Refocus if blur wasn't intentional (e.g., clicking send button)
                                    setTimeout(() => {
                                        if (document.activeElement?.tagName !== 'BUTTON') {
                                            inputRef.current?.focus();
                                        }
                                    }, 0);
                                }}
                                placeholder={messages.length <= 1 ? "How can I help with your business today?" : "Ask a follow-up..."}
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
                                        ? "bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/20"
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

                        {/* Bottom Tools Row */}
                        <div className="flex items-center gap-2 mt-2 pl-14 overflow-x-auto no-scrollbar pb-1">
                            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-white/5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors whitespace-nowrap">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                Business Agent V1
                                <ChevronRight className="w-3 h-3 opacity-50" />
                            </button>

                            <div className="w-px h-4 bg-white/10 mx-1" />

                            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-white/5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors whitespace-nowrap">
                                <Ratio className="w-3 h-3" />
                                Auto-detect
                                <Plus className="w-3 h-3 opacity-50" />
                            </button>

                            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-white/5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors whitespace-nowrap">
                                <Pencil className="w-3 h-3" />
                                Draw Context
                            </button>
                        </div>

                    </div>

                    <p className="text-center text-[10px] text-zinc-600 mt-4 font-medium tracking-wide">
                        PICTUREME AI ENGINE • BUSINESS EDITION • V1.0.0
                    </p>
                </div>
            </div>
        </div>
    );
}
