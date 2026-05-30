import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, NotificationDto } from '../../core/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  viewMode: 'active' | 'history' = 'active';
  activeTab: 'all' | 'pickup' | 'return' | 'pending_return' = 'all';
  
  notifications: NotificationDto[] = [];
  historyNotifications: NotificationDto[] = [];
  
  private notifSub?: Subscription;
  private historySub?: Subscription;

  ngOnInit() {
    this.notifSub = this.notificationService.notifications$.subscribe(notifs => {
      this.notifications = notifs;
    });
    this.historySub = this.notificationService.history$.subscribe(history => {
      this.historyNotifications = history;
    });
    // Fetch from backend REST API (also updates the BehaviorSubjects)
    this.notificationService.fetchNotifications().subscribe();
  }

  ngOnDestroy() {
    this.notifSub?.unsubscribe();
    this.historySub?.unsubscribe();
  }

  get displayedNotifications(): NotificationDto[] {
    const baseList = this.viewMode === 'active' ? this.notifications : this.historyNotifications;
    if (this.activeTab === 'all') return baseList;
    return baseList.filter(n => n.type === this.activeTab);
  }

  get pendingPickupsCount(): number {
    return this.notifications.filter(n => n.type === 'pickup').length;
  }

  get expectedReturnsCount(): number {
    return this.notifications.filter(n => n.type === 'return').length;
  }

  get pendingReturnItemsCount(): number {
    return this.notifications.filter(n => n.type === 'pending_return').length;
  }

  setViewMode(mode: 'active' | 'history'): void {
    this.viewMode = mode;
  }

  setTab(tab: 'all' | 'pickup' | 'return' | 'pending_return'): void {
    this.activeTab = tab;
  }

  openNotification(notif: NotificationDto): void {
    this.router.navigate(['/bookings', notif.bookingId]);
  }

  dismissNotification(event: MouseEvent, notif: NotificationDto): void {
    event.stopPropagation();
    this.notificationService.dismissNotification(notif.id);
  }
}
