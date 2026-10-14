import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { catchError, firstValueFrom, map, of, startWith, switchMap } from 'rxjs';
import { errorMessage } from '../../../core/http/error-message';
import { Workspace, WorkspaceRole } from '../../../core/workspaces/workspace.models';
import { canRename, invitableRoles } from '../../../core/workspaces/workspace.permissions';
import { WorkspaceService } from '../../../core/workspaces/workspace.service';
import { DangerZone } from './danger-zone';
import { InviteForm } from './invite-form';
import { MemberList } from './member-list';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-workspace-detail',
  imports: [ReactiveFormsModule, RouterLink, MemberList, InviteForm, DangerZone],
  templateUrl: './workspace-detail.html',
  styleUrl: './workspace-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceDetail {
  private readonly api = inject(WorkspaceService);
  private readonly title = inject(Title);

  /** Bound from the :id route param (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly state = signal<LoadState>({ status: 'loading' });
  protected readonly workspace = signal<Workspace | null>(null);
  protected readonly role = signal<WorkspaceRole>('MEMBER');
  private readonly reloadCount = signal(0);

  protected readonly canRename = computed(() => canRename(this.role()));
  protected readonly canInvite = computed(() => invitableRoles(this.role()).length > 0);
  protected readonly storagePercent = computed(() => {
    const ws = this.workspace();
    if (!ws || ws.storageLimit <= 0) return 0;
    return Math.min(100, Math.round((ws.storageUsed / ws.storageLimit) * 100));
  });

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly renameError = signal<string | null>(null);
  protected readonly renameForm = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
  });

  protected readonly formatBytes = formatBytes;

  constructor() {
    // A route param change reuses this component, so load reactively from id();
    // switchMap discards a slower response for a workspace we've navigated away from.
    toObservable(computed(() => ({ id: this.id(), n: this.reloadCount() })))
      .pipe(
        switchMap(({ id }) =>
          this.api.get(id).pipe(
            map((result) => ({ result })),
            catchError((error: unknown) => of({ error })),
            startWith(null),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        if (res === null) {
          this.state.set({ status: 'loading' });
          this.editing.set(false);
        } else if ('result' in res) {
          this.workspace.set(res.result.workspace);
          this.role.set(res.result.role);
          this.title.setTitle(`${res.result.workspace.name} · Team Vault`);
          this.state.set({ status: 'ready' });
        } else if (
          res.error instanceof HttpErrorResponse &&
          (res.error.status === 404 || res.error.status === 400)
        ) {
          // The backend answers 404 for workspaces you aren't in, by design.
          this.state.set({ status: 'not-found' });
        } else {
          this.state.set({
            status: 'error',
            message: errorMessage(res.error, 'Could not load this workspace.'),
          });
        }
      });
  }

  protected reload(): void {
    this.reloadCount.update((n) => n + 1);
  }

  protected startRename(): void {
    this.renameForm.setValue({ name: this.workspace()?.name ?? '' });
    this.renameError.set(null);
    this.editing.set(true);
  }

  protected cancelRename(): void {
    this.editing.set(false);
  }

  protected async saveRename(): Promise<void> {
    const current = this.workspace();
    if (!current) return;
    if (this.renameForm.invalid) {
      this.renameForm.markAllAsTouched();
      return;
    }
    const name = this.renameForm.getRawValue().name.trim();
    if (name === current.name) {
      this.editing.set(false);
      return;
    }

    this.saving.set(true);
    this.renameError.set(null);
    try {
      const updated = await firstValueFrom(this.api.rename(current.id, name));
      this.workspace.set(updated);
      this.title.setTitle(`${updated.name} · Team Vault`);
      this.editing.set(false);
    } catch (error) {
      this.renameError.set(errorMessage(error, 'Could not rename the workspace.'));
    } finally {
      this.saving.set(false);
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}
