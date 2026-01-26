import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { 
  MessageSquare, CheckCircle2, AlertTriangle, TrendingUp, Clock, Users, Zap, 
  ArrowUpRight, ArrowDownRight, Brain, Loader2 
} from 'lucide-angular';
import { formatDistanceToNow } from 'date-fns';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-dashboard',
  template: `
    <app-main-layout>
      <div *ngIf="statsLoading || conversationsLoading || decisionsLoading" class="flex h-full items-center justify-center p-6">
        <lucide-icon [name]="Loader2" class="h-8 w-8 animate-spin text-primary"></lucide-icon>
      </div>
      <div *ngIf="!(statsLoading || conversationsLoading || decisionsLoading)" class="p-6 space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold">Dashboard</h1>
            <p class="text-muted-foreground">Real-time AI Agent performance</p>
          </div>
          <button appButton variant="accent" routerLink="/settings">
            <lucide-icon name="zap" class="w-4 h-4 mr-2"></lucide-icon>
            Agent Settings
          </button>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div *ngFor="let stat of stats" [@fadeInUp]>
          <app-card class="glass-card">
            <app-card-content class="p-4">
              <div class="flex items-center justify-between">
                <lucide-icon [name]="stat.icon" [class]="'w-8 h-8 ' + stat.color"></lucide-icon>
                <span appBadge [variant]="stat.trend === 'up' ? 'positive' : 'negative'" class="flex items-center gap-1">
                  <lucide-icon [name]="stat.trend === 'up' ? ArrowUpRight : ArrowDownRight" class="w-3 h-3"></lucide-icon>
                  {{ stat.change }}
                </span>
              </div>
              <div class="mt-3">
                <p class="text-2xl font-bold">{{ stat.value }}</p>
                <p class="text-sm text-muted-foreground">{{ stat.name }}</p>
              </div>
            </app-card-content>
          </app-card>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Recent Conversations -->
          <app-card class="lg:col-span-2 glass-card">
            <app-card-header class="pb-3">
              <app-card-title class="text-lg flex items-center gap-2">
                <lucide-icon name="users" class="w-5 h-5 text-accent"></lucide-icon>
                Recent Conversations
              </app-card-title>
            </app-card-header>
            <app-card-content>
              <div class="space-y-3">
                <div *ngFor="let conv of recentConversations" class="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <span class="text-xs font-medium text-accent">
                        {{ getInitials(conv.user_profiles?.display_name || conv.user_profiles?.email || 'User') }}
                      </span>
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="font-medium text-sm">
                        {{ conv.user_profiles?.display_name || conv.user_profiles?.email || 'Guest User' }}
                      </p>
                      <p class="text-sm text-muted-foreground truncate">
                        {{ conv.messages?.[0]?.content || 'No messages' }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 flex-shrink-0">
                    <span appBadge [variant]="conv.status === 'resolved' ? 'resolved' : (conv.status === 'escalated' ? 'escalated' : 'pending')" class="text-[10px]">
                      {{ conv.status }}
                    </span>
                    <div class="text-right">
                      <p class="text-xs font-medium">{{ Math.round((conv.avg_confidence || 0) * 100) }}%</p>
                      <p class="text-[10px] text-muted-foreground">{{ formatTime(conv.updated_at) }}</p>
                    </div>
                  </div>
                </div>
                <p *ngIf="recentConversations.length === 0" class="text-center text-muted-foreground py-4">No conversations yet.</p>
              </div>
            </app-card-content>
          </app-card>

          <!-- AI Decisions Chart -->
          <app-card class="glass-card">
            <app-card-header class="pb-3">
              <app-card-title class="text-lg flex items-center gap-2">
                <lucide-icon name="brain" class="w-5 h-5 text-accent"></lucide-icon>
                AI Decisions
              </app-card-title>
            </app-card-header>
            <app-card-content>
              <div class="space-y-4">
                <div *ngFor="let decision of agentDecisions; let i = index" class="space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="font-medium">{{ decision.action }}</span>
                    <span class="text-muted-foreground">{{ decision.count }} ({{ Math.round(decision.percentage) }}%)</span>
                  </div>
                  <div class="h-2 bg-secondary rounded-full overflow-hidden">
                    <div class="h-full transition-all duration-1000" [class]="decision.color" [style.width.%]="decision.percentage"></div>
                  </div>
                </div>
              </div>
            </app-card-content>
          </app-card>
        </div>
      </div>
    </app-main-layout>
  `
  , animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit {
  stats: any[] = [];
  recentConversations: any[] = [];
  statsLoading = true;
  conversationsLoading = true;
  decisionsLoading = true;
  agentDecisions: { action: string; count: number; percentage: number; color: string }[] = [];
  Math = Math;

  Loader2 = Loader2;
  ArrowUpRight = ArrowUpRight;
  ArrowDownRight = ArrowDownRight;

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    this.fetchStats();
    this.fetchRecentConversations();
    this.fetchAgentDecisions();
  }

  async fetchStats() {
    try {
      const supabase = this.supabaseService.supabase;
      
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

      const avgConfidence = avgData?.reduce((acc: any, curr: any) => acc + (curr.avg_confidence || 0), 0) / (avgData?.length || 1);

      this.stats = [
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
    } catch (error) {
      console.error(error);
    } finally {
      this.statsLoading = false;
    }
  }

  async fetchRecentConversations() {
    try {
      const { data, error } = await this.supabaseService.supabase
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
        
      if (data) this.recentConversations = data;
    } catch (error) {
      console.error(error);
    } finally {
      this.conversationsLoading = false;
    }
  }

  async fetchAgentDecisions() {
    try {
      const { data } = await this.supabaseService.supabase.from("conversations").select("status");
      const list = data || [];
      const total = list.length;
      const resolved = list.filter((c: any) => c.status === "resolved").length;
      const escalated = list.filter((c: any) => c.status === "escalated").length;
      const active = list.filter((c: any) => c.status === "active").length;

      this.agentDecisions = [
        { action: "Auto-Resolve", count: resolved, percentage: total ? (resolved / total) * 100 : 0, color: "bg-success" },
        { action: "Active/Clarify", count: active, percentage: total ? (active / total) * 100 : 0, color: "bg-warning" },
        { action: "Escalate", count: escalated, percentage: total ? (escalated / total) * 100 : 0, color: "bg-destructive" },
      ];
    } catch (error) {
      console.error(error);
      this.agentDecisions = [];
    } finally {
      this.decisionsLoading = false;
    }
  }

  getInitials(name: string) {
    return name.slice(0, 2).toUpperCase();
  }

  getStatusVariant(status: string): any {
    switch (status) {
      case 'resolved': return 'resolved';
      case 'escalated': return 'escalated';
      case 'pending': return 'pending';
      default: return 'pending';
    }
  }

  formatTime(date: string) {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  }
}
