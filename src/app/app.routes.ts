import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
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
        path: 'inventory/edit/:id',
        loadComponent: () =>
          import('./pages/edit-product/edit-product.component').then(
            (m) => m.EditProductComponent,
          ),
      },
      { path: 'inventory', redirectTo: '/inventory-detail', pathMatch: 'full' },
      { path: 'calendar', redirectTo: '/bookings', pathMatch: 'full' },
      { path: 'customers', redirectTo: '/bookings', pathMatch: 'full' },
      { path: 'payments', redirectTo: '/bookings', pathMatch: 'full' },
      { path: 'reports', redirectTo: '/bookings', pathMatch: 'full' },
      { path: 'notifications', redirectTo: '/bookings', pathMatch: 'full' },
      { path: 'settings', redirectTo: '/bookings', pathMatch: 'full' },
    ],
  },
];
