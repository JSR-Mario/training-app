import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 relative overflow-hidden px-4">
      <!-- Decorative background elements -->
      <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-accent-pos/10 rounded-full blur-3xl"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent-neg/10 rounded-full blur-3xl"></div>
    
      <div class="solid-card w-full max-w-md p-8 relative z-10 transition-transform duration-500 border border-gray-300 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-accent-pos">
            Yes App
          </h1>
          <p class="text-gray-500 dark:text-gray-400 mt-2">Sign in to continue</p>
        </div>
    
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" action="#" method="post" class="space-y-5">
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              autocomplete="username"
              formControlName="username"
              class="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos focus:border-transparent transition-all outline-none text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 solid-input"
              placeholder="Enter your username"
              >
            @if (loginForm.get('username')?.invalid && loginForm.get('username')?.touched) {
              <div class="text-accent-neg text-xs mt-1">
                Username is required
              </div>
            }
          </div>
    
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              autocomplete="current-password"
              formControlName="password"
              class="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos focus:border-transparent transition-all outline-none text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 solid-input"
              placeholder="••••••••"
              >
            @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
              <div class="text-accent-neg text-xs mt-1">
                Password is required
              </div>
            }
          </div>
    
          @if (error()) {
            <div class="p-3 bg-accent-neg/10 border border-accent-neg/20 rounded-lg text-accent-neg text-sm text-center font-medium">
              {{ error() }}
            </div>
          }
    
          <button
            type="submit"
            [disabled]="loginForm.invalid || isLoading()"
            class="w-full py-3 px-4 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl shadow-sm transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none solid-btn"
            >
            @if (!isLoading()) {
              <span>Sign In</span>
            }
            @if (isLoading()) {
              <span class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            }
          </button>
        </form>

        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-200 dark:border-gray-700"></div></div>
          <div class="relative flex justify-center text-xs uppercase"><span class="bg-white dark:bg-gray-800 px-2 text-gray-500">Or</span></div>
        </div>

        <button
          type="button"
          (click)="onDemoLogin()"
          [disabled]="isLoading()"
          class="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-xl transition-all text-center border border-gray-300 dark:border-gray-600"
        >
          Try Demo
        </button>

        <div class="text-center mt-6">
          <span class="text-sm text-gray-500 dark:text-gray-400">Don't have an account? </span>
          <a routerLink="/auth/register" class="text-sm font-semibold text-accent-pos hover:underline">Sign Up</a>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  isLoading = signal(false);
  error = signal('');

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      this.error.set('');
      
      const credentials: Record<string, string> = {
        username: this.loginForm.value.username ?? '',
        password: this.loginForm.value.password ?? ''
      };
      
      this.authService.login(credentials).subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
          this.router.navigateByUrl(returnUrl);
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.status === 403) {
            this.error.set('Your email address is not verified. Please check your inbox.');
          } else if (err.status === 401) {
            this.error.set('Invalid username or password.');
          } else {
            this.error.set('Service unavailable. Please try again later.');
          }
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  onDemoLogin() {
    this.isLoading.set(true);
    this.error.set('');

    this.authService.loginAsDemo().subscribe({
      next: () => {
        this.router.navigateByUrl('/dashboard');
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('Could not log in as Demo user. Please try again.');
      }
    });
  }
}
