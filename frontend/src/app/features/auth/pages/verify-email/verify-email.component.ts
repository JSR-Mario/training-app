import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-verify-email',
  imports: [RouterLink, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 relative overflow-hidden px-4">
      <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-accent-pos/10 rounded-full blur-3xl"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent-neg/10 rounded-full blur-3xl"></div>

      <div class="solid-card w-full max-w-md p-8 relative z-10 border border-gray-300 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800 text-center">
        @if (isLoading()) {
          <div class="py-8 space-y-4">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-accent-pos border-t-transparent"></div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">Verifying your email...</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Please wait a moment while we validate your token.</p>
          </div>
        } @else if (isSuccess()) {
          <div class="py-6 space-y-4">
            <div class="w-16 h-16 bg-accent-pos/20 text-accent-pos rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
              ✓
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Email Verified!</h2>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Your account is active and ready to use. You can now sign in to start tracking your workouts.
            </p>
            <div class="pt-4">
              <a routerLink="/auth/login" class="block w-full py-3 px-4 bg-accent-pos text-white font-semibold rounded-xl text-center hover:opacity-90">
                Sign In Now
              </a>
            </div>
          </div>
        } @else {
          <div class="py-6 space-y-4">
            <div class="w-16 h-16 bg-accent-neg/20 text-accent-neg rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
              ✕
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Verification Failed</h2>
            <p class="text-sm text-accent-neg font-medium">{{ errorMessage() }}</p>

            <div class="pt-4 text-left border-t border-gray-200 dark:border-gray-700 mt-4 space-y-3">
              <label for="resendEmailInput" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Resend Verification Email</label>
              <input
                id="resendEmailInput"
                type="email"
                [(ngModel)]="resendEmail"
                placeholder="Enter your registered email"
                class="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl outline-none text-black dark:text-white text-sm"
              >
              @if (resendStatus()) {
                <div class="text-xs font-medium text-accent-pos">{{ resendStatus() }}</div>
              }
              <button
                (click)="onResend()"
                [disabled]="isResending() || !resendEmail"
                class="w-full py-2.5 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50"
              >
                @if (isResending()) { Resending... } @else { Send New Verification Link }
              </button>
            </div>

            <div class="pt-2">
              <a routerLink="/auth/login" class="text-sm text-accent-pos hover:underline">Back to Sign In</a>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  isLoading = signal(true);
  isSuccess = signal(false);
  errorMessage = signal('');
  resendEmail = '';
  isResending = signal(false);
  resendStatus = signal('');

  ngOnInit() {
    const token = this.route.snapshot.queryParams['token'];
    if (!token) {
      this.isLoading.set(false);
      this.errorMessage.set('No verification token provided in the link.');
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.error?.detail) {
          this.errorMessage.set(err.error.detail);
        } else {
          this.errorMessage.set('Invalid or expired verification link.');
        }
      }
    });
  }

  onResend() {
    if (!this.resendEmail) return;
    this.isResending.set(true);
    this.resendStatus.set('');

    this.authService.resendVerification(this.resendEmail).subscribe({
      next: () => {
        this.isResending.set(false);
        this.resendStatus.set('Verification link sent! Check your email inbox.');
      },
      error: (err) => {
        this.isResending.set(false);
        if (err.status === 429) {
          this.resendStatus.set('Please wait 60 seconds before requesting another email.');
        } else {
          this.resendStatus.set('Failed to resend email. Check address and try again.');
        }
      }
    });
  }
}
