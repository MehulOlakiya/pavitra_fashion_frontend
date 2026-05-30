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

  constructor(public router: Router) {
    router.events.subscribe((e) => {
      if (e instanceof NavigationStart) this.closed.emit();
    });
  }

  close(): void {
    this.closed.emit();
  }

  navItems = [
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
