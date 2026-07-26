import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 relative overflow-hidden px-4">
      <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-accent-pos/10 rounded-full blur-3xl"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent-neg/10 rounded-full blur-3xl"></div>

      <div class="solid-card w-full max-w-md p-8 relative z-10 border border-gray-300 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
        @if (!registeredSuccess()) {
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-accent-pos">Create Account</h1>
            <p class="text-gray-500 dark:text-gray-400 mt-2">Sign up to start tracking your progress</p>
          </div>

          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-5">
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
              <input
                type="text"
                id="username"
                formControlName="username"
                class="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white"
                placeholder="Choose a username"
              >
              @if (registerForm.get('username')?.invalid && registerForm.get('username')?.touched) {
                <div class="text-accent-neg text-xs mt-1">Username is required (min 3 chars)</div>
              }
            </div>

            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
              <input
                type="email"
                id="email"
                formControlName="email"
                class="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white"
                placeholder="name@example.com"
              >
              @if (registerForm.get('email')?.invalid && registerForm.get('email')?.touched) {
                <div class="text-accent-neg text-xs mt-1">Please enter a valid email address</div>
              }
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input
                type="password"
                id="password"
                formControlName="password"
                class="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white"
                placeholder="Minimum 6 characters"
              >
              @if (registerForm.get('password')?.invalid && registerForm.get('password')?.touched) {
                <div class="text-accent-neg text-xs mt-1">Password must be at least 6 characters</div>
              }
            </div>

            @if (error()) {
              <div class="p-3 bg-accent-neg/10 border border-accent-neg/20 rounded-lg text-accent-neg text-sm text-center font-medium">
                {{ error() }}
              </div>
            }

            <button
              type="submit"
              [disabled]="registerForm.invalid || isLoading()"
              class="w-full py-3 px-4 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              @if (!isLoading()) {
                <span>Register</span>
              } @else {
                <span>Registering...</span>
              }
            </button>

            <div class="text-center mt-4">
              <span class="text-sm text-gray-500 dark:text-gray-400">Already have an account? </span>
              <a routerLink="/auth/login" class="text-sm font-semibold text-accent-pos hover:underline">Sign In</a>
            </div>
          </form>
        } @else {
          <div class="text-center py-6 space-y-4">
            <div class="w-16 h-16 bg-accent-pos/20 text-accent-pos rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Verify Your Email</h2>
            <p class="text-gray-600 dark:text-gray-300 text-sm">
              We have sent a verification link to <strong class="text-gray-900 dark:text-white">{{ registeredEmail() }}</strong>. Please check your inbox to activate your account.
            </p>

            <div class="pt-4 space-y-3">
              <a
                routerLink="/auth/login"
                class="block w-full py-3 px-4 bg-accent-pos text-white font-semibold rounded-xl text-center hover:opacity-90"
              >
                Back to Sign In
              </a>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  registerForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isLoading = signal(false);
  error = signal('');
  registeredSuccess = signal(false);
  registeredEmail = signal('');

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading.set(true);
      this.error.set('');

      const payload = {
        username: this.registerForm.value.username ?? '',
        email: this.registerForm.value.email ?? '',
        password: this.registerForm.value.password ?? ''
      };

      this.authService.register(payload).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.registeredEmail.set(res.email);
          this.registeredSuccess.set(true);
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.error?.detail) {
            this.error.set(err.error.detail);
          } else if (err.status === 409) {
            this.error.set('Username or email is already taken');
          } else {
            this.error.set('Registration failed. Please try again later.');
          }
        }
      });
    } else {
      this.registerForm.markAllAsTouched();
    }
  }
}
