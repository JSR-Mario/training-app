import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword')?.value;
  const confirm = control.get('confirmPassword')?.value;
  if (password && confirm && password !== confirm) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  standalone: true,
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 relative overflow-hidden px-4">
      <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-accent-pos/10 rounded-full blur-3xl"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent-neg/10 rounded-full blur-3xl"></div>

      <div class="solid-card w-full max-w-md p-8 relative z-10 transition-transform duration-500 border border-gray-300 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
        <div class="text-center mb-6">
          <h1 class="text-3xl font-bold text-accent-pos">
            Yes App
          </h1>
          <p class="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            Set your new password
          </p>
        </div>

        @if (!hasToken()) {
          <div class="p-4 bg-accent-neg/10 border border-accent-neg/20 rounded-xl text-center space-y-3">
            <div class="text-accent-neg font-semibold text-sm">
              Invalid or Missing Link
            </div>
            <p class="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
              This password reset link is invalid or missing required security parameters. Please request a new link.
            </p>
            <a
              routerLink="/auth/login"
              class="inline-block w-full py-2.5 px-4 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl text-xs transition-all text-center solid-btn"
            >
              Back to Sign In
            </a>
          </div>
        } @else if (resetSuccess()) {
          <div class="p-4 bg-accent-pos/10 border border-accent-pos/20 rounded-xl text-center space-y-3">
            <div class="text-accent-pos font-semibold text-sm">
              Password Reset Successfully
            </div>
            <p class="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
              Your password has been changed. All previous sessions have been invalidated. Redirecting to login...
            </p>
            <a
              routerLink="/auth/login"
              class="inline-block w-full py-2.5 px-4 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl text-xs transition-all text-center solid-btn"
            >
              Sign In Now
            </a>
          </div>
        } @else {
          <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="space-y-5">
            <div>
              <label for="new-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
              <div class="relative">
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  id="new-password"
                  name="newPassword"
                  autocomplete="new-password"
                  formControlName="newPassword"
                  class="w-full px-4 py-3 pr-12 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos focus:border-transparent transition-all outline-none text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 solid-input"
                  placeholder="At least 8 characters"
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
              @if (resetForm.get('newPassword')?.invalid && resetForm.get('newPassword')?.touched) {
                <div class="text-accent-neg text-xs mt-1">
                  Must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number
                </div>
              }
            </div>

            <div>
              <label for="confirm-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
              <input
                [type]="showPassword() ? 'text' : 'password'"
                id="confirm-password"
                name="confirmPassword"
                autocomplete="new-password"
                formControlName="confirmPassword"
                class="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos focus:border-transparent transition-all outline-none text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 solid-input"
                placeholder="Repeat new password"
              >
              @if (resetForm.hasError('passwordMismatch') && resetForm.get('confirmPassword')?.touched) {
                <div class="text-accent-neg text-xs mt-1">
                  Passwords do not match
                </div>
              }
            </div>

            @if (errorMessage()) {
              <div class="p-3 bg-accent-neg/10 border border-accent-neg/20 rounded-lg text-accent-neg text-sm text-center font-medium">
                {{ errorMessage() }}
              </div>
            }

            <button
              type="submit"
              [disabled]="resetForm.invalid || isLoading()"
              class="w-full py-3 px-4 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl shadow-sm transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none solid-btn"
            >
              @if (!isLoading()) {
                <span>Update Password</span>
              }
              @if (isLoading()) {
                <span class="flex items-center justify-center">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating password...
                </span>
              }
            </button>

            <div class="text-center pt-2">
              <a
                routerLink="/auth/login"
                class="text-sm font-semibold text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                Back to Sign In
              </a>
            </div>
          </form>
        }
      </div>
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  resetForm = this.fb.group({
    newPassword: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(100),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    ]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordMatchValidator });

  token = signal<string>('');
  hasToken = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  showPassword = signal<boolean>(false);
  resetSuccess = signal<boolean>(false);
  errorMessage = signal<string>('');

  ngOnInit() {
    let rawToken = '';

    // Priority 1: URL fragment (#token=...)
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      rawToken = params.get('token') || '';
    }

    // Priority 2: Query parameter fallback (?token=...)
    if (!rawToken) {
      rawToken = this.route.snapshot.queryParams['token'] || '';
    }

    if (rawToken && rawToken.trim().length > 0) {
      this.token.set(rawToken.trim());
      this.hasToken.set(true);

      // Sanitize URL by stripping fragment and sensitive token parameter from browser address bar
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } else {
      this.hasToken.set(false);
    }
  }

  togglePasswordVisibility() {
    this.showPassword.update(show => !show);
  }

  onSubmit() {
    if (this.resetForm.valid && this.token()) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      const newPassword = this.resetForm.value.newPassword ?? '';
      this.authService.resetPassword(this.token(), newPassword).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.resetSuccess.set(true);
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2500);
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.status === 400) {
            this.errorMessage.set(err.error?.detail || 'This password reset link is invalid or has expired. Please request a new one.');
          } else {
            this.errorMessage.set('Could not reset password. Please try again later.');
          }
        }
      });
    } else {
      this.resetForm.markAllAsTouched();
    }
  }
}
