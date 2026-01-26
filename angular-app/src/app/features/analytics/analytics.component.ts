import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../shared/ui/ui.module';
import { LucideAngularModule } from 'lucide-angular';
import { CoreModule } from '../../core/core.module';
import { SupabaseService } from '../../core/services/supabase.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    UiModule,
    LucideAngularModule,
    CoreModule
  ],
  template: `
    <app-main-layout>
      <div *ngIf="loading" class="p-6">Loading analytics...</div>
      
      <div *ngIf="!loading" class="p-6 space-y-6">
        <!-- Header -->
        <div>
          <h1 class="text-2xl font-bold">Analytics</h1>
          <p class="text-muted-foreground">AI Agent performance metrics</p>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div *ngFor="let metric of metrics; let i = index" [@fadeInUp]="{ value: 'in', params: { delay: i * 100 } }">
            <app-card class="glass-card">
              <app-card-content class="p-4">
                <div class="flex items-center justify-between mb-3">
                  <div class="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <lucide-icon [name]="metric.icon" class="w-5 h-5 text-accent"></lucide-icon>
                  </div>
                  <div [class]="'flex items-center gap-1 text-xs font-medium ' + (metric.trend === 'up' ? 'text-success' : 'text-destructive')">
                    <lucide-icon *ngIf="metric.trend === 'up'" name="trending-up" class="w-3 h-3"></lucide-icon>
                    <lucide-icon *ngIf="metric.trend === 'down'" name="trending-down" class="w-3 h-3"></lucide-icon>
                    {{ metric.change }}
                  </div>
                </div>
                <p class="text-2xl font-bold">{{ metric.value }}</p>
                <p class="text-xs text-muted-foreground">{{ metric.title }}</p>
              </app-card-content>
            </app-card>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Hourly Activity -->
          <app-card class="glass-card">
            <app-card-header>
              <app-card-title class="text-base flex items-center gap-2">
                <lucide-icon name="message-square" class="w-5 h-5 text-accent"></lucide-icon>
                Hourly Activity
              </app-card-title>
            </app-card-header>
            <app-card-content>
              <div class="space-y-3">
                <div *ngFor="let data of hourlyData; let i = index" 
                     [@fadeInLeft]="{ value: 'in', params: { delay: i * 50 } }"
                     class="flex items-center gap-4">
                  <span class="text-xs text-muted-foreground w-12">{{ data.hour }}</span>
                  <div class="flex-1 h-6 bg-secondary rounded-full overflow-hidden relative">
                    <div
                      class="h-full bg-accent/30 absolute left-0 top-0 transition-all duration-500"
                      [style.width.%]="(data.conversations / maxConversations) * 100"
                    ></div>
                    <div
                      class="h-full bg-accent absolute left-0 top-0 transition-all duration-500"
                      [style.width.%]="(data.resolved / maxConversations) * 100"
                    ></div>
                  </div>
                  <div class="text-right w-20">
                    <span class="text-sm font-medium">{{ data.conversations }}</span>
                    <span class="text-xs text-muted-foreground"> / {{ data.resolved }}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded bg-accent/30"></div>
                  <span class="text-muted-foreground">Total Conversations</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded bg-accent"></div>
                  <span class="text-muted-foreground">Auto-Resolved</span>
                </div>
              </div>
            </app-card-content>
          </app-card>

          <!-- Intent Distribution -->
          <app-card class="glass-card">
            <app-card-header>
              <app-card-title class="text-base flex items-center gap-2">
                <lucide-icon name="users" class="w-5 h-5 text-accent"></lucide-icon>
                Intent Distribution
              </app-card-title>
            </app-card-header>
            <app-card-content class="space-y-4">
              <div *ngFor="let item of intentDistribution; let i = index" [@fadeInScale]="{ value: 'in', params: { delay: i * 50 } }">
                <div class="flex items-center justify-between mb-1.5">
                  <div class="flex items-center gap-2">
                    <div [class]="'w-2 h-2 rounded-full ' + item.color"></div>
                    <span class="text-sm">{{ item.intent }}</span>
                  </div>
                  <span class="text-sm text-muted-foreground">{{ item.count }}</span>
                </div>
                <div class="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    [class]="'h-full rounded-full transition-all duration-500 ' + item.color"
                    [style.width.%]="(item.count / totalIntents) * 100"
                  ></div>
                </div>
              </div>
            </app-card-content>
          </app-card>
        </div>

        <!-- Summary Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div *ngFor="let stat of summaryStats; let i = index" [@fadeInUp]="{ value: 'in', params: { delay: 500 + i * 100 } }">
            <app-card class="glass-card text-center">
              <app-card-content class="p-4">
                <p class="text-xl font-bold text-accent">{{ stat.value }}</p>
                <p class="text-xs text-muted-foreground">{{ stat.label }}</p>
              </app-card-content>
            </app-card>
          </div>
        </div>
      </div>
    </app-main-layout>
  `,
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms {{ delay }}ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ], { params: { delay: 0 } })
    ]),
    trigger('fadeInLeft', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('300ms {{ delay }}ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ], { params: { delay: 0 } })
    ]),
    trigger('fadeInScale', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('300ms {{ delay }}ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ], { params: { delay: 0 } })
    ])
  ]
})
export class AnalyticsComponent implements OnInit {
  loading = true;
  metrics: any[] = [];
  hourlyData: any[] = [];
  intentDistribution: any[] = [];
  maxConversations = 1;
  totalIntents = 0;

