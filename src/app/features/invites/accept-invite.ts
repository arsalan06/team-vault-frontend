import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/http/error-message';
import { WorkspaceService } from '../../core/workspaces/workspace.service';

/**
 * Landing page for invite links: /invites/accept?token=...
 * Accepting needs an explicit click, so link previewers or prefetchers that
 * open the URL can't redeem the invite on the user's behalf.
 */
@Component({
  selector: 'app-accept-invite',
  imports: [RouterLink],
  templateUrl: './accept-invite.html',
  styleUrl: './accept-invite.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcceptInvite {
  private readonly api = inject(WorkspaceService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  /** Bound from the ?token= query param (withComponentInputBinding). */
  readonly token = input<string>();

  protected readonly accepting = signal(false);
  protected readonly error = signal<string | null>(null);
  /** The invite was sent to a different address than the signed-in account. */
  protected readonly wrongAccount = signal(false);

  protected async accept(): Promise<void> {
    const token = this.token();
    if (!token) return;
    this.accepting.set(true);
    this.error.set(null);
    this.wrongAccount.set(false);
    try {
      const membership = await firstValueFrom(this.api.acceptInvite(token));
      await this.router.navigate(['/workspaces', membership.workspaceId]);
    } catch (error) {
      this.wrongAccount.set(error instanceof HttpErrorResponse && error.status === 403);
      this.error.set(errorMessage(error, 'Could not accept the invite.'));
      this.accepting.set(false);
    }
  }

  /** Sign out, then come straight back here once signed in as the right person. */
  protected switchAccount(): Promise<void> {
    return this.auth.logout(this.router.url);
  }
}
