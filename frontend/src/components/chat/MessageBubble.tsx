import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Bot, User, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import * as React from "react";

export interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
  confidence?: number;
  intent?: string;
  sentiment?: "positive" | "neutral" | "negative";
  isEscalated?: boolean;
  isResolved?: boolean;
  action?: string;
}

interface MessageBubbleProps {
  message: Message;
  showMeta?: boolean;
  userName?: string;
}

export const MessageBubble = React.forwardRef<HTMLDivElement, MessageBubbleProps>(function MessageBubble(
  { message, showMeta = true, userName }: MessageBubbleProps,
  ref
) {
  const isAgent = message.role === "agent";

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.85) return { variant: "confidence-high" as const, label: "High Confidence" };
    if (confidence >= 0.6) return { variant: "confidence-medium" as const, label: "Medium" };
    return { variant: "confidence-low" as const, label: "Low Confidence" };
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "flex gap-3 px-4 py-2",
        isAgent ? "justify-start" : "justify-end"
      )}
    >
      {isAgent && (
        <div className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-accent" />
          </div>
        </div>
      )}

      <div className={cn("max-w-[75%] space-y-2", !isAgent && "order-first")}>
        <div
          className={cn(
            "px-4 py-3 text-sm",
            isAgent ? "agent-bubble" : "user-bubble"
          )}
        >
          {message.content}
        </div>

        {showMeta && isAgent && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            {message.confidence !== undefined && (
              <Badge variant={getConfidenceBadge(message.confidence).variant} className="text-[10px]">
                {Math.round(message.confidence * 100)}% {getConfidenceBadge(message.confidence).label}
              </Badge>
            )}
            {message.intent && (
              <Badge variant="intent" className="text-[10px]">
                {message.intent}
              </Badge>
            )}
            {message.sentiment && (
              <Badge variant={message.sentiment} className="text-[10px]">
                {message.sentiment}
              </Badge>
            )}
            {message.isEscalated && (
              <Badge variant="escalated" className="text-[10px] flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Escalated
              </Badge>
            )}
            {message.isResolved && (
              <Badge variant="resolved" className="text-[10px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Resolved
              </Badge>
            )}
          </div>
        )}

        <div className={cn("text-[10px] text-muted-foreground px-1", !isAgent && "text-right")}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {!isAgent && (
        <div className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      )}
    </motion.div>
  );
});
