import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { errorMessage } from '../../../core/http/error-message';
import { Workspace, WorkspaceRole } from '../../../core/workspaces/workspace.models';
import { canDelete, canLeave } from '../../../core/workspaces/workspace.permissions';
import { WorkspaceService } from '../../../core/workspaces/workspace.service';

/** Irreversible actions: leaving (non-owners) and deleting (owner only). */
@Component({
  selector: 'app-danger-zone',
  templateUrl: './danger-zone.html',
  styleUrl: './danger-zone.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DangerZone {
  private readonly api = inject(WorkspaceService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly workspace = input.required<Workspace>();
  readonly role = input.required<WorkspaceRole>();

  protected readonly canLeave = computed(() => canLeave(this.role()));
  protected readonly canDelete = computed(() => canDelete(this.role()));

  protected readonly confirmingLeave = signal(false);
  protected readonly deleteConfirmText = signal('');
  /** Typing the exact name guards against deleting the wrong workspace by reflex. */
  protected readonly deleteUnlocked = computed(
    () => this.deleteConfirmText().trim() === this.workspace().name,
  );
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async leave(): Promise<void> {
    const userId = this.auth.user()?.id;
    if (!userId) return;
    await this.run(() => this.api.removeMember(this.workspace().id, userId));
  }

  protected async delete(): Promise<void> {
    if (!this.deleteUnlocked()) return;
    await this.run(() => this.api.delete(this.workspace().id));
  }

  private async run(action: () => Observable<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(action(), { defaultValue: undefined });
      await this.router.navigate(['/workspaces']);
    } catch (error) {
      this.error.set(errorMessage(error));
      this.busy.set(false);
    }
  }
}
