import { Directive, HostBinding, Input } from '@angular/core';
import { cn } from '../utils/cn';

@Directive({
  selector: '[appTextarea]'
})
export class TextareaDirective {
  @Input() class = '';

  @HostBinding('class')
  get computedClass() {
    return cn(
      "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      this.class
    );
  }
}
