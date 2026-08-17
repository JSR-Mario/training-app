import { inject, Injectable, NgZone } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  private swUpdate = inject(SwUpdate);
  private ngZone = inject(NgZone);

  constructor() {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    // 1. Activate and reload when a new version is downloaded and ready
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        this.swUpdate.activateUpdate().then(() => {
          this.reloadPage();
        });
      });

    // 2. Recover automatically if service worker gets into an unrecoverable state
    this.swUpdate.unrecoverable.subscribe(() => {
      this.reloadPage();
    });

    // 3. Proactive update checks outside Angular zone to avoid triggering unnecessary change detection
    this.ngZone.runOutsideAngular(() => {
      // Check immediately on startup
      this.checkForUpdate();

      // Check when user returns to the app (crucial on mobile PWA resuming from background)
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            this.checkForUpdate();
          }
        });
      }

      if (typeof window !== 'undefined') {
        window.addEventListener('focus', () => {
          this.checkForUpdate();
        });
      }

      // Periodic check every 15 minutes
      interval(15 * 60 * 1000).subscribe(() => {
        this.checkForUpdate();
      });
    });
  }

  /**
   * Reloads the application. Isolated for testability.
   */
  public reloadPage(): void {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  /**
   * Triggers a manual check for updates against ngsw.json on the server.
   */
  public checkForUpdate(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }
    this.swUpdate.checkForUpdate().catch(() => {
      // Ignore network errors during background update checks
    });
  }
}
