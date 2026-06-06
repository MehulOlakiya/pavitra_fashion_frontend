import {
  Component,
  inject,
  Input,
  Output,
  EventEmitter,
  HostBinding,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  NavigationStart,
} from '@angular/router';
import { UserStateService } from '../../core/user-state.service';

export interface NavItem {
  icon: string;
  label: string;
  route: string;
  comingSoon: boolean;
  exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, TitleCasePipe],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  @HostBinding('class.open') @Input() mobileOpen = false;
  @Output() closed = new EventEmitter<void>();

  userState = inject(UserStateService);

  constructor(private router: Router) {
    router.events.subscribe((e) => {
      if (e instanceof NavigationStart) this.closed.emit();
    });
  }

  close(): void {
    this.closed.emit();
  }

  navItems: NavItem[] = [
    {
      icon: 'dashboard',
      label: 'Dashboard',
      route: '/dashboard',
      comingSoon: false,
    },
    {
      icon: 'event_available',
      label: 'Bookings',
      route: '/bookings',
      comingSoon: false,
    },
    {
      icon: 'inventory_2',
      label: 'Inventory',
      route: '/inventory',
      comingSoon: false,
      exact: true,
    },
    {
      icon: 'check_circle',
      label: 'Product Available',
      route: '/inventory/available',
      comingSoon: false,
    },
    {
      icon: 'calendar_month',
      label: 'Calendar',
      route: '/calendar',
      comingSoon: true,
    },
    {
      icon: 'group',
      label: 'Customers',
      route: '/customers',
      comingSoon: false,
    },
    {
      icon: 'payments',
      label: 'Payments',
      route: '/payments',
      comingSoon: true,
    },
    {
      icon: 'receipt_long',
      label: 'Expenses',
      route: '/expenses',
      comingSoon: false,
    },
    {
      icon: 'bar_chart',
      label: 'Reports',
      route: '/reports',
      comingSoon: true,
    },
    {
      icon: 'notifications',
      label: 'Notifications',
      route: '/notifications',
      comingSoon: true,
    },
    {
      icon: 'settings',
      label: 'Settings',
      route: '/settings',
      comingSoon: true,
    },
  ];
}
