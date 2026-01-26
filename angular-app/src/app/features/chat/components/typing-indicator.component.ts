import { Component } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-typing-indicator',
  template: `
    <div 
      [@fadeInOut]
      class="flex items-center gap-3 p-4"
    >
      <div class="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
        <span class="text-accent text-sm font-bold">AI</span>
      </div>
      <div class="agent-bubble px-4 py-3 flex items-center gap-1.5">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `,
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class TypingIndicatorComponent {}
