import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

// Placeholder landing page for signed-in users.
@Component({
  selector: 'app-home',
  template: `
    <main class="page">
      <h1>Welcome, {{ auth.user()?.name }}</h1>
      <p>Signed in as {{ auth.user()?.email }}</p>
      <button type="button" (click)="auth.logout()">Sign out</button>
    </main>
  `,
  styles: `
    .page {
      max-width: 720px;
      margin: 0 auto;
      padding: 32px 16px;
    }
    button {
      padding: 8px 16px;
      font: inherit;
      color: inherit;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly auth = inject(AuthService);
}
