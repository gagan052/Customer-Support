import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <router-outlet></router-outlet>
    <ngx-sonner-toaster position="top-right"></ngx-sonner-toaster>
  `
})
export class AppComponent {}
