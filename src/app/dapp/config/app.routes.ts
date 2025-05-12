import { AuthGuard } from './../guards/auth.guard';
import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./../components/pages/landing-page/landing-page.component').then(
                (m) => m.LandingPageComponent
            ),
    },
    {
        path: 'dashboard',
        loadComponent: () =>
            import('./../components/pages/dashboard/dashboard.component').then(
                (m) => m.DashboardComponent
            ),
        canActivate: [AuthGuard],
        children: [
            {
                path: 'transaction',
                loadComponent: () =>
                    import('./../components/pages/dashboard/transaction/transaction.component').then(
                        (m) => m.TransactionComponent
                    ),
            },
            {
                path: 'contacts',
                loadComponent: () =>
                    import('./../components/pages/dashboard/contacts/contacts.component').then(
                        (m) => m.ContactsComponent
                    ),
            },
            {
                path: 'history',
                loadComponent: () =>
                    import('./../components/pages/dashboard/history/history.component').then(
                        (m) => m.HistoryComponent
                    ),
            },
        ],
    },
    {
        path: '**',
        redirectTo: '',
    },
];