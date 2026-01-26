import { Component, Input } from '@angular/core';
import { cn } from '../../utils/cn';
import { RadioGroupComponent } from './radio-group.component';
import { Circle } from 'lucide-angular';

@Component({
  selector: 'app-radio-group-item',
  template: `
    <button 
      type="button" 
      role="radio" 
      [attr.id]="id"
      [attr.aria-checked]="checked" 
      [class]="computedClass" 
      (click)="select()">
      <span class="flex items-center justify-center" *ngIf="checked">
        <lucide-icon [name]="Circle" class="h-2.5 w-2.5 fill-current text-current"></lucide-icon>
      </span>
    </button>
  `,
  host: {
    '[attr.data-state]': 'checked ? "checked" : "unchecked"'
  }
})
export class RadioGroupItemComponent {
  @Input() value: any;
  @Input() id?: string;
  @Input() class = '';
  checked = false;
  group!: RadioGroupComponent;
  Circle = Circle;

  get computedClass() {
    return cn(
      "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      this.class
    );
  }

  registerGroup(group: RadioGroupComponent) {
    this.group = group;
  }

  setChecked(checked: boolean) {
    this.checked = checked;
  }

  select() {
    if (this.group) {
      this.group.select(this.value);
    }
  }
}
