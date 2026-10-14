import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { errorMessage } from '../../../core/http/error-message';
import { AssignableRole, Invite, WorkspaceRole } from '../../../core/workspaces/workspace.models';
import { invitableRoles } from '../../../core/workspaces/workspace.permissions';
import { WorkspaceService } from '../../../core/workspaces/workspace.service';

@Component({
  selector: 'app-invite-form',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './invite-form.html',
  styleUrl: './invite-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteForm {
  private readonly api = inject(WorkspaceService);

  readonly workspaceId = input.required<string>();
  readonly role = input.required<WorkspaceRole>();

  protected readonly roles = computed(() => invitableRoles(this.role()));
  protected readonly isDev = !environment.production;

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    role: ['MEMBER' as AssignableRole],
  });

  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sent = signal<Invite | null>(null);

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    this.sent.set(null);
    try {
      const { email, role } = this.form.getRawValue();
      const invite = await firstValueFrom(this.api.invite(this.workspaceId(), email.trim(), role));
      this.sent.set(invite);
      this.form.reset({ email: '', role: 'MEMBER' });
    } catch (error) {
      this.error.set(errorMessage(error, 'Could not send the invite.'));
    } finally {
      this.sending.set(false);
    }
  }
}
