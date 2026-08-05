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
            <div class="relative">
              <input
                [type]="showPassword() ? 'text' : 'password'"
                id="password"
                name="password"
                autocomplete="current-password"
                formControlName="password"
                class="w-full px-4 py-3 pr-12 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos focus:border-transparent transition-all outline-none text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 solid-input"
                placeholder="••••••••"
              >
              <button
                type="button"
                (click)="togglePasswordVisibility()"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none p-1"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              >
                @if (showPassword()) {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.02 10.02 0 013.674-.838c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-6.855-1.921A3.001 3.001 0 0112 9a2.99 2.99 0 011.758.583m-1.758 5.417a3 3 0 002.83-2.83m-2.83 2.83L3 3l18 18" />
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
              </button>
            </div>
            @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
              <div class="text-accent-neg text-xs mt-1">
                Password is required
              </div>
            }
          </div>
    
          @if (error()) {
            <div class="p-3 bg-accent-neg/10 border border-accent-neg/20 rounded-lg text-accent-neg text-sm text-center font-medium space-y-2">
              <div>{{ error() }}</div>
              @if (isUnverified()) {
                <div class="pt-1 border-t border-accent-neg/20 text-xs">
                  @if (resendStatus()) {
                    <div class="text-accent-pos font-semibold mb-1">{{ resendStatus() }}</div>
                  }
                  <button
                    type="button"
                    (click)="onResendVerification()"
                    [disabled]="isResending()"
                    class="text-accent-pos underline font-semibold hover:opacity-80 disabled:opacity-50"
                  >
                    @if (isResending()) { Sending... } @else { Click here to resend verification email }
                  </button>
                </div>
              }
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
  showPassword = signal(false);
  error = signal('');
  isUnverified = signal(false);
  isResending = signal(false);
  resendStatus = signal('');
  unverifiedEmail = '';

  togglePasswordVisibility() {
    this.showPassword.update(show => !show);
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      this.error.set('');
      this.isUnverified.set(false);
      this.resendStatus.set('');
      
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
          if (err.status === 403 && err.error?.title === 'Email Verification Required') {
            this.isUnverified.set(true);
            this.error.set(err.error?.detail || 'Your email address is not verified. Please check your inbox.');
          } else if (err.status === 401) {
            this.error.set(err.error?.detail || 'Invalid username or password.');
          } else if (err.status === 403) {
            this.error.set('Access denied (CORS or Security configuration).');
          } else {
            this.error.set('Service unavailable. Please try again later.');
          }
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  onResendVerification() {
    const username = this.loginForm.value.username;
    if (!username) return;

    this.isResending.set(true);
    this.resendStatus.set('');

    // Fetch user or pass email if we have it, or use resend endpoint
    // resendVerification expects email.
    // If username is entered, let's call resendVerification with email or show prompt.
    // Wait, resendVerification API requires email. Let's ask user for email or use username if it looks like an email.
    const emailCandidate = username.includes('@') ? username : '';
    
    if (!emailCandidate) {
      this.isResending.set(false);
      this.router.navigate(['/auth/verify-email']);
      return;
    }

    this.authService.resendVerification(emailCandidate).subscribe({
      next: () => {
        this.isResending.set(false);
        this.resendStatus.set('Verification link sent! Check your inbox.');
      },
      error: (err) => {
        this.isResending.set(false);
        if (err.status === 429) {
          this.resendStatus.set('Please wait 60 seconds before requesting another email.');
        } else {
          this.resendStatus.set('Could not resend email. Try again later.');
        }
      }
    });
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
