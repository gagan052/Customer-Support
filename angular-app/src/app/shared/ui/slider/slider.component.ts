import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { cn } from '../../utils/cn';

@Component({
  selector: 'app-slider',
  template: `
    <div [class]="containerClass" (mousedown)="onMouseDown($event)">
      <div class="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <div class="absolute h-full bg-primary" [style.width.%]="percentage"></div>
      </div>
      <div 
        class="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        [style.left.%]="percentage"
        style="position: absolute; transform: translateX(-50%);"
        role="slider"
        [attr.aria-valuemin]="min"
        [attr.aria-valuemax]="max"
        [attr.aria-valuenow]="value[0]"
        tabindex="0"
      ></div>
    </div>
  `,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SliderComponent), multi: true }]
})
export class SliderComponent implements ControlValueAccessor {
  @Input() class = '';
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;
  @Input() value: number[] = [0];
  @Output() valueChange = new EventEmitter<number[]>();

  onChange: any = () => {};
  onTouched: any = () => {};

  get containerClass() {
    return cn("relative flex w-full touch-none select-none items-center cursor-pointer", this.class);
  }

  get percentage() {
    const val = this.value[0];
    return ((val - this.min) / (this.max - this.min)) * 100;
  }

  onMouseDown(event: MouseEvent) {
    this.updateValueFromEvent(event);
    
    const moveHandler = (e: MouseEvent) => this.updateValueFromEvent(e);
    const upHandler = () => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
    };
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  }

  updateValueFromEvent(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect?.() 
                 || (event.target as HTMLElement).parentElement?.getBoundingClientRect();
    
    if (!rect) return;

    let x = event.clientX - rect.left;
    if (x < 0) x = 0;
    if (x > rect.width) x = rect.width;

    const percent = x / rect.width;
    let newValue = this.min + (percent * (this.max - this.min));
    
    const steps = Math.round((newValue - this.min) / this.step);
    newValue = this.min + (steps * this.step);

    this.value = [newValue];
    this.onChange(this.value);
    this.valueChange.emit(this.value);
  }

  writeValue(value: number[]): void {
    if (value) this.value = value;
  }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
}
