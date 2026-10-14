import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { errorMessage } from '../../../core/http/error-message';
import { WorkspaceSummary } from '../../../core/workspaces/workspace.models';
import { WorkspaceService } from '../../../core/workspaces/workspace.service';

@Component({
  selector: 'app-workspace-list',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './workspace-list.html',
  styleUrl: './workspace-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceList implements OnInit {
  private readonly api = inject(WorkspaceService);
  private readonly router = inject(Router);

  protected readonly workspaces = signal<WorkspaceSummary[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly loadError = signal<string | null>(null);

  protected readonly showCreate = signal(false);
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly createForm = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
  });

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const page = await firstValueFrom(this.api.list());
      this.workspaces.set(page.items);
      this.nextCursor.set(page.nextCursor);
    } catch (error) {
      this.loadError.set(errorMessage(error, 'Could not load your workspaces.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async loadMore(): Promise<void> {
    const cursor = this.nextCursor();
    if (!cursor) return;
    this.loadingMore.set(true);
    try {
      const page = await firstValueFrom(this.api.list(cursor));
      this.workspaces.update((list) => [...list, ...page.items]);
      this.nextCursor.set(page.nextCursor);
    } catch (error) {
      this.loadError.set(errorMessage(error, 'Could not load more workspaces.'));
    } finally {
      this.loadingMore.set(false);
    }
  }

  protected openCreate(): void {
    this.showCreate.set(true);
    this.createError.set(null);
  }

  protected cancelCreate(): void {
    this.showCreate.set(false);
    this.createForm.reset();
  }

  protected async create(): Promise<void> {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.creating.set(true);
    this.createError.set(null);
    try {
      const workspace = await firstValueFrom(
        this.api.create(this.createForm.getRawValue().name.trim()),
      );
      // Go straight into the new workspace: inviting people is the next step.
      await this.router.navigate(['/workspaces', workspace.id]);
    } catch (error) {
      this.createError.set(errorMessage(error, 'Could not create the workspace.'));
    } finally {
      this.creating.set(false);
    }
  }
}
