import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, firstValueFrom, map, Observable, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { errorMessage } from '../../../core/http/error-message';
import { AssignableRole, Member, WorkspaceRole } from '../../../core/workspaces/workspace.models';
import { canChangeRole, canRemove } from '../../../core/workspaces/workspace.permissions';
import { WorkspaceService } from '../../../core/workspaces/workspace.service';

@Component({
  selector: 'app-member-list',
  templateUrl: './member-list.html',
  styleUrl: './member-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberList {
  private readonly api = inject(WorkspaceService);
  private readonly auth = inject(AuthService);

  readonly workspaceId = input.required<string>();
  /** The signed-in user's role in this workspace. */
  readonly role = input.required<WorkspaceRole>();

  protected readonly currentUserId = computed(() => this.auth.user()?.id ?? '');
  protected readonly members = signal<Member[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly loadingMore = signal(false);
  protected readonly actionError = signal<string | null>(null);
  /** userId of the member an action is running for, to disable just that row. */
  protected readonly busyId = signal<string | null>(null);
  /** userId awaiting a second "Confirm remove" click. */
  protected readonly confirmRemoveId = signal<string | null>(null);

  protected readonly assignableRoles: AssignableRole[] = ['MEMBER', 'ADMIN'];
  protected readonly canChangeRole = canChangeRole;
  protected readonly canRemove = canRemove;

  constructor() {
    // Reload whenever the workspace changes; switchMap drops a stale response
    // if the user navigates to another workspace before this one loads.
    toObservable(this.workspaceId)
      .pipe(
        switchMap((id) =>
          this.api.members(id).pipe(
            map((page) => ({ page })),
            catchError((error: unknown) => of({ error })),
            startWith(null),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (result === null) {
          this.status.set('loading');
        } else if ('page' in result) {
          this.members.set(result.page.items);
          this.nextCursor.set(result.page.nextCursor);
          this.status.set('ready');
        } else {
          this.actionError.set(errorMessage(result.error, 'Could not load members.'));
          this.status.set('error');
        }
      });
  }

  protected async loadMore(): Promise<void> {
    const cursor = this.nextCursor();
    if (!cursor) return;
    this.loadingMore.set(true);
    try {
      const page = await firstValueFrom(this.api.members(this.workspaceId(), cursor));
      this.members.update((list) => [...list, ...page.items]);
      this.nextCursor.set(page.nextCursor);
    } catch (error) {
      this.actionError.set(errorMessage(error, 'Could not load more members.'));
    } finally {
      this.loadingMore.set(false);
    }
  }

  protected async changeRole(member: Member, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const role = select.value as AssignableRole;
    const previous = member.role;
    if (role === previous) return;

    // Optimistic: show the new role at once, roll back if the server refuses.
    this.setRole(member.userId, role);
    await this.run(
      member.userId,
      () => this.api.changeRole(this.workspaceId(), member.userId, role),
      () => {
        this.setRole(member.userId, previous);
        select.value = previous;
      },
    );
  }

  protected askRemove(member: Member): void {
    this.confirmRemoveId.set(member.userId);
  }

  protected cancelRemove(): void {
    this.confirmRemoveId.set(null);
  }

  protected async remove(member: Member): Promise<void> {
    this.confirmRemoveId.set(null);
    const ok = await this.run(member.userId, () =>
      this.api.removeMember(this.workspaceId(), member.userId),
    );
    if (ok) this.members.update((list) => list.filter((m) => m.userId !== member.userId));
  }

  private setRole(userId: string, role: WorkspaceRole): void {
    this.members.update((list) => list.map((m) => (m.userId === userId ? { ...m, role } : m)));
  }

  /** Runs one row action with busy state and error reporting; resolves true on success. */
  private async run(
    userId: string,
    action: () => Observable<void>,
    onError?: () => void,
  ): Promise<boolean> {
    this.busyId.set(userId);
    this.actionError.set(null);
    try {
      await firstValueFrom(action(), { defaultValue: undefined });
      return true;
    } catch (error) {
      onError?.();
      this.actionError.set(errorMessage(error));
      return false;
    } finally {
      this.busyId.set(null);
    }
  }
}
