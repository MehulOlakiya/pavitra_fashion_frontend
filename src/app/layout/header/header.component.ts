import {
  Component,
  inject,
  HostListener,
  Output,
  EventEmitter,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { UserStateService } from '../../core/user-state.service';
import { WhatsappService } from '../../core/whatsapp.service';
import { ToastService } from '../../shared/toast/toast.service';
import { ProductService } from '../../core/product.service';
import { NotificationService, NotificationDto } from '../../core/notification.service';
import { OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [FormsModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Output() menuClick = new EventEmitter<void>();
  searchQuery = '';
  profileMenuOpen = false;
  mobileSearchOpen = false;
  userState = inject(UserStateService);
  private authService = inject(AuthService);
  private whatsappService = inject(WhatsappService);
  private productService = inject(ProductService);
  private notificationService = inject(NotificationService);

  notificationMenuOpen = false;
  notifications: NotificationDto[] = [];
  private notifSub?: Subscription;

  constructor(
    private router: Router,
    private toastService: ToastService,
  ) {}

  ngOnInit() {
    this.notifSub = this.notificationService.notifications$.subscribe(notifs => {
      this.notifications = notifs;
    });
    this.notificationService.fetchNotifications().subscribe();
  }

  ngOnDestroy() {
    this.notifSub?.unsubscribe();
  }

  get notificationCount(): number {
    return this.notifications.length;
  }

  toggleNotificationMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationMenuOpen = !this.notificationMenuOpen;
    this.profileMenuOpen = false;
  }

  openNotification(notif: NotificationDto): void {
    this.notificationMenuOpen = false;
    this.router.navigate(['/bookings', notif.bookingId]);
  }

  dismissNotification(event: MouseEvent, notif: NotificationDto): void {
    event.stopPropagation();
    this.notificationService.dismissNotification(notif.id);
    
    // If we just dismissed the last notification, close the menu
    if (this.notifications.length === 0) {
      this.notificationMenuOpen = false;
    }
  }

  onSearch(): void {
    const q = this.searchQuery.trim();
    if (q) {
      this.productService.search(q, 1).subscribe({
        next: (products) => {
          if (products.length > 0) {
            this.router.navigate([`/inventory/insights/${products[0]._id}`]);
            this.clearSearch();
            this.mobileSearchOpen = false;
          } else {
            this.toastService.error('Product not found');
          }
        },
        error: () => {
          this.toastService.error('Error searching product');
        },
      });
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  closeMobileSearch(): void {
    this.mobileSearchOpen = false;
    this.searchQuery = '';
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  manageProfile(): void {
    this.profileMenuOpen = false;
    this.router.navigate(['/settings']);
  }

  logout(): void {
    this.profileMenuOpen = false;
    // Call API to clear WhatsApp session and reset user flag, then clear local state
    this.authService.logout().subscribe({
      next: () => {
        this.userState.clear();
        this.router.navigate(['/login']);
      },
      error: () => {
        // Always clear local state even if API call fails
        this.userState.clear();
        this.router.navigate(['/login']);
      },
    });
  }

  whatsappLogout(): void {
    this.profileMenuOpen = false;
    this.whatsappService.logout().subscribe({
      next: () => {
        this.toastService.success('WhatsApp logged out successfully');
      },
      error: () => {
        this.toastService.error('Failed to logout from WhatsApp');
      },
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.profileMenuOpen = false;
    this.notificationMenuOpen = false;
  }
}
