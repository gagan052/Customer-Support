import { Component, Input } from '@angular/core';
import { Message } from '../services/chat.service';
import { Bot, User, AlertTriangle, CheckCircle2 } from 'lucide-angular';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-message-bubble',
  template: `
    <div 
      [@messageAnimation]
      class="flex gap-3 px-4 py-2"
      [ngClass]="{
        'justify-start': isAgent,
        'justify-end': !isAgent
      }"
    >
      <div *ngIf="isAgent" class="flex-shrink-0">
        <div class="w-9 h-9 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
          <lucide-icon [name]="Bot" class="w-5 h-5 text-accent"></lucide-icon>
        </div>
      </div>

      <div class="max-w-[75%] space-y-2" [ngClass]="{'order-first': !isAgent}">
        <div
          class="px-4 py-3 text-sm"
          [ngClass]="isAgent ? 'agent-bubble' : 'user-bubble'"
        >
          {{ message.content }}
        </div>

        <div *ngIf="showMeta && isAgent" class="flex flex-wrap items-center gap-2 px-1">
          <div *ngIf="message.confidence !== undefined" 
               appBadge [variant]="getConfidenceVariant(message.confidence)" 
               class="text-[10px]">
            {{ Math.round(message.confidence * 100) }}% {{ getConfidenceLabel(message.confidence) }}
          </div>
          
          <div *ngIf="message.intent" appBadge variant="intent" class="text-[10px]">
            {{ message.intent }}
          </div>
          
          <div *ngIf="message.sentiment" appBadge [variant]="message.sentiment" class="text-[10px]">
            {{ message.sentiment }}
          </div>
          
          <div *ngIf="message.isEscalated" appBadge variant="escalated" class="text-[10px] flex items-center gap-1">
            <lucide-icon [name]="AlertTriangle" class="w-3 h-3"></lucide-icon>
            Escalated
          </div>
          
          <div *ngIf="message.isResolved" appBadge variant="resolved" class="text-[10px] flex items-center gap-1">
            <lucide-icon [name]="CheckCircle2" class="w-3 h-3"></lucide-icon>
            Resolved
          </div>
        </div>

        <div class="text-[10px] text-muted-foreground px-1" [ngClass]="{'text-right': !isAgent}">
          {{ message.timestamp | date:'shortTime' }}
        </div>
      </div>

      <div *ngIf="!isAgent" class="flex-shrink-0">
        <div class="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <lucide-icon [name]="User" class="w-5 h-5 text-muted-foreground"></lucide-icon>
        </div>
      </div>
    </div>
  `,
  animations: [
    trigger('messageAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px) scale(0.95)' }),
        animate('300ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ])
    ])
  ]
})
export class MessageBubbleComponent {
  @Input() message!: Message;
  @Input() showMeta = true;

  get isAgent() {
    return this.message.role === 'agent';
  }

  readonly Bot = Bot;
  readonly User = User;
  readonly AlertTriangle = AlertTriangle;
  readonly CheckCircle2 = CheckCircle2;
  readonly Math = Math;

  getConfidenceVariant(confidence: number): any {
    if (confidence >= 0.85) return "confidence-high";
    if (confidence >= 0.6) return "confidence-medium";
    return "confidence-low";
  }

  getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.85) return "High Confidence";
    if (confidence >= 0.6) return "Medium";
    return "Low Confidence";
  }
}
