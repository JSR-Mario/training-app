import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { Router, ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['resetPassword']);

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParams: { token: 'query-token-123' }
            }
          }
        }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and read token from route queryParams or hash', () => {
    expect(component.hasToken()).toBeTrue();
    expect(component.token()).toBe('query-token-123');
  });

  it('should validate password complexity and matching', () => {
    component.resetForm.setValue({
      newPassword: 'simple',
      confirmPassword: 'simple'
    });
    expect(component.resetForm.invalid).toBeTrue();
    expect(component.resetForm.get('newPassword')?.hasError('pattern')).toBeTrue();

    component.resetForm.setValue({
      newPassword: 'ValidPassword1',
      confirmPassword: 'DifferentPassword2'
    });
    expect(component.resetForm.invalid).toBeTrue();
    expect(component.resetForm.hasError('passwordMismatch')).toBeTrue();

    component.resetForm.setValue({
      newPassword: 'A1a' + 'a'.repeat(70),
      confirmPassword: 'A1a' + 'a'.repeat(70)
    });
    expect(component.resetForm.invalid).toBeTrue();
    expect(component.resetForm.get('newPassword')?.hasError('maxlength')).toBeTrue();

    component.resetForm.setValue({
      newPassword: 'ValidPassword1',
      confirmPassword: 'ValidPassword1'
    });
    expect(component.resetForm.valid).toBeTrue();
  });

  it('should call authService.resetPassword and show success state', () => {
    authServiceSpy.resetPassword.and.returnValue(of({ message: 'Password has been reset successfully.' }));

    component.resetForm.setValue({
      newPassword: 'ValidPassword1',
      confirmPassword: 'ValidPassword1'
    });

    component.onSubmit();

    expect(authServiceSpy.resetPassword).toHaveBeenCalledWith('query-token-123', 'ValidPassword1');
    expect(component.resetSuccess()).toBeTrue();
  });

  it('should display error message on reset failure', () => {
    authServiceSpy.resetPassword.and.returnValue(
      throwError(() => ({
        status: 400,
        error: { detail: 'This password reset link is invalid or has expired.' }
      }))
    );

    component.resetForm.setValue({
      newPassword: 'ValidPassword1',
      confirmPassword: 'ValidPassword1'
    });

    component.onSubmit();

    expect(component.resetSuccess()).toBeFalse();
    expect(component.errorMessage()).toContain('invalid or has expired');
  });
});
