import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Send, Mic, Paperclip } from 'lucide-angular';

@Component({
  selector: 'app-chat-input',
  template: `
    <div class="p-4 bg-card/50 backdrop-blur-sm border-t border-border">
      <div class="relative flex items-end gap-2">
        <button appButton variant="ghost" size="icon" class="text-muted-foreground hover:text-foreground shrink-0">
          <lucide-icon [name]="Paperclip" class="w-5 h-5"></lucide-icon>
        </button>
        
        <div class="relative flex-1">
          <textarea
            appInput
            rows="1"
            placeholder="Type your message..."
            class="min-h-[44px] max-h-32 py-3 pr-12 resize-none"
            [(ngModel)]="message"
            (keydown.enter)="handleKeyDown($event)"
            [disabled]="disabled"
          ></textarea>
          <button 
            appButton
            size="icon-sm"
            [variant]="message.trim() ? 'default' : 'ghost'"
            class="absolute right-1.5 bottom-1.5 transition-all duration-200"
            [disabled]="!message.trim() || disabled"
            (click)="handleSend()"
          >
            <lucide-icon [name]="Send" class="w-4 h-4"></lucide-icon>
          </button>
        </div>

        <button appButton variant="ghost" size="icon" class="text-muted-foreground hover:text-foreground shrink-0">
          <lucide-icon [name]="Mic" class="w-5 h-5"></lucide-icon>
        </button>
      </div>
      <div class="mt-2 text-center">
        <p class="text-[10px] text-muted-foreground">
          AI can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  `
})
export class ChatInputComponent {
  @Input() disabled = false;
  @Output() onSend = new EventEmitter<string>();

  message = "";
  readonly Send = Send;
  readonly Mic = Mic;
  readonly Paperclip = Paperclip;

  handleSend() {
    if (this.message.trim() && !this.disabled) {
      this.onSend.emit(this.message.trim());
      this.message = "";
    }
  }

  handleKeyDown(event: Event) {
    const e = event as KeyboardEvent;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSend();
    }
  }
}
