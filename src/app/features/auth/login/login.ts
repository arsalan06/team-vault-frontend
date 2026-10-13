import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { safeReturnUrl } from '../../../core/auth/return-url';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: '../auth-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login({ email: email.trim(), password });
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (error) {
      this.errorMessage.set(this.describeError(error));
      this.form.controls.password.reset();
    } finally {
      this.submitting.set(false);
    }
  }

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  /** Passed through to the signup link so the destination survives switching pages. */
  protected returnUrl(): string | null {
    return this.route.snapshot.queryParamMap.get('returnUrl');
  }

  private describeError(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'Something went wrong. Please try again.';
    switch (error.status) {
      case 0:
        return 'Cannot reach the server. Check your connection and try again.';
      case 400:
      case 401:
        return 'Invalid email or password.';
      case 429:
        return 'Too many login attempts. Please wait a few minutes and try again.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}
