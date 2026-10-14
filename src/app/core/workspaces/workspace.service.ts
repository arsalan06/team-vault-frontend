import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AssignableRole,
  Invite,
  Member,
  Page,
  Workspace,
  WorkspaceRole,
  WorkspaceSummary,
} from './workspace.models';

/** Raw shape from the API: BIGINT columns arrive as strings (mysql2 bigNumberStrings). */
interface WorkspaceDto extends Omit<Workspace, 'storageUsed' | 'storageLimit'> {
  storageUsed: string | number;
  storageLimit: string | number;
}

/**
 * Thin typed wrapper over the /workspaces and /invites endpoints. Auth headers
 * and token refresh are handled by the interceptor, so nothing here knows about them.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/workspaces`;

  list(cursor?: string | null): Observable<Page<WorkspaceSummary>> {
    return this.http.get<Page<WorkspaceSummary>>(this.url, { params: pageParams(cursor) });
  }

  create(name: string): Observable<WorkspaceSummary> {
    return this.http
      .post<{ workspace: Omit<WorkspaceSummary, 'joinedAt'> }>(this.url, { name })
      .pipe(map(({ workspace }) => ({ ...workspace, joinedAt: new Date().toISOString() })));
  }

  get(id: string): Observable<{ workspace: Workspace; role: WorkspaceRole }> {
    return this.http
      .get<{ workspace: WorkspaceDto; role: WorkspaceRole }>(`${this.url}/${id}`)
      .pipe(map(({ workspace, role }) => ({ workspace: toWorkspace(workspace), role })));
  }

  rename(id: string, name: string): Observable<Workspace> {
    return this.http
      .patch<{ workspace: WorkspaceDto }>(`${this.url}/${id}`, { name })
      .pipe(map(({ workspace }) => toWorkspace(workspace)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  members(id: string, cursor?: string | null): Observable<Page<Member>> {
    return this.http.get<Page<Member>>(`${this.url}/${id}/members`, {
      params: pageParams(cursor),
    });
  }

  invite(id: string, email: string, role: AssignableRole): Observable<Invite> {
    return this.http
      .post<{ invite: Invite }>(`${this.url}/${id}/invites`, { email, role })
      .pipe(map(({ invite }) => invite));
  }

  changeRole(id: string, userId: string, role: AssignableRole): Observable<void> {
    return this.http
      .patch<unknown>(`${this.url}/${id}/members/${userId}`, { role })
      .pipe(map(() => undefined));
  }

  /** Removes another member, or — with your own user id — leaves the workspace. */
  removeMember(id: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}/members/${userId}`);
  }

  acceptInvite(token: string): Observable<{ workspaceId: string; role: AssignableRole }> {
    return this.http
      .post<{
        membership: { workspaceId: string; role: AssignableRole };
      }>(`${environment.apiUrl}/invites/accept`, { token })
      .pipe(map(({ membership }) => membership));
  }
}

function pageParams(cursor?: string | null): HttpParams {
  return cursor ? new HttpParams().set('cursor', cursor) : new HttpParams();
}

function toWorkspace(dto: WorkspaceDto): Workspace {
  return { ...dto, storageUsed: Number(dto.storageUsed), storageLimit: Number(dto.storageLimit) };
}
