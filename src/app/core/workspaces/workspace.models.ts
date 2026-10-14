export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';

/** Roles that can be granted by an invite or a role change; OWNER never can. */
export type AssignableRole = Exclude<WorkspaceRole, 'OWNER'>;

/** One row of GET /workspaces: a workspace as seen by the current user. */
export interface WorkspaceSummary {
  id: string;
  name: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  storageUsed: number;
  storageLimit: number;
  createdAt: string;
}

export interface Member {
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Invite {
  id: string;
  email: string;
  workspaceId: string;
  role: AssignableRole;
  expiresAt: string;
}

/** Cursor-paginated list, as returned by the backend's buildPage(). */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
