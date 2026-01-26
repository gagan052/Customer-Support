import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../shared/ui/ui.module';
import { LucideAngularModule } from 'lucide-angular';
import { CoreModule } from '../../core/core.module';
import { SupabaseService } from '../../core/services/supabase.service';
import { formatDistanceToNow } from 'date-fns';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-escalations',
  standalone: true,
  imports: [
    CommonModule,
    UiModule,
    LucideAngularModule,
    CoreModule
  ],
  template: `
    <app-main-layout>
      <div class="p-6 space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold flex items-center gap-2">
              <lucide-icon name="alert-triangle" class="w-6 h-6 text-warning"></lucide-icon>
              Escalated Conversations
            </h1>
            <p class="text-muted-foreground">Tickets requiring human intervention</p>
          </div>
          <span appBadge variant="destructive" class="text-sm px-3 py-1">
            {{ escalatedConversations.length }} Active
          </span>
        </div>

        <!-- Alert Banner -->
        <div
          [@fadeInDown]
          class="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center gap-4"
        >
          <lucide-icon name="alert-circle" class="w-8 h-8 text-warning flex-shrink-0"></lucide-icon>
          <div class="flex-1">
            <h3 class="font-semibold text-warning">High Priority Escalations</h3>
            <p class="text-sm text-muted-foreground">
              {{ escalatedConversations.length }} customers with negative or complex issues are waiting.
            </p>
          </div>
          <button appButton variant="warning" size="sm">
            <lucide-icon name="phone" class="w-4 h-4 mr-2"></lucide-icon>
            Start Handling
          </button>
        </div>

        <!-- Escalation Cards -->
        <div class="space-y-4">
          <div
            *ngFor="let conv of escalatedConversations; let i = index"
            [@fadeInLeft]="{ value: 'in', params: { delay: i * 100 } }"
          >
            <app-card [class]="'glass-card border-l-4 ' + (conv.priority === 'high' ? 'border-l-destructive' : 'border-l-warning')">
              <app-card-content class="p-5">
                <div class="flex items-start justify-between gap-4">
                  <!-- User Info -->
                  <div class="flex items-start gap-4 flex-1">
                    <div class="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                      <lucide-icon name="frown" class="w-6 h-6 text-destructive"></lucide-icon>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <h3 class="font-semibold">{{ conv.user.name }}</h3>
                        <span appBadge [variant]="conv.priority === 'high' ? 'destructive' : 'pending'" class="text-[10px]">
                          {{ conv.priority }} priority
                        </span>
                      </div>
                      <p class="text-sm text-muted-foreground mb-2">{{ conv.user.email }}</p>
                      <p class="text-sm bg-secondary/50 rounded-lg p-3 italic">
                        "{{ conv.preview }}"
                      </p>
                      
                      <div class="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span class="flex items-center gap-1">
                          <lucide-icon name="alert-triangle" class="w-3 h-3 text-warning"></lucide-icon>
                          {{ conv.reason }}
                        </span>
                        <span class="flex items-center gap-1">
                          <lucide-icon name="message-square" class="w-3 h-3"></lucide-icon>
                          {{ conv.attempts }} AI attempts
                        </span>
                        <span class="flex items-center gap-1">
                          <lucide-icon name="clock" class="w-3 h-3"></lucide-icon>
                          Waiting: {{ conv.waitTime }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Stats & Actions -->
                  <div class="flex flex-col items-end gap-3 flex-shrink-0">
                    <div class="text-right">
                      <p class="text-xs text-muted-foreground">AI Confidence</p>
                      <p class="text-2xl font-bold text-destructive">{{ Math.round(conv.confidence * 100) }}%</p>
                    </div>
                    <span appBadge [variant]="conv.sentiment" class="text-[10px]">
                      {{ conv.sentiment }} sentiment
                    </span>
                    <button appButton variant="accent" size="sm">
                      Take Over
                      <lucide-icon name="arrow-right" class="w-3 h-3 ml-1"></lucide-icon>
                    </button>
                  </div>
                </div>
              </app-card-content>
            </app-card>
          </div>
        </div>

        <!-- Empty State -->
        <app-card *ngIf="escalatedConversations.length === 0 && !isLoading" class="glass-card">
          <app-card-content class="p-12 text-center">
            <div class="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <lucide-icon name="alert-triangle" class="w-8 h-8 text-success"></lucide-icon>
            </div>
            <h3 class="font-semibold text-lg mb-2">All Clear!</h3>
            <p class="text-muted-foreground">No escalated conversations at the moment.</p>
          </app-card-content>
        </app-card>
      </div>
    </app-main-layout>
  `,
  animations: [
    trigger('fadeInDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeInLeft', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('300ms {{ delay }}ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ], { params: { delay: 0 } })
    ])
  ]
})
export class EscalationsComponent implements OnInit {
  escalatedConversations: any[] = [];
  isLoading = true;
  Math = Math;

  constructor(private supabaseService: SupabaseService) {}

  ngOnInit() {
    this.fetchEscalations();
  }

  async fetchEscalations() {
    try {
      const { data, error } = await this.supabaseService.supabase
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

      if (error || !data) {
        this.escalatedConversations = [];
        return;
      }

      this.escalatedConversations = data.map((conv: any) => {
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
    } catch (error) {
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }
}
