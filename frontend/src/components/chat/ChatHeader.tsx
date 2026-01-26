import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Phone, MoreVertical, Zap } from "lucide-react";

interface ChatHeaderProps {
  agentName?: string;
  status?: "online" | "busy" | "offline";
  onEscalate?: () => void;
}

export function ChatHeader({ 
  agentName = "AI Support Agent", 
  status = "online",
  onEscalate 
}: ChatHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-border bg-card/80 backdrop-blur-lg flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center animate-pulse-glow">
            <Bot className="w-5 h-5 text-accent" />
          </div>
          <div 
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
              status === "online" ? "bg-success" :
              status === "busy" ? "bg-warning" : "bg-muted-foreground"
            }`}
          />
        </div>
        <div>
          <h2 className="font-semibold text-sm flex items-center gap-2">
            {agentName}
            <Zap className="w-3.5 h-3.5 text-accent" />
          </h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="capitalize">{status}</span>
            <span>•</span>
            <span>Powered by RAG + Decision Engine</span>
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {onEscalate && (
          <Button variant="outline" size="sm" onClick={onEscalate} className="text-xs">
            <Phone className="w-3.5 h-3.5 mr-1.5" />
            Talk to Human
          </Button>
        )}
        <Button variant="ghost" size="icon-sm">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
