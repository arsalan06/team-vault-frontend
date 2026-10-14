import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in · Team Vault',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'signup',
    canActivate: [guestGuard],
    title: 'Create account · Team Vault',
    loadComponent: () => import('./features/auth/signup/signup').then((m) => m.Signup),
  },
  {
    // Every signed-in page shares the shell (top bar). One guard here covers all children.
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'workspaces' },
      {
        path: 'workspaces',
        title: 'Workspaces · Team Vault',
        loadComponent: () =>
          import('./features/workspaces/workspace-list/workspace-list').then(
            (m) => m.WorkspaceList,
          ),
      },
      {
        // Title is set from the workspace name once it loads.
        path: 'workspaces/:id',
        title: 'Workspace · Team Vault',
        loadComponent: () =>
          import('./features/workspaces/workspace-detail/workspace-detail').then(
            (m) => m.WorkspaceDetail,
          ),
      },
      {
        path: 'invites/accept',
        title: 'Join workspace · Team Vault',
        loadComponent: () => import('./features/invites/accept-invite').then((m) => m.AcceptInvite),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
