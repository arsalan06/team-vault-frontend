import { AssignableRole, Member, WorkspaceRole } from './workspace.models';

// Mirrors the rules enforced in the backend's workspace routes and service, so
// the UI only offers actions that will succeed. The backend stays the authority:
// hiding a button is a convenience, never the security boundary.

export const canRename = (role: WorkspaceRole) => role === 'OWNER' || role === 'ADMIN';

export const canDelete = (role: WorkspaceRole) => role === 'OWNER';

export const canLeave = (role: WorkspaceRole) => role !== 'OWNER';

/** Owners may invite admins or members; admins only members; members nobody. */
export function invitableRoles(role: WorkspaceRole): AssignableRole[] {
  if (role === 'OWNER') return ['MEMBER', 'ADMIN'];
  if (role === 'ADMIN') return ['MEMBER'];
  return [];
}

/** Only the owner changes roles, never their own, and the owner role is fixed. */
export function canChangeRole(actorRole: WorkspaceRole, actorId: string, target: Member): boolean {
  return actorRole === 'OWNER' && target.userId !== actorId && target.role !== 'OWNER';
}

/** Removing someone else (leaving is handled by canLeave). */
export function canRemove(actorRole: WorkspaceRole, actorId: string, target: Member): boolean {
  if (target.userId === actorId || target.role === 'OWNER') return false;
  if (actorRole === 'OWNER') return true;
  return actorRole === 'ADMIN' && target.role === 'MEMBER';
}
