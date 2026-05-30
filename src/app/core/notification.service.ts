import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { io, Socket } from 'socket.io-client';

export interface NotificationDto {
  id: string;
  type: 'pickup' | 'return' | 'pending_return';
  title: string;
  message: string;
  bookingId: string;
  orderId: string;
  customerName: string;
  productName: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  private socket: Socket;

  private notificationsSubject = new BehaviorSubject<NotificationDto[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private historySubject = new BehaviorSubject<NotificationDto[]>([]);
  public history$ = this.historySubject.asObservable();

  private dismissedIds = new Set<string>();

  constructor() {
    // Load dismissed IDs from localStorage
    const stored = localStorage.getItem('dismissed_notifications');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.dismissedIds = new Set(parsed);
        }
      } catch (e) {
        console.error('Failed to parse dismissed notifications', e);
      }
    }

    // Connect to Socket.IO namespace
    const socketUrl = environment.apiUrl.replace('/api', '');
    this.socket = io(`${socketUrl}/notifications`, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[NotificationService] Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('[NotificationService] Socket disconnected');
    });

    // Listen for individual real-time notifications pushed by cron
    this.socket.on('notification', (notif: NotificationDto) => {
      if (!this.dismissedIds.has(notif.id)) {
        const current = this.notificationsSubject.value;
        const exists = current.some((n) => n.id === notif.id);
        if (!exists) {
          this.notificationsSubject.next([notif, ...current]);
        }
      }
    });

    // Listen for full refresh signal (cron finished sending batch)
    this.socket.on('notifications:refresh', () => {
      this.fetchNotifications().subscribe();
    });
  }

  ngOnDestroy() {
    this.socket.disconnect();
  }

  /** Fetch fresh notifications from backend REST API */
  fetchNotifications(): Observable<NotificationDto[]> {
    return this.http.get<NotificationDto[]>(this.baseUrl).pipe(
      tap((notifications) => {
        const active = notifications.filter((n) => !this.dismissedIds.has(n.id));
        const history = notifications.filter((n) => this.dismissedIds.has(n.id));
        this.notificationsSubject.next(active);
        this.historySubject.next(history);
      }),
    );
  }

  dismissNotification(id: string): void {
    this.dismissedIds.add(id);
    localStorage.setItem(
      'dismissed_notifications',
      JSON.stringify(Array.from(this.dismissedIds)),
    );
    const all = [...this.notificationsSubject.value, ...this.historySubject.value];
    const active = all.filter((n) => !this.dismissedIds.has(n.id));
    const history = all.filter((n) => this.dismissedIds.has(n.id));
    this.notificationsSubject.next(active);
    this.historySubject.next(history);
  }

  get currentNotifications(): NotificationDto[] {
    return this.notificationsSubject.value;
  }

  get notificationCount(): number {
    return this.notificationsSubject.value.length;
  }
}
