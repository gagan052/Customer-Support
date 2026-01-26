import { Component } from '@angular/core';

@Component({
  selector: 'app-signup',
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background p-4">
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Sign Up</h1>
        <p class="text-muted-foreground">Please use Login for now.</p>
        <a routerLink="/login" class="text-primary hover:underline mt-4 block">Go to Login</a>
      </div>
    </div>
  `
})
export class SignupComponent {}
