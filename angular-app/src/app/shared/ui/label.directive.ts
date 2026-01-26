import { Directive, ElementRef, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { cn } from '../utils/cn';
import { cva } from 'class-variance-authority';

const labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");

@Directive({
  selector: '[appLabel]'
})
export class LabelDirective implements OnInit, OnChanges {
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
    this.el.nativeElement.className = cn(labelVariants(), this.class);
  }
}
