import { Component, Input, Output, EventEmitter, forwardRef, ContentChildren, QueryList, AfterContentInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { cn } from '../../utils/cn';
import { RadioGroupItemComponent } from './radio-group-item.component';

@Component({
  selector: 'app-radio-group',
  template: `<div [class]="computedClass"><ng-content></ng-content></div>`,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RadioGroupComponent), multi: true }]
})
export class RadioGroupComponent implements ControlValueAccessor, AfterContentInit {
  @Input() class = '';
  @Input() value: 'openai' | 'gemini' = 'openai';
  @Output() valueChange = new EventEmitter<'openai' | 'gemini'>();
  
  @ContentChildren(forwardRef(() => RadioGroupItemComponent)) items!: QueryList<RadioGroupItemComponent>;
  
  onChange: any = () => {};
  onTouched: any = () => {};

  get computedClass() { return cn("grid gap-2", this.class); }

  ngAfterContentInit() {
    this.items.forEach(item => {
      item.registerGroup(this);
    });
    // Initial update in case value was set before content init
    this.updateItems();
  }

  select(value: any) {
    this.value = value;
    this.onChange(value);
    this.onTouched();
    this.valueChange.emit(value);
    this.updateItems();
  }

  writeValue(value: any): void {
    this.value = value;
    this.updateItems();
  }

  updateItems() {
    if (this.items) {
      this.items.forEach(item => item.setChecked(this.value === item.value));
    }
  }
  
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
}
