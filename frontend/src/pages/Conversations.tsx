import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Filter,
  MessageSquare,
  Clock,
  Star,
  MoreVertical
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

export default function ConversationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "resolved" | "pending" | "escalated">("all");

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id,
          status,
          avg_confidence,
          sentiment,
          updated_at,
          user_profiles (
            display_name,
            email
          ),
          messages (
            content,
            created_at,
            role
          )
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return data.map((conv: any) => {
        const profile = Array.isArray(conv.user_profiles)
          ? conv.user_profiles[0]
          : conv.user_profiles;

        const userName =
          profile?.display_name ||
          profile?.email ||
          "Guest User";
          
        const userEmail = profile?.email || "";

        // Get last message logic
        const messages = conv.messages || [];
        // Sort by created_at desc to find latest
        const sortedMessages = [...messages].sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastMessage = sortedMessages[0]?.content || "No messages";

        return {
          id: conv.id,
          user: userName,
          email: userEmail,
          lastMessage: lastMessage,
          status: conv.status,
          confidence: conv.avg_confidence || 0,
          sentiment: conv.sentiment || "neutral",
          messages: messages.length,
          duration: formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true }),
          time: new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          rating: conv.rating, 
        };
      });
    }
  });

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || conv.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Conversations</h1>
            <p className="text-muted-foreground">All customer interactions</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="resolved" className="px-3 py-1">
              {conversations.filter(c => c.status === "resolved").length} Resolved
            </Badge>
            <Badge variant="pending" className="px-3 py-1">
              {conversations.filter(c => c.status === "pending").length} Pending
            </Badge>
            <Badge variant="escalated" className="px-3 py-1">
              {conversations.filter(c => c.status === "escalated").length} Escalated
            </Badge>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "resolved", "pending", "escalated"] as const).map(f => (
              <Button
                key={f}
                variant={filter === f ? "accent" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        {/* Conversations List */}
        <Card className="glass-card">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filteredConversations.map((conv, index) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-secondary/30 transition-colors cursor-pointer flex items-center gap-4"
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    conv.sentiment === "positive" ? "bg-success/20" :
                    conv.sentiment === "negative" ? "bg-destructive/20" : "bg-secondary"
                  }`}>
                    <span className={`text-sm font-medium ${
                      conv.sentiment === "positive" ? "text-success" :
                      conv.sentiment === "negative" ? "text-destructive" : "text-muted-foreground"
                    }`}>
                      {conv.user.split(" ").map(n => n[0]).join("")}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm">{conv.user}</h3>
                      <Badge 
                        variant={conv.status as any}
                        className="text-[10px]"
                      >
                        {conv.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {conv.messages} messages
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {conv.duration}
                      </span>
                      {conv.rating && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-warning fill-warning" />
                          {conv.rating}/5
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-bold ${
                      conv.confidence >= 0.85 ? "text-success" :
                      conv.confidence >= 0.6 ? "text-warning" : "text-destructive"
                    }`}>
                      {Math.round(conv.confidence * 100)}%
                    </p>
                    <p className="text-xs text-muted-foreground">{conv.time}</p>
                  </div>

                  {/* Actions */}
                  <Button variant="ghost" size="icon-sm" className="flex-shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
