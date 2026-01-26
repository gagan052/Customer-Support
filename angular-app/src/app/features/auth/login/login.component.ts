import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-login',
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <app-card class="w-full max-w-md">
        <app-card-header>
          <app-card-title>Welcome Back</app-card-title>
          <app-card-description>Sign in to your account to continue</app-card-description>
        </app-card-header>
        <form [formGroup]="loginForm" (ngSubmit)="handleLogin()">
          <app-card-content class="space-y-4">
            <div class="space-y-2">
              <label appLabel for="email">Email</label>
              <input appInput id="email" type="email" placeholder="m@example.com" formControlName="email" required />
            </div>
            <div class="space-y-2">
              <label appLabel for="password">Password</label>
              <input appInput id="password" type="password" formControlName="password" required />
            </div>
          </app-card-content>
          <app-card-footer class="flex flex-col space-y-4">
            <button appButton type="submit" class="w-full" [disabled]="loading">
              <lucide-icon *ngIf="loading" name="loader-2" class="mr-2 h-4 w-4 animate-spin"></lucide-icon>
              Sign In
            </button>
            <div class="text-center text-sm text-muted-foreground">
              Don't have an account? 
              <a routerLink="/signup" class="text-primary hover:underline">
                Sign up
              </a>
            </div>
          </app-card-footer>
        </form>
      </app-card>
    </div>
  `
})
export class LoginComponent {
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  async handleLogin() {
    if (this.loginForm.invalid) return;
    
    this.loading = true;
    const { email, password } = this.loginForm.value;
    
    try {
      const { error } = await this.authService.signInWithPassword(email!, password!);
      if (error) throw error;
      
      toast.success("Welcome back!");
      this.router.navigate(['/chat']);
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      this.loading = false;
    }
  }
}
