import { AuthGuard } from '../guards/auth.guard';
import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('../components/pages/landing-page/landing-page.component').then(
                (m) => m.LandingPageComponent
            ),
    },
    {
        path: 'dashboard',
        loadComponent: () =>
            import('../components/pages/dashboard/dashboard.component').then(
                (m) => m.DashboardComponent
            ),
        canActivate: [AuthGuard],
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('../components/pages/dashboard/overview/overview.component').then(
                        (m) => m.OverviewComponent
                    ),
            },
            {
                path: 'send',
                loadComponent: () =>
                    import('../components/pages/dashboard/send/send.component').then(
                        (m) => m.SendComponent
                    ),
            },
            {
                path: 'receive',
                loadComponent: () =>
                    import('../components/pages/dashboard/receive/receive.component').then(
                        (m) => m.ReceiveComponent
                    ),
            },
            {
                path: 'contacts',
                loadComponent: () =>
                    import('../components/pages/dashboard/contacts/contacts.component').then(
                        (m) => m.ContactsComponent
                    ),
            },
            {
                path: 'history',
                loadComponent: () =>
                    import('../components/pages/dashboard/history/history.component').then(
                        (m) => m.HistoryComponent
                    ),
            },
            {
                path: 'withdraw',
                loadComponent: () =>
                    import('../components/pages/dashboard/withdraw/withdraw.component').then(
                        (m) => m.WithdrawComponent
                    ),
            },
        ],
    },
    {
        path: '**',
        redirectTo: '',
    },
];
