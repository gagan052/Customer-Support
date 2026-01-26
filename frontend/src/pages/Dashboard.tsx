
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  Users,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      // Parallel requests for performance
      const [
        { count: total },
        { count: resolved },
        { count: escalated },
        { data: avgData }
      ] = await Promise.all([
        supabase.from("conversations").select("*", { count: "exact", head: true }),
        supabase.from("conversations").select("*", { count: "exact", head: true }).eq("is_resolved", true),
        supabase.from("conversations").select("*", { count: "exact", head: true }).eq("status", "escalated"),
        supabase.from("conversations").select("avg_confidence")
      ]);

      const avgConfidence = avgData?.reduce((acc, curr) => acc + (curr.avg_confidence || 0), 0) / (avgData?.length || 1);

      return [
        {
          name: "Total Conversations",
          value: total || 0,
          change: "Real-time",
          trend: "up",
          icon: MessageSquare,
          color: "text-info",
        },
        {
          name: "Auto-Resolved",
          value: resolved || 0,
          change: total ? `${Math.round((resolved! / total!) * 100)}%` : "0%",
          trend: "up",
          icon: CheckCircle2,
          color: "text-success",
        },
        {
          name: "Escalated",
          value: escalated || 0,
          change: total ? `${Math.round((escalated! / total!) * 100)}%` : "0%",
          trend: "down",
          icon: AlertTriangle,
          color: "text-warning",
        },
        {
          name: "Avg. Confidence",
          value: `${Math.round((avgConfidence || 0) * 100)}%`,
          change: "AI Accuracy",
          trend: "up",
          icon: Brain,
          color: "text-accent",
        },
      ];
    }
  });

  const { data: recentConversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ["recent-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id,
          status,
          avg_confidence,
          updated_at,
          user_profiles (
            display_name,
            email
          ),
          messages (
            content
          )
        `)
        .order("updated_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      return data.map(conv => {
        // Supabase can return a single related row or an array depending on query shape
        const profile = Array.isArray(conv.user_profiles)
          ? conv.user_profiles[0]
          : conv.user_profiles;

        const userName =
          profile?.display_name ||
          profile?.email ||
          "Guest User";

        return {
          id: conv.id,
          user: userName,
        preview: conv.messages?.[0]?.content || "No messages",
        status: conv.status,
        confidence: conv.avg_confidence || 0,
        time: formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true }),
        };
      });
    }
  });

  const { data: agentDecisions, isLoading: decisionsLoading } = useQuery({
    queryKey: ["agent-decisions"],
    queryFn: async () => {
      const { data } = await supabase.from("conversations").select("status");
      if (!data) return [];
      
      const total = data.length;
      const resolved = data.filter(c => c.status === "resolved").length;
      const escalated = data.filter(c => c.status === "escalated").length;
      const active = data.filter(c => c.status === "active").length;

      return [
        { action: "Auto-Resolve", count: resolved, percentage: total ? (resolved / total) * 100 : 0, color: "bg-success" },
        { action: "Active/Clarify", count: active, percentage: total ? (active / total) * 100 : 0, color: "bg-warning" },
        { action: "Escalate", count: escalated, percentage: total ? (escalated / total) * 100 : 0, color: "bg-destructive" },
      ];
    }
  });

  if (statsLoading || conversationsLoading || decisionsLoading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Real-time AI Agent performance</p>
          </div>
          <Button variant="accent" onClick={() => window.location.href = '/settings'}>
            <Zap className="w-4 h-4 mr-2" />
            Agent Settings
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats?.map((stat, index) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                    <Badge 
                      variant={stat.trend === "up" ? "positive" : "negative"} 
                      className="flex items-center gap-1"
                    >
                      {stat.change}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.name}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Conversations */}
          <Card className="lg:col-span-2 glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Recent Conversations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentConversations?.map((conv, index) => (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-accent">
                          {conv.user.split(" ").map(n => n[0]).join("")}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{conv.user}</p>
                        <p className="text-sm text-muted-foreground truncate">{conv.preview}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge 
                        variant={
                          conv.status === "resolved" ? "resolved" :
                          conv.status === "escalated" ? "escalated" : "pending"
                        }
                        className="text-[10px]"
                      >
                        {conv.status}
                      </Badge>
                      <div className="text-right">
                        <p className="text-xs font-medium">{Math.round(conv.confidence * 100)}%</p>
                        <p className="text-[10px] text-muted-foreground">{conv.time}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {recentConversations?.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No conversations yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Decisions Chart */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-accent" />
                AI Decisions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentDecisions?.map((decision, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{decision.action}</span>
                      <span className="text-muted-foreground">{decision.count} ({Math.round(decision.percentage)}%)</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${decision.percentage}%` }}
                        transition={{ duration: 1, delay: index * 0.2 }}
                        className={`h-full ${decision.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
