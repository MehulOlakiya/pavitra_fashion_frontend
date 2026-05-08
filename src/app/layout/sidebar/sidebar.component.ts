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

  constructor(private router: Router) {
    router.events.subscribe((e) => {
      if (e instanceof NavigationStart) this.closed.emit();
    });
  }

  close(): void {
    this.closed.emit();
  }

  navItems = [
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard' },
    { icon: 'event_available', label: 'Bookings', route: '/bookings' },
    { icon: 'calendar_month', label: 'Calendar', route: '/calendar' },
    { icon: 'group', label: 'Customers', route: '/customers' },
    { icon: 'payments', label: 'Payments', route: '/payments' },
    { icon: 'bar_chart', label: 'Reports', route: '/reports' },
    { icon: 'notifications', label: 'Notifications', route: '/notifications' },
    { icon: 'settings', label: 'Settings', route: '/settings' },
  ];
}
