import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Clock, 
  MessageSquare,
  Phone,
  ArrowRight,
  Frown,
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

export default function EscalationsPage() {
  const { data: escalatedConversations = [], isLoading } = useQuery({
    queryKey: ["escalations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id,
          status,
          sentiment,
          avg_confidence,
          metadata,
          updated_at,
          user_profiles (
            display_name,
            email
          ),
          messages (
            role,
            content,
            created_at
          )
        `)
        .eq("status", "escalated")
        .order("updated_at", { ascending: false });

      if (error || !data) return [];

      return data.map((conv: any) => {
        const profile = Array.isArray(conv.user_profiles)
          ? conv.user_profiles[0]
          : conv.user_profiles;

        const userName =
          profile?.display_name ||
          profile?.email ||
          "Guest User";

        const userEmail = profile?.email || "";

        const messages = conv.messages || [];
        const lastUserMessage =
          messages
            .filter((m: any) => m.role === "user")
            .sort(
              (a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0] || messages[0];

        const confidence = conv.avg_confidence || 0;
        const sentiment = conv.sentiment || "neutral";

        const priority =
          sentiment === "negative" || confidence < 0.5 ? "high" : "medium";

        const waitTime = formatDistanceToNow(new Date(conv.updated_at), {
          addSuffix: true,
        });

        return {
          id: conv.id,
          user: {
            name: userName,
            email: userEmail,
          },
          reason:
            conv.metadata?.escalation_reason ||
            "Escalated by decision engine",
          preview: lastUserMessage?.content || "No recent message",
          confidence,
          sentiment,
          waitTime,
          priority,
          attempts: messages.length || 1,
        };
      });
    },
  });

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-warning" />
              Escalated Conversations
            </h1>
            <p className="text-muted-foreground">Tickets requiring human intervention</p>
          </div>
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {escalatedConversations.length} Active
          </Badge>
        </div>

        {/* Alert Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center gap-4"
        >
          <AlertCircle className="w-8 h-8 text-warning flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-warning">High Priority Escalations</h3>
            <p className="text-sm text-muted-foreground">
              {escalatedConversations.length} customers with negative or complex issues are waiting.
            </p>
          </div>
          <Button variant="warning" size="sm">
            <Phone className="w-4 h-4 mr-2" />
            Start Handling
          </Button>
        </motion.div>

        {/* Escalation Cards */}
        <div className="space-y-4">
          {escalatedConversations.map((conv, index) => (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`glass-card border-l-4 ${
                conv.priority === "high" ? "border-l-destructive" : "border-l-warning"
              }`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* User Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                        <Frown className="w-6 h-6 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{conv.user.name}</h3>
                          <Badge variant={conv.priority === "high" ? "destructive" : "pending"} className="text-[10px]">
                            {conv.priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{conv.user.email}</p>
                        <p className="text-sm bg-secondary/50 rounded-lg p-3 italic">
                          "{conv.preview}"
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-warning" />
                            {conv.reason}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {conv.attempts} AI attempts
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Waiting: {conv.waitTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">AI Confidence</p>
                        <p className="text-2xl font-bold text-destructive">{Math.round(conv.confidence * 100)}%</p>
                      </div>
                      <Badge variant={conv.sentiment as any} className="text-[10px]">
                        {conv.sentiment} sentiment
                      </Badge>
                      <Button variant="accent" size="sm">
                        Take Over
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {escalatedConversations.length === 0 && (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-success" />
              </div>
              <h3 className="font-semibold text-lg mb-2">All Clear!</h3>
              <p className="text-muted-foreground">No escalated conversations at the moment.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
