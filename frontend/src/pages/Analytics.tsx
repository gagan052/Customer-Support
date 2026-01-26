import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown,
  MessageSquare,
  CheckCircle2,
  Clock,
  Star,
  Brain,
  Users
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      // Conversations + messages in one shot
      const [{ data: conversations }, { data: messages }] = await Promise.all([
        supabase.from("conversations").select("id,status,is_resolved,rating,created_at,updated_at"),
        supabase.from("messages").select("conversation_id, intent, created_at")
      ]);

      const convs = conversations || [];
      const msgs = messages || [];

      const totalConvs = convs.length;
      const resolvedCount = convs.filter(c => c.is_resolved).length;
      const escalationCount = convs.filter(c => c.status === "escalated").length;
      const avgRating =
        convs.filter(c => c.rating != null).reduce((a, c) => a + (c.rating || 0), 0) /
        (convs.filter(c => c.rating != null).length || 1);

      const metrics = [
        {
          title: "Resolution Rate",
          value: totalConvs ? `${Math.round((resolvedCount / totalConvs) * 100)}%` : "0%",
          change: "",
          trend: "up" as const,
          icon: CheckCircle2,
          description: "percent of conversations resolved",
        },
        {
          title: "Active Conversations",
          value: totalConvs.toString(),
          change: "",
          trend: "up" as const,
          icon: MessageSquare,
          description: "total conversations recorded",
        },
        {
          title: "Customer Satisfaction",
          value: `${avgRating.toFixed(1) || "0.0"}/5`,
          change: "",
          trend: "up" as const,
          icon: Star,
          description: "average rating from feedback",
        },
        {
          title: "Escalation Rate",
          value: totalConvs ? `${Math.round((escalationCount / totalConvs) * 100)}%` : "0%",
          change: "",
          trend: escalationCount > 0 ? ("down" as const) : ("up" as const),
          icon: Brain,
          description: "percent of conversations escalated",
        },
      ];

      // Very simple hourly aggregation from messages
      const hourlyBuckets: Record<string, { conversations: number; resolved: number }> = {};
      msgs.forEach(m => {
        const hour = new Date(m.created_at).getHours().toString().padStart(2, "0") + ":00";
        if (!hourlyBuckets[hour]) {
          hourlyBuckets[hour] = { conversations: 0, resolved: 0 };
        }
        hourlyBuckets[hour].conversations += 1;
      });

      convs.forEach(c => {
        if (!c.is_resolved) return;
        const hour = new Date(c.updated_at).getHours().toString().padStart(2, "0") + ":00";
        if (!hourlyBuckets[hour]) {
          hourlyBuckets[hour] = { conversations: 0, resolved: 0 };
        }
        hourlyBuckets[hour].resolved += 1;
      });

      const hourlyData = Object.entries(hourlyBuckets)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([hour, v]) => ({ hour, ...v }));

      const maxConversations = hourlyData.length
        ? Math.max(...hourlyData.map(d => d.conversations || 1))
        : 1;

      // Intent distribution from messages
      const intentCounts: Record<string, number> = {};
      msgs.forEach(m => {
        const intent = m.intent || "Unknown";
        intentCounts[intent] = (intentCounts[intent] || 0) + 1;
      });

      const colors = ["bg-info", "bg-success", "bg-warning", "bg-accent", "bg-escalated", "bg-muted-foreground"];
      const intentDistribution = Object.entries(intentCounts).map(([intent, count], idx) => ({
        intent,
        count,
        color: colors[idx % colors.length],
      }));

      const totalIntents = intentDistribution.reduce((acc, curr) => acc + curr.count, 0);
      const avgMessagesPerConv = totalConvs > 0 ? (msgs.length / totalConvs).toFixed(1) : "0.0";
      const summaryStats = [
        { label: "Total Conversations", value: totalConvs.toString() },
        { label: "Auto-Resolved", value: `${resolvedCount} (${totalConvs ? Math.round((resolvedCount/totalConvs)*100) : 0}%)` },
        { label: "Avg. Messages/Conv", value: avgMessagesPerConv },
        { label: "Escalation Rate", value: totalConvs ? `${Math.round((escalationCount/totalConvs)*100)}%` : "0%" },
      ];

      return { metrics, hourlyData, intentDistribution, maxConversations, totalIntents, summaryStats };
    }
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6">Loading analytics...</div>
      </MainLayout>
    );
  }

  const metrics = data?.metrics || [];
  const hourlyData = data?.hourlyData || [];
  const intentDistribution = data?.intentDistribution || [];
  const maxConversations = data?.maxConversations || 1;
  const totalIntents = data?.totalIntents || 0;
  const summaryStats: { label: string; value: string }[] = data?.summaryStats || [];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">AI Agent performance metrics</p>
        </div>

        {/* Metrics Grid (live from Supabase) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                      <metric.icon className="w-5 h-5 text-accent" />
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      metric.trend === "up" ? "text-success" : "text-destructive"
                    }`}>
                      {metric.trend === "up" ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {metric.change}
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hourly Activity */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-accent" />
                Hourly Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {hourlyData.map((data, index) => (
                  <motion.div
                    key={data.hour}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4"
                  >
                    <span className="text-xs text-muted-foreground w-12">{data.hour}</span>
                    <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden relative">
                      <motion.div
                        className="h-full bg-accent/30 absolute left-0 top-0"
                        initial={{ width: 0 }}
                        animate={{ width: `${(data.conversations / maxConversations) * 100}%` }}
                        transition={{ delay: 0.3 + index * 0.05, duration: 0.5 }}
                      />
                      <motion.div
                        className="h-full bg-accent absolute left-0 top-0"
                        initial={{ width: 0 }}
                        animate={{ width: `${(data.resolved / maxConversations) * 100}%` }}
                        transition={{ delay: 0.4 + index * 0.05, duration: 0.5 }}
                      />
                    </div>
                    <div className="text-right w-20">
                      <span className="text-sm font-medium">{data.conversations}</span>
                      <span className="text-xs text-muted-foreground"> / {data.resolved}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-accent/30" />
                  <span className="text-muted-foreground">Total Conversations</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-accent" />
                  <span className="text-muted-foreground">Auto-Resolved</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Intent Distribution */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Intent Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {intentDistribution.map((item, index) => (
                <motion.div
                  key={item.intent}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-sm">{item.intent}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{item.count}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${item.color} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.count / totalIntents) * 100}%` }}
                      transition={{ delay: 0.3 + index * 0.05, duration: 0.5 }}
                    />
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <Card className="glass-card text-center">
                <CardContent className="p-4">
                  <p className="text-xl font-bold text-accent">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
