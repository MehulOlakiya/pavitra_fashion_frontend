import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../shared/toast/toast.service';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { UserStateService } from '../../core/user-state.service';

interface FieldErrors {
  email: string[];
  password: string[];
}

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private toast = inject(ToastService);
  private authService = inject(AuthService);
  private userState = inject(UserStateService);

  constructor(private router: Router) {}

  email = '';
  password = '';
  rememberMe = false;
  showPassword = false;
  submitted = false;

  errors: FieldErrors = { email: [], password: [] };

  private validateEmail(value: string): string[] {
    const errs: string[] = [];
    if (!value.trim()) {
      errs.push('Email is required.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      errs.push('Enter a valid email address.');
    }
    return errs;
  }

  private validatePassword(value: string): string[] {
    const errs: string[] = [];
    if (!value) {
      errs.push('Password is required.');
      return errs;
    }
    if (value.length < 8) errs.push('At least 8 characters.');
    if (!/[A-Z]/.test(value)) errs.push('At least one uppercase letter.');
    if (!/[^a-zA-Z0-9]/.test(value))
      errs.push('At least one special character.');
    return errs;
  }

  onEmailBlur(): void {
    if (this.submitted) this.errors.email = this.validateEmail(this.email);
  }

  onPasswordBlur(): void {
    if (this.submitted)
      this.errors.password = this.validatePassword(this.password);
  }

  loading = false;

  onSubmit(): void {
    this.submitted = true;
    this.errors.email = this.validateEmail(this.email);
    this.errors.password = this.validatePassword(this.password);

    const allErrors = [...this.errors.email, ...this.errors.password];
    if (allErrors.length) {
      this.toast.error('Sign-in failed', allErrors[0]);
      return;
    }

    this.loading = true;
    this.authService
      .login({ email: this.email, password: this.password })
      .subscribe({
        next: (res) => {
          this.loading = false;
          localStorage.setItem('accessToken', res.accessToken);
          localStorage.setItem('user', JSON.stringify(res.user));
          this.userState.setUser(res.user);
          this.toast.success('Welcome back!', `Signed in as ${res.user.name}.`);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading = false;
          const message: string =
            err?.error?.message ?? 'Something went wrong. Please try again.';
          this.toast.error('Sign-in failed', message);
        },
      });
  }
}
