import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { 
  MessageSquare, LayoutDashboard, BookOpen, Users, Settings, 
  BarChart3, Zap, AlertTriangle, HelpCircle 
} from 'lucide-angular';

@Component({
  selector: 'app-sidebar',
  template: `
    <aside class="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen fixed left-0 top-0 z-40">
      <!-- Logo -->
      <div class="p-4 border-b border-sidebar-border">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-sidebar-primary/20 flex items-center justify-center">
            <lucide-icon [name]="Zap" class="w-5 h-5 text-sidebar-primary"></lucide-icon>
          </div>
          <div>
            <h1 class="font-bold text-sidebar-foreground">AI Support</h1>
            <p class="text-xs text-sidebar-foreground/60">Autonomous Agent</p>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
        <a *ngFor="let item of navigation"
           [routerLink]="item.href"
           routerLinkActive="bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
           [routerLinkActiveOptions]="{exact: item.href === '/'}"
           class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <lucide-icon [name]="item.icon" class="w-5 h-5"></lucide-icon>
          {{ item.name }}
          <span *ngIf="item.name === 'Escalations' && stats.escalatedCount > 0" 
                class="ml-auto bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
            {{ stats.escalatedCount }}
          </span>
        </a>
      </nav>
      
      <!-- Footer/User profile could go here -->
    </aside>
  `
})
export class SidebarComponent implements OnInit {
  navigation = [
    { name: "Chat", href: "/", icon: MessageSquare },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Conversations", href: "/conversations", icon: Users },
    { name: "Escalations", href: "/escalations", icon: AlertTriangle },
    { name: "Knowledge Base", href: "/knowledge", icon: BookOpen },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  stats = {
    resolvedToday: 0,
    avgConfidence: 0,
    escalatedCount: 0
  };

  readonly Zap = Zap;

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    await this.fetchStats();
  }

  async fetchStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    const { data } = await this.supabaseService.supabase
      .from("conversations")
      .select("is_resolved, avg_confidence, created_at, status");

    const convs = data || [];

    const resolvedToday = convs.filter(
      (c: any) => c.is_resolved && c.created_at >= todayIso
    ).length;

    const avgConfidence =
      convs.reduce((acc: number, c: any) => acc + (c.avg_confidence || 0), 0) /
      (convs.length || 1);

    const escalatedCount = convs.filter(
      (c: any) => c.status === "escalated"
    ).length;

    this.stats = {
      resolvedToday,
      avgConfidence,
      escalatedCount
    };
  }
}
