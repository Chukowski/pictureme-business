import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Mail, 
  MessageSquare, 
  Book, 
  LifeBuoy, 
  ExternalLink, 
  Send,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";

export default function CreatorSupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSending(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success("Message sent! We'll get back to you shortly.");
    setSubject("");
    setMessage("");
    setIsSending(false);
  };

  return (
    <div className="p-6 md:p-8 min-h-[calc(100vh-64px)]">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Support & Community</h1>
          <p className="text-zinc-400">Get help, find answers, and connect with other creators.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card className="bg-card/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                Contact Support
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Have an issue or question? Send us a message.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">Subject</Label>
                  <Input 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of the issue"
                    className="bg-[#101112]/50 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Message</Label>
                  <Textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue in detail..."
                    className="bg-[#101112]/50 border-white/10 text-white min-h-[150px]"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={isSending}
                >
                  {isSending ? "Sending..." : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" /> Send Message
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Resources */}
          <div className="space-y-6">
            <Card className="bg-card/50 border-white/10 hover:border-indigo-500/30 transition-colors cursor-pointer" onClick={() => window.open('https://discord.gg/pictureme', '_blank')}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">Join Discord Community</h3>
                  <p className="text-sm text-zinc-400">Connect with other creators and get live help.</p>
                </div>
                <ExternalLink className="w-5 h-5 text-zinc-500" />
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-white/10 hover:border-emerald-500/30 transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Book className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">Documentation</h3>
                  <p className="text-sm text-zinc-400">Read guides, tutorials, and API docs.</p>
                </div>
                <ExternalLink className="w-5 h-5 text-zinc-500" />
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-white/10 hover:border-amber-500/30 transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">FAQ & Knowledge Base</h3>
                  <p className="text-sm text-zinc-400">Find answers to common questions.</p>
                </div>
                <ExternalLink className="w-5 h-5 text-zinc-500" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

