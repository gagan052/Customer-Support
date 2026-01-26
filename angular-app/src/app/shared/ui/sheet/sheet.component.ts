import { Component, Input, Output, EventEmitter } from '@angular/core';
import { cn } from '../../utils/cn';
import { X } from 'lucide-angular';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-sheet',
  template: `
    <ng-container *ngIf="open">
      <div class="fixed inset-0 z-50 bg-black/80" (click)="close()" 
           [@fade]="'in'"></div>
      <div [class]="contentClass" [@slide]="side">
        <button (click)="close()" class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
          <lucide-icon [name]="X" class="h-4 w-4"></lucide-icon>
          <span class="sr-only">Close</span>
        </button>
        <ng-content></ng-content>
      </div>
    </ng-container>
  `,
  animations: [
    trigger('fade', [
      transition(':enter', [style({ opacity: 0 }), animate('150ms ease-out', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms ease-in', style({ opacity: 0 }))])
    ]),
    trigger('slide', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class SheetComponent {
  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();
  @Input() side: 'top' | 'bottom' | 'left' | 'right' = 'right';
  @Input() class = '';
  X = X;

  get contentClass() {
    return cn(
      "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out h-full w-3/4 border-l inset-y-0 right-0 sm:max-w-sm",
      this.class
    );
  }

  close() {
    this.open = false;
    this.openChange.emit(false);
  }
}
