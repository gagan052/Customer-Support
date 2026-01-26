import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../utils/cn';
import { cva } from 'class-variance-authority';

const labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");

@Component({
  selector: 'app-label',
  standalone: true,
  imports: [CommonModule],
  styles: [':host { display: contents; }'],
  template: `
    <label [attr.for]="htmlFor" [class]="computedClass">
      <ng-content></ng-content>
    </label>
  `
})
export class LabelComponent {
  @Input() htmlFor?: string;
  @Input() class = '';

  get computedClass() {
    return cn(labelVariants(), this.class);
  }
}
