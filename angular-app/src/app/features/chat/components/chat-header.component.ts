import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Bot, Phone, MoreVertical, Zap } from 'lucide-angular';

@Component({
  selector: 'app-chat-header',
  template: `
    <div class="px-4 py-3 border-b border-border bg-card/80 backdrop-blur-lg flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="relative">
          <div class="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center animate-pulse-glow">
            <lucide-icon [name]="Bot" class="w-5 h-5 text-accent"></lucide-icon>
          </div>
          <div 
            class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card"
            [ngClass]="{
              'bg-success': status === 'online',
              'bg-warning': status === 'busy',
              'bg-muted-foreground': status === 'offline'
            }"
          ></div>
        </div>
        <div>
          <h2 class="font-semibold text-sm flex items-center gap-2">
            {{ agentName }}
            <lucide-icon [name]="Zap" class="w-3.5 h-3.5 text-accent"></lucide-icon>
          </h2>
          <p class="text-xs text-muted-foreground flex items-center gap-1">
            <span class="capitalize">{{ status }}</span>
            <span>•</span>
            <span>Powered by RAG + Decision Engine</span>
          </p>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <button 
          *ngIf="showEscalate"
          appButton 
          variant="outline" 
          size="sm" 
          (click)="onEscalate.emit()" 
          class="text-xs"
        >
          <lucide-icon [name]="Phone" class="w-3.5 h-3.5 mr-1.5"></lucide-icon>
          Talk to Human
        </button>
        <button appButton variant="ghost" size="icon-sm">
          <lucide-icon [name]="MoreVertical" class="w-4 h-4"></lucide-icon>
        </button>
      </div>
    </div>
  `
})
export class ChatHeaderComponent {
  @Input() agentName = "AI Support Agent";
  @Input() status: "online" | "busy" | "offline" = "online";
  @Input() showEscalate = false;
  @Output() onEscalate = new EventEmitter<void>();

  readonly Bot = Bot;
  readonly Phone = Phone;
  readonly MoreVertical = MoreVertical;
  readonly Zap = Zap;
}
