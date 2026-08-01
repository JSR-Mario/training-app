import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['register']);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should mark form controls touched on submit if form is invalid', () => {
    component.onSubmit();
    expect(component.registerForm.touched).toBeTrue();
    expect(component.showPrivacyModal()).toBeFalse();
  });

  it('should open privacy modal on valid form submit without calling authService.register', () => {
    component.registerForm.setValue({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    component.onSubmit();

    expect(component.showPrivacyModal()).toBeTrue();
    expect(authServiceSpy.register).not.toHaveBeenCalled();
  });

  it('should close privacy modal on cancelPrivacyModal without calling authService.register', () => {
    component.showPrivacyModal.set(true);

    component.cancelPrivacyModal();

    expect(component.showPrivacyModal()).toBeFalse();
    expect(authServiceSpy.register).not.toHaveBeenCalled();
  });

  it('should close privacy modal and call authService.register on acceptPrivacyAndRegister', () => {
    const mockResponse = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      createdAt: '2026-08-01T00:00:00Z',
      role: 'ROLE_USER'
    };
    authServiceSpy.register.and.returnValue(of(mockResponse));

    component.registerForm.setValue({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    component.showPrivacyModal.set(true);
    component.acceptPrivacyAndRegister();

    expect(component.showPrivacyModal()).toBeFalse();
    expect(authServiceSpy.register).toHaveBeenCalledWith({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    expect(component.registeredSuccess()).toBeTrue();
    expect(component.registeredEmail()).toBe('test@example.com');
  });

  it('should set error signal if authService.register fails', () => {
    authServiceSpy.register.and.returnValue(throwError(() => ({ status: 409 })));

    component.registerForm.setValue({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    component.acceptPrivacyAndRegister();

    expect(component.error()).toBe('Username or email is already taken');
    expect(component.isLoading()).toBeFalse();
  });
});
