import { Component, Input } from '@angular/core';
import { cn } from '../../utils/cn';

@Component({
  selector: 'app-card',
  template: `<ng-content></ng-content>`,
  host: {
    '[class]': 'computedClass'
  }
})
export class CardComponent {
  @Input() class = '';
  get computedClass() {
    return cn("rounded-lg border bg-card text-card-foreground shadow-sm", this.class);
  }
}

@Component({
  selector: 'app-card-header',
  template: `<ng-content></ng-content>`,
  host: {
    '[class]': 'computedClass'
  }
})
export class CardHeaderComponent {
  @Input() class = '';
  get computedClass() {
    return cn("flex flex-col space-y-1.5 p-6", this.class);
  }
}

@Component({
  selector: 'app-card-title',
  template: `<ng-content></ng-content>`,
  host: {
    '[class]': 'computedClass'
  }
})
export class CardTitleComponent {
  @Input() class = '';
  get computedClass() {
    return cn("text-2xl font-semibold leading-none tracking-tight", this.class);
  }
}

@Component({
  selector: 'app-card-description',
  template: `<ng-content></ng-content>`,
  host: {
    '[class]': 'computedClass'
  }
})
export class CardDescriptionComponent {
  @Input() class = '';
  get computedClass() {
    return cn("text-sm text-muted-foreground", this.class);
  }
}

@Component({
  selector: 'app-card-content',
  template: `<ng-content></ng-content>`,
  host: {
    '[class]': 'computedClass'
  }
})
export class CardContentComponent {
  @Input() class = '';
  get computedClass() {
    return cn("p-6 pt-0", this.class);
  }
}

@Component({
  selector: 'app-card-footer',
  template: `<ng-content></ng-content>`,
  host: {
    '[class]': 'computedClass'
  }
})
export class CardFooterComponent {
  @Input() class = '';
  get computedClass() {
    return cn("flex items-center p-6 pt-0", this.class);
  }
}
