import { Routes } from '@angular/router';
import { noAuthGuard } from './core/guards/no-auth.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      {
        path: 'bookings',
        loadComponent: () =>
          import('./pages/booking-list/booking-list.component').then(
            (m) => m.BookingListComponent,
          ),
      },
      {
        path: 'bookings/new',
        loadComponent: () =>
          import('./pages/booking/booking.component').then(
            (m) => m.BookingComponent,
          ),
      },
      {
        path: 'bookings/edit/:id',
        loadComponent: () =>
          import('./pages/edit-booking/edit-booking.component').then(
            (m) => m.EditBookingComponent,
          ),
      },
      {
        path: 'inventory-detail',
        loadComponent: () =>
          import('./pages/inventory-detail/inventory-detail.component').then(
            (m) => m.InventoryDetailComponent,
          ),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./pages/cloth-management/cloth-management.component').then(
            (m) => m.ClothManagementComponent,
          ),
      },
      {
        path: 'inventory/add',
        loadComponent: () =>
          import('./pages/add-product/add-product.component').then(
            (m) => m.AddProductComponent,
          ),
      },
      {
        path: 'inventory/insights/:id',
        loadComponent: () =>
          import('./pages/product-insights/product-insights.component').then(
            (m) => m.ProductInsightsComponent,
          ),
      },
      {
        path: 'inventory/edit/:id',
        loadComponent: () =>
          import('./pages/edit-product/edit-product.component').then(
            (m) => m.EditProductComponent,
          ),
      },
      { path: 'inventory', redirectTo: '/inventory-detail', pathMatch: 'full' },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./pages/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent,
          ),
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./pages/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent,
          ),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./pages/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent,
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent,
          ),
      },
    ],
  },
];
