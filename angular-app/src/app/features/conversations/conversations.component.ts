import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../shared/ui/ui.module';
import { LucideAngularModule } from 'lucide-angular';
import { CoreModule } from '../../core/core.module';
import { trigger, transition, style, animate } from '@angular/animations';

interface Conversation {
  id: number;
  user: string;
  email: string;
  lastMessage: string;
  status: 'resolved' | 'pending' | 'escalated';
  confidence: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  messages: number;
  duration: string;
  time: string;
  rating: number | null;
}

@Component({
  selector: 'app-conversations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
            <h1 class="text-2xl font-bold">Conversations</h1>
            <p class="text-muted-foreground">All customer interactions</p>
          </div>
          <div class="flex gap-2">
            <span appBadge variant="resolved" class="px-3 py-1">
              {{ getStatusCount('resolved') }} Resolved
            </span>
            <span appBadge variant="pending" class="px-3 py-1">
              {{ getStatusCount('pending') }} Pending
            </span>
            <span appBadge variant="escalated" class="px-3 py-1">
              {{ getStatusCount('escalated') }} Escalated
            </span>
          </div>
        </div>

        <!-- Search and Filter -->
        <div class="flex gap-4">
          <div class="relative flex-1">
            <lucide-icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"></lucide-icon>
            <input
              appInput
              placeholder="Search conversations..."
              [(ngModel)]="searchQuery"
              class="pl-10"
            />
          </div>
          <div class="flex gap-2">
            <button
              *ngFor="let f of filters"
              appButton
              [variant]="filter === f ? 'accent' : 'outline'"
              size="sm"
              (click)="filter = f"
              class="capitalize"
            >
              {{ f }}
            </button>
          </div>
        </div>

        <!-- Conversations List -->
        <app-card class="glass-card">
          <app-card-content class="p-0">
            <div class="divide-y divide-border">
              <div
                *ngFor="let conv of filteredConversations; let i = index"
                [@fadeIn]="{ value: 'in', params: { delay: i * 50 } }"
                class="p-4 hover:bg-secondary/30 transition-colors cursor-pointer flex items-center gap-4"
              >
                <!-- Avatar -->
                <div [class]="'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ' + getSentimentBg(conv.sentiment)">
                  <span [class]="'text-sm font-medium ' + getSentimentText(conv.sentiment)">
                    {{ getInitials(conv.user) }}
                  </span>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-medium text-sm">{{ conv.user }}</h3>
                    <span appBadge [variant]="conv.status" class="text-[10px]">
                      {{ conv.status }}
                    </span>
                  </div>
                  <p class="text-sm text-muted-foreground truncate">{{ conv.lastMessage }}</p>
                  <div class="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                    <span class="flex items-center gap-1">
                      <lucide-icon name="message-square" class="w-3 h-3"></lucide-icon>
                      {{ conv.messages }} messages
                    </span>
                    <span class="flex items-center gap-1">
                      <lucide-icon name="clock" class="w-3 h-3"></lucide-icon>
                      {{ conv.duration }}
                    </span>
                    <span *ngIf="conv.rating" class="flex items-center gap-1">
                      <lucide-icon name="star" class="w-3 h-3 text-warning fill-warning"></lucide-icon>
                      {{ conv.rating }}/5
                    </span>
                  </div>
                </div>

                <!-- Stats -->
                <div class="text-right flex-shrink-0">
                  <p [class]="'text-lg font-bold ' + getConfidenceColor(conv.confidence)">
                    {{ Math.round(conv.confidence * 100) }}%
                  </p>
                  <p class="text-xs text-muted-foreground">{{ conv.time }}</p>
                </div>

                <!-- Actions -->
                <button appButton variant="ghost" size="icon-sm" class="flex-shrink-0">
                  <lucide-icon name="more-vertical" class="w-4 h-4"></lucide-icon>
                </button>
              </div>
            </div>
          </app-card-content>
        </app-card>
      </div>
    </app-main-layout>
  `,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms {{ delay }}ms ease-out', style({ opacity: 1 }))
      ], { params: { delay: 0 } })
    ])
  ]
})
export class ConversationsComponent {
  searchQuery = '';
  filter: 'all' | 'resolved' | 'pending' | 'escalated' = 'all';
  filters: ('all' | 'resolved' | 'pending' | 'escalated')[] = ['all', 'resolved', 'pending', 'escalated'];
  Math = Math; // Make Math available in template

  conversations: Conversation[] = [
    {
      id: 1,
      user: "Sarah Martinez",
      email: "sarah.m@example.com",
      lastMessage: "Thank you! That solved my problem.",
      status: "resolved",
      confidence: 0.94,
      sentiment: "positive",
      messages: 8,
      duration: "4 min",
      time: "10:42 AM",
      rating: 5,
    },
    {
      id: 2,
      user: "John Davis",
      email: "john.d@example.com",
      lastMessage: "I need more information about the enterprise plan",
      status: "pending",
      confidence: 0.78,
      sentiment: "neutral",
      messages: 5,
      duration: "7 min",
      time: "10:38 AM",
      rating: null,
    },
    {
      id: 3,
      user: "Emma Wilson",
      email: "emma.w@example.com",
      lastMessage: "This is ridiculous! Nothing works!",
      status: "escalated",
      confidence: 0.42,
      sentiment: "negative",
      messages: 12,
      duration: "15 min",
      time: "10:25 AM",
      rating: 1,
    },
    {
      id: 4,
      user: "Michael Brown",
      email: "m.brown@example.com",
      lastMessage: "Perfect, I understand now. Thanks!",
      status: "resolved",
      confidence: 0.91,
      sentiment: "positive",
      messages: 6,
      duration: "3 min",
      time: "10:15 AM",
      rating: 5,
    },
    {
      id: 5,
      user: "Lisa Johnson",
      email: "lisa.j@example.com",
      lastMessage: "Can you help me with API integration?",
      status: "pending",
      confidence: 0.67,
      sentiment: "neutral",
      messages: 4,
      duration: "6 min",
      time: "10:08 AM",
      rating: null,
    },
    {
      id: 6,
      user: "Robert Kim",
      email: "r.kim@example.com",
      lastMessage: "Got it working! The documentation helped.",
      status: "resolved",
      confidence: 0.88,
      sentiment: "positive",
      messages: 10,
      duration: "8 min",
      time: "9:55 AM",
      rating: 4,
    },
  ];

  get filteredConversations() {
    return this.conversations.filter(conv => {
      const matchesSearch = conv.user.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesFilter = this.filter === 'all' || conv.status === this.filter;
      return matchesSearch && matchesFilter;
    });
  }

  getStatusCount(status: string) {
    return this.conversations.filter(c => c.status === status).length;
  }

  getInitials(name: string) {
    return name.split(" ").map(n => n[0]).join("");
  }

  getSentimentBg(sentiment: string) {
    if (sentiment === 'positive') return 'bg-success/20';
    if (sentiment === 'negative') return 'bg-destructive/20';
    return 'bg-muted';
  }

  getSentimentText(sentiment: string) {
    if (sentiment === 'positive') return 'text-success';
    if (sentiment === 'negative') return 'text-destructive';
    return 'text-muted-foreground';
  }

  getConfidenceColor(confidence: number) {
    if (confidence >= 0.85) return 'text-success';
    if (confidence >= 0.6) return 'text-warning';
    return 'text-destructive';
  }
}
