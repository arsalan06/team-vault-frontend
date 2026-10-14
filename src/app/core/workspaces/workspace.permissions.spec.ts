import { Member, WorkspaceRole } from './workspace.models';
import {
  canChangeRole,
  canDelete,
  canLeave,
  canRemove,
  canRename,
  invitableRoles,
} from './workspace.permissions';

const ME = 'me';
const member = (role: WorkspaceRole, userId = 'other'): Member => ({
  userId,
  role,
  name: 'Someone',
  email: 'someone@example.com',
  joinedAt: '2026-01-01T00:00:00.000Z',
});

describe('workspace permissions', () => {
  it('lets owners and admins rename, only owners delete, everyone but the owner leave', () => {
    expect([canRename('OWNER'), canRename('ADMIN'), canRename('MEMBER')]).toEqual([
      true,
      true,
      false,
    ]);
    expect([canDelete('OWNER'), canDelete('ADMIN'), canDelete('MEMBER')]).toEqual([
      true,
      false,
      false,
    ]);
    expect([canLeave('OWNER'), canLeave('ADMIN'), canLeave('MEMBER')]).toEqual([false, true, true]);
  });

  it('never offers OWNER as an invite role, and admins can only invite members', () => {
    expect(invitableRoles('OWNER')).toEqual(['MEMBER', 'ADMIN']);
    expect(invitableRoles('ADMIN')).toEqual(['MEMBER']);
    expect(invitableRoles('MEMBER')).toEqual([]);
  });

  it('only lets the owner change roles, never their own or the owner role', () => {
    expect(canChangeRole('OWNER', ME, member('MEMBER'))).toBe(true);
    expect(canChangeRole('OWNER', ME, member('ADMIN'))).toBe(true);
    expect(canChangeRole('OWNER', ME, member('OWNER', ME))).toBe(false);
    expect(canChangeRole('ADMIN', ME, member('MEMBER'))).toBe(false);
  });

  it('lets admins remove members but not other admins, and nobody remove the owner', () => {
    expect(canRemove('OWNER', ME, member('ADMIN'))).toBe(true);
    expect(canRemove('ADMIN', ME, member('MEMBER'))).toBe(true);
    expect(canRemove('ADMIN', ME, member('ADMIN'))).toBe(false);
    expect(canRemove('ADMIN', ME, member('OWNER'))).toBe(false);
    expect(canRemove('MEMBER', ME, member('MEMBER'))).toBe(false);
  });

  it('treats removing yourself as leaving, not removal', () => {
    expect(canRemove('ADMIN', ME, member('ADMIN', ME))).toBe(false);
  });
});
