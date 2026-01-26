import { Component } from '@angular/core';

@Component({
  selector: 'app-main-layout',
  template: `
    <div class="min-h-screen bg-background">
      <app-sidebar></app-sidebar>
      <main class="ml-64 min-h-screen">
        <ng-content></ng-content>
      </main>
    </div>
  `
})
export class MainLayoutComponent {}
