import { Component, Input } from '@angular/core';
import { cn } from '../../utils/cn';

@Component({
  selector: 'app-separator',
  template: `
    <div [class]="computedClass"></div>
  `
})
export class SeparatorComponent {
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
  @Input() class = '';

  get computedClass() {
    return cn(
      "shrink-0 bg-border",
      this.orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      this.class
    );
  }
}
