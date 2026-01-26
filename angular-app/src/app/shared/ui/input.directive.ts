import { Directive, ElementRef, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { cn } from '../utils/cn';

@Directive({
  selector: '[appInput]'
})
export class InputDirective implements OnInit, OnChanges {
  @Input() class = '';

  constructor(private el: ElementRef) {}

  ngOnInit() {
    this.updateClasses();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['class']) {
      this.updateClasses();
    }
  }

  private updateClasses() {
    this.el.nativeElement.className = cn(
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      this.class
    );
  }
}
