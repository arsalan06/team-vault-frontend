import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

/** Layout for every signed-in page: top bar plus the routed page below it. */
@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterOutlet],
  template: `
    <header class="topbar">
      <a routerLink="/workspaces" class="brand">Team Vault</a>
      <div class="account">
        <span class="muted user">{{ auth.user()?.name }}</span>
        <button type="button" class="btn btn-sm" (click)="auth.logout()">Sign out</button>
      </div>
    </header>
    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: `
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }
    .brand {
      font-weight: 700;
      color: inherit;
      text-decoration: none;
    }
    .account {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .user {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .content {
      max-width: 960px;
      margin: 0 auto;
      padding: 24px 16px 48px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  protected readonly auth = inject(AuthService);
}
