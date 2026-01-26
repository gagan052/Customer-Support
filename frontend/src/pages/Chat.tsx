import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { QuickReplies } from "@/components/chat/QuickReplies";
import { useAIChat } from "@/hooks/useAIChat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Quick replies for common user actions
const quickReplies = [
  "How do I reset my password?",
  "I need help with my bill",
  "Something isn't working",
  "I have a feature suggestion",
  "I want to request a refund",
];

export default function ChatPage() {
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Use the AI-powered chat hook
  const { 
    messages, 
    isTyping, 
    sendMessage, 
    initializeChat 
  } = useAIChat({
    persistMessages: true,
    onEscalate: () => {
      console.log("[Chat] Escalation triggered");
    },
    onResolve: () => {
      console.log("[Chat] Issue resolved");
    },
  });

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from("user_profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
        
      return data;
    }
  });

  // Initialize chat on mount
  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (content: string) => {
    setShowQuickReplies(false);
    await sendMessage(content);
  };

  const handleEscalate = () => {
    toast.info("Connecting to human agent...", {
      description: "Please wait while we connect you.",
    });
  };

  return (
    <MainLayout>
      <div className="h-screen flex flex-col">
        <ChatHeader onEscalate={handleEscalate} />
        
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="py-4 space-y-1">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <MessageBubble 
                  key={message.id} 
                  message={message} 
                  userName={userProfile?.display_name || "Guest"}
                />
              ))}
            </AnimatePresence>
            
            <AnimatePresence>
              {isTyping && <TypingIndicator />}
            </AnimatePresence>
          </div>
        </ScrollArea>

        <AnimatePresence>
          {showQuickReplies && messages.length === 1 && (
            <QuickReplies replies={quickReplies} onSelect={handleSendMessage} />
          )}
        </AnimatePresence>

        <ChatInput onSend={handleSendMessage} disabled={isTyping} />
      </div>
    </MainLayout>
  );
}
