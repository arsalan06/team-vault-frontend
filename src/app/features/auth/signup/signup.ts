import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { safeReturnUrl } from '../../../core/auth/return-url';

// Mirror the backend's registerSchema so users see problems before submitting.
export const NAME_MIN = 2;
export const NAME_MAX = 100;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

/** Group-level validator: flags `passwordMismatch` when the two password fields differ. */
const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
};

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: '../auth-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Signup {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly limits = { NAME_MIN, NAME_MAX, PASSWORD_MIN, PASSWORD_MAX };

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      name: ['', [Validators.required, Validators.minLength(NAME_MIN), Validators.maxLength(NAME_MAX)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(PASSWORD_MIN),
          Validators.maxLength(PASSWORD_MAX),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

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
      const { name, email, password } = this.form.getRawValue();
      await this.auth.register({ name: name.trim(), email: email.trim(), password });
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (error) {
      this.handleError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  /** Passed through to the login link so the destination survives switching pages. */
  protected returnUrl(): string | null {
    return this.route.snapshot.queryParamMap.get('returnUrl');
  }

  private handleError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      // Attach it to the field, so it shows where the user is looking.
      this.form.controls.email.setErrors({ taken: true });
      this.form.controls.email.markAsTouched();
      return;
    }

    this.errorMessage.set(this.describeError(error));
  }

  private describeError(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'Something went wrong. Please try again.';
    switch (error.status) {
      case 0:
        return 'Cannot reach the server. Check your connection and try again.';
      case 400:
        return 'Some details are invalid. Please check the form and try again.';
      case 429:
        return 'Too many attempts. Please wait a few minutes and try again.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}
