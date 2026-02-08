import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  MessageSquare, 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Settings, 
  BarChart3,
  Zap,
  AlertTriangle,
  HelpCircle,
  FileText
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay } from "date-fns";

const navigation = [
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Conversations", href: "/conversations", icon: Users },
  { name: "Escalations", href: "/escalations", icon: AlertTriangle },
  { name: "Knowledge Base", href: "/knowledge", icon: BookOpen },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Documentation", href: "/documentation", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function SidebarContent() {
  const location = useLocation();

  const { data: sidebarStats } = useQuery({
    queryKey: ["sidebar-agent-stats"],
    queryFn: async () => {
      const todayStart = startOfDay(new Date()).toISOString();

      const { data } = await supabase
        .from("conversations")
        .select("is_resolved, avg_confidence, created_at, status");

      const convs = data || [];

      const resolvedToday = convs.filter(
        (c) => c.is_resolved && c.created_at >= todayStart
      ).length;

      const avgConfidence =
        convs.reduce((acc, c) => acc + (c.avg_confidence || 0), 0) /
        (convs.length || 1);

      const escalatedCount = convs.filter(
        (c) => c.status === "escalated"
      ).length;

      return {
        resolvedToday,
        avgConfidence,
        escalatedCount,
      };
    },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-sidebar-primary" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground">AI Support</h1>
            <p className="text-xs text-sidebar-foreground/60">Autonomous Agent</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
              {item.name === "Escalations" && !!sidebarStats && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {sidebarStats.escalatedCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Agent Status */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="glass-card p-3 bg-sidebar-accent">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-medium text-sidebar-foreground">Agent Active</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-sidebar-foreground/60">Resolved Today</p>
              <p className="font-bold text-sidebar-foreground">
                {sidebarStats?.resolvedToday ?? 0}
              </p>
            </div>
            <div>
              <p className="text-sidebar-foreground/60">Avg. Confidence</p>
              <p className="font-bold text-success">
                {Math.round((sidebarStats?.avgConfidence ?? 0) * 100)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Help */}
      <div className="p-4 border-t border-sidebar-border">
        <button className="flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
          <HelpCircle className="w-4 h-4" />
          Help & Documentation
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <motion.aside
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="hidden md:flex w-64 bg-sidebar border-r border-sidebar-border flex-col h-screen fixed left-0 top-0"
    >
      <SidebarContent />
    </motion.aside>
  );
}