  summaryStats = [
    { label: "Total Conversations", value: "12,847" },
    { label: "Auto-Resolved", value: "11,234 (87.4%)" },
    { label: "Avg. Messages/Conv", value: "6.2" },
    { label: "Escalation Rate", value: "3.6%" },
  ];

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    try {
      const supabase = this.supabaseService.supabase;
      const [conversationsRes, messagesRes] = await Promise.all([
        supabase.from("conversations").select("id,status,is_resolved,rating,created_at,updated_at"),
        supabase.from("messages").select("conversation_id, intent, created_at")
      ]);

      const convs = conversationsRes.data || [];
      const msgs = messagesRes.data || [];

      const totalConvs = convs.length;
      const resolvedCount = convs.filter(c => c.is_resolved).length;
      const escalationCount = convs.filter(c => c.status === "escalated").length;
      const ratedConvs = convs.filter(c => c.rating != null);
      const avgRating = ratedConvs.reduce((a, c) => a + (c.rating || 0), 0) / (ratedConvs.length || 1);

      this.metrics = [
        {
          title: "Resolution Rate",
          value: totalConvs ? `${Math.round((resolvedCount / totalConvs) * 100)}%` : "0%",
          change: "",
          trend: "up",
          icon: "check-circle-2",
          description: "percent of conversations resolved",
        },
        {
          title: "Active Conversations",
          value: totalConvs.toString(),
          change: "",
          trend: "up",
          icon: "message-square",
          description: "total conversations recorded",
        },
        {
          title: "Customer Satisfaction",
          value: `${avgRating.toFixed(1) || "0.0"}/5`,
          change: "",
          trend: "up",
          icon: "star",
          description: "average rating from feedback",
        },
        {
          title: "Escalation Rate",
          value: totalConvs ? `${Math.round((escalationCount / totalConvs) * 100)}%` : "0%",
          change: "",
          trend: escalationCount > 0 ? "down" : "up",
          icon: "brain",
          description: "percent of conversations escalated",
        },
      ];

      // Hourly aggregation
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

      this.hourlyData = Object.entries(hourlyBuckets)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([hour, v]) => ({ hour, ...v }));

      this.maxConversations = this.hourlyData.length
        ? Math.max(...this.hourlyData.map(d => d.conversations || 1))
        : 1;

      // Intent distribution
      const intentCounts: Record<string, number> = {};
      msgs.forEach(m => {
        const intent = m.intent || "Unknown";
        intentCounts[intent] = (intentCounts[intent] || 0) + 1;
      });

      const colors = ["bg-info", "bg-success", "bg-warning", "bg-accent", "bg-escalated", "bg-muted-foreground"];
      this.intentDistribution = Object.entries(intentCounts).map(([intent, count], idx) => ({
        intent,
        count,
        color: colors[idx % colors.length],
      }));

      this.totalIntents = this.intentDistribution.reduce((acc, curr) => acc + curr.count, 0);

    } catch (error) {
      console.error(error);
    } finally {
      this.loading = false;
    }
  }
}
