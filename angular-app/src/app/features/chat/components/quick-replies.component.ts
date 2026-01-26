import { Component, Input, Output, EventEmitter } from '@angular/core';
import { animate, style, transition, trigger, query, stagger } from '@angular/animations';

@Component({
  selector: 'app-quick-replies',
  template: `
    <div 
      [@container]
      class="px-4 py-2"
    >
      <p class="text-xs text-muted-foreground mb-2">Quick questions:</p>
      <div class="flex flex-wrap gap-2">
        <div *ngFor="let reply of replies" [@item]>
          <button
            appButton
            variant="glass"
            size="sm"
            (click)="onSelect.emit(reply)"
            class="text-xs rounded-full"
          >
            {{ reply }}
          </button>
        </div>
      </div>
    </div>
  `,
  animations: [
    trigger('container', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('item', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class QuickRepliesComponent {
  @Input() replies: string[] = [];
  @Output() onSelect = new EventEmitter<string>();
}
