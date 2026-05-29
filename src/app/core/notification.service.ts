import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

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
export class NotificationService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;
  
  private dummyData: NotificationDto[] = [
    {
      id: 'dummy_1',
      type: 'pending_return',
      title: 'Pending Return Items',
      message: 'Items are pending for return.',
      bookingId: 'dummy_id_1',
      orderId: '#RR-2024-077',
      customerName: 'Rohan Mehta',
      productName: 'Ivory Silk Embroidered Sherwani',
      createdAt: new Date().toISOString()
    },
    {
      id: 'dummy_2',
      type: 'pickup',
      title: 'Order Pickup Today',
      message: 'Items are scheduled for pickup.',
      bookingId: 'dummy_id_2',
      orderId: '#RR-2024-089',
      customerName: 'Priya Deshmukh',
      productName: 'Banarasi Zari Silk Saree',
      createdAt: new Date().toISOString()
    },
    {
      id: 'dummy_3',
      type: 'return',
      title: 'Order Return Due',
      message: 'Items are due for return.',
      bookingId: 'dummy_id_3',
      orderId: '#RR-2024-095',
      customerName: 'Sana Khan',
      productName: 'Peach Designer Georgette Gown',
      createdAt: new Date().toISOString()
    },
    {
      id: 'dummy_4',
      type: 'pickup',
      title: 'Order Pickup Today',
      message: 'Items are scheduled for pickup.',
      bookingId: 'dummy_id_4',
      orderId: '#RR-2024-112',
      customerName: 'Ananya Kapoor',
      productName: 'Emerald Velvet Bridal Lehenga',
      createdAt: new Date().toISOString()
    }
  ];

  private notificationsSubject = new BehaviorSubject<NotificationDto[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  
  private historySubject = new BehaviorSubject<NotificationDto[]>([]);
  public history$ = this.historySubject.asObservable();
  
  private dismissedIds = new Set<string>();

  constructor() {
    // Load dismissed IDs from local storage
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
    this.updateSubjects();
  }

  private updateSubjects(): void {
    // Current notifications are those not dismissed
    this.notificationsSubject.next(this.dummyData.filter(n => !this.dismissedIds.has(n.id)));
    // History notifications are those that are dismissed
    this.historySubject.next(this.dummyData.filter(n => this.dismissedIds.has(n.id)));
  }

  fetchNotifications(): Observable<NotificationDto[]> {
    // Commented out actual API call to show dummy data
    // return this.http.get<NotificationDto[]>(this.baseUrl).pipe(
    //   map(notifications => notifications.filter(n => !this.dismissedIds.has(n.id))),
    //   tap(notifications => this.notificationsSubject.next(notifications))
    // );
    return this.notifications$;
  }

  dismissNotification(id: string): void {
    this.dismissedIds.add(id);
    localStorage.setItem('dismissed_notifications', JSON.stringify(Array.from(this.dismissedIds)));
    this.updateSubjects();
  }

  get currentNotifications(): NotificationDto[] {
    return this.notificationsSubject.value;
  }
}
