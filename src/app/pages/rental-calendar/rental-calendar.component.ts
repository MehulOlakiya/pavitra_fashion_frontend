import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  CalendarService,
  CalendarBooking,
  CalendarBookingItem,
} from '../../core/calendar.service';
import { BookingService } from '../../core/booking.service';
import { FormsModule } from '@angular/forms';

export type EventType = 'booked' | 'rented' | 'pending_return' | 'returned' | 'cancelled';

export interface RentalEvent {
  id: string; // MongoDB _id
  bookingId: string; // original MongoDB _id for routing
  date: Date;
  eventType: EventType;
  orderId: string;
  customer: string;
  customerPhone?: string;
  item: string; // orderId
  items: CalendarBookingItem[]; // all products in this order
  status: string; // raw booking status
  remainingPayment?: number;
  advancePayment?: number;
  returnDate: Date;
  bookingDate: Date;
}

export interface CalendarDay {
  date: Date;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: RentalEvent[];
}

// ── Map backend booking to calendar events (one per relevant date) ─────────
function bookingToEvents(booking: CalendarBooking): RentalEvent[] {
  const events: RentalEvent[] = [];
  const bookingDate = new Date(booking.bookingDate);
  const returnDate = new Date(booking.returnDate);
  const sameDay = bookingDate.toDateString() === returnDate.toDateString();

  const base = {
    bookingId: booking._id,
    orderId: booking.orderId || '—',
    customer: booking.customer?.name ?? 'Unknown',
    customerPhone: booking.customer?.mobileNumber,
    items: booking.items || [],
    status: booking.status,
    remainingPayment: booking.remainingPayment,
    advancePayment: booking.advancePayment,
    returnDate,
    bookingDate,
  };

  const itemLabel = booking.orderId || '—';
  const eventType = (booking.status || 'booked') as EventType;

  events.push({
    ...base,
    id: `${booking._id}_start`,
    item: itemLabel,
    date: bookingDate,
    eventType: eventType,
  });

  if (!sameDay) {
    events.push({
      ...base,
      id: `${booking._id}_end`,
      item: itemLabel,
      date: returnDate,
      eventType: eventType,
    });
  }

  return events;
}

@Component({
  selector: 'app-rental-calendar',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rental-calendar.component.html',
  styleUrls: ['./rental-calendar.component.scss'],
})
export class RentalCalendarComponent implements OnInit {
  private calendarSvc = inject(CalendarService);
  private router = inject(Router);
  private bookingSvc = inject(BookingService);

  // ── State ─────────────────────────────────────────────────
  viewDate = signal(new Date());
  isLoading = signal(false);
  hasError = signal(false);
  modalOpen = signal(false);

  // Payment Modal State
  paymentModalOpen = signal(false);
  amountReceived = signal<number | null>(null);
  fullPaymentReceived = signal(false);
  isSubmitting = signal(false);

  activeTypeFilter = signal<EventType | 'all'>('all');

  selectedDay = signal<Date | null>(null);
  selectedEvent = signal<RentalEvent | null>(null);

  allEvents = signal<RentalEvent[]>([]);

  readonly weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // ── Computed ───────────────────────────────────────────────
  currentMonthLabel = computed(() => {
    const d = this.viewDate();
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  filteredEvents = computed(() => {
    const typeF = this.activeTypeFilter();
    return this.allEvents().filter(
      (e) => typeF === 'all' || e.eventType === typeF,
    );
  });

  calendarDays = computed<CalendarDay[]>(() => {
    const vd = this.viewDate();
    const firstDay = new Date(vd.getFullYear(), vd.getMonth(), 1);
    const lastDay = new Date(vd.getFullYear(), vd.getMonth() + 1, 0);
    const startPad = firstDay.getDay();
    const endPad = 6 - lastDay.getDay();

    const days: CalendarDay[] = [];
    const todayKey = this._dateKey(new Date());

    for (let i = startPad - 1; i >= 0; i--) {
      days.push(
        this._makeDay(
          new Date(vd.getFullYear(), vd.getMonth(), -i),
          false,
          todayKey,
        ),
      );
    }
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(
        this._makeDay(
          new Date(vd.getFullYear(), vd.getMonth(), day),
          true,
          todayKey,
        ),
      );
    }
    for (let i = 1; i <= endPad; i++) {
      days.push(
        this._makeDay(
          new Date(vd.getFullYear(), vd.getMonth() + 1, i),
          false,
          todayKey,
        ),
      );
    }
    return days;
  });

  selectedDayEvents = computed(() => {
    const day = this.selectedDay();
    if (!day) return [];
    const key = this._dateKey(day);
    return this.filteredEvents().filter((e) => this._dateKey(e.date) === key);
  });

  bookedCount = computed(
    () => this.filteredEvents().filter((e) => e.eventType === 'booked').length,
  );
  rentedCount = computed(
    () => this.filteredEvents().filter((e) => e.eventType === 'rented').length,
  );
  pendingReturnCount = computed(
    () => this.filteredEvents().filter((e) => e.eventType === 'pending_return').length,
  );
  returnedCount = computed(
    () => this.filteredEvents().filter((e) => e.eventType === 'returned').length,
  );
  cancelledCount = computed(
    () => this.filteredEvents().filter((e) => e.eventType === 'cancelled').length,
  );

  // ── Lifecycle ──────────────────────────────────────────────
  ngOnInit(): void {
    this._loadMonth();
  }

  // ── Navigation ─────────────────────────────────────────────
  prevMonth(): void {
    const d = this.viewDate();
    this.viewDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this._clearSelection();
    this._loadMonth();
  }

  nextMonth(): void {
    const d = this.viewDate();
    this.viewDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this._clearSelection();
    this._loadMonth();
  }

  goToToday(): void {
    const now = new Date();
    const current = this.viewDate();
    const sameMonth =
      now.getFullYear() === current.getFullYear() &&
      now.getMonth() === current.getMonth();

    this.viewDate.set(now);
    this._clearSelection();
    if (!sameMonth) this._loadMonth();
  }

  // ── Filters ────────────────────────────────────────────────
  setTypeFilter(f: EventType | 'all'): void {
    this.activeTypeFilter.set(f);
    this._clearSelection();
  }

  // ── Modal interactions ─────────────────────────────────────
  onDayClick(day: CalendarDay): void {
    this.selectedDay.set(day.date);
    if (this.selectedDayEvents().length === 0) {
      this.selectedDay.set(null);
      return;
    }
    this.selectedEvent.set(null);
    this.modalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.selectedEvent.set(null);
    this.selectedDay.set(null);
    document.body.style.overflow = '';
  }

  selectEventInModal(e: RentalEvent): void {
    this.selectedEvent.set(this.selectedEvent()?.id === e.id ? null : e);
  }

  onEventClick(e: RentalEvent, stopProp: MouseEvent): void {
    stopProp.stopPropagation();
    this.selectedDay.set(e.date);
    this.selectedEvent.set(e);
    this.modalOpen.set(true);
    document.body.style.overflow = 'hidden';
    console.log('DDDDD', e);
  }

  viewFullDetails(bookingId: string): void {
    this.router.navigate(['/bookings', bookingId]);
    this.closeModal();
  }

  markRented(): void {
    const ev = this.selectedEvent();
    if (!ev) return;
    this.isSubmitting.set(true);
    this.bookingSvc.updateStatus(ev.bookingId, 'rented').subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModal();
        this._loadMonth();
      },
      error: () => {
        this.isSubmitting.set(false);
        alert('Failed to mark as rented');
      }
    });
  }

  openPaymentModal(): void {
    const ev = this.selectedEvent();
    if (!ev) return;
    if (ev.remainingPayment && ev.remainingPayment > 0) {
      this.paymentModalOpen.set(true);
      this.amountReceived.set(null);
      this.fullPaymentReceived.set(false);
    } else {
      this.confirmReturned();
    }
  }

  toggleFullPayment(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.fullPaymentReceived.set(checked);
    if (checked) {
      this.amountReceived.set(this.selectedEvent()?.remainingPayment ?? 0);
    }
  }

  onAmountChange(val: number | null): void {
    this.amountReceived.set(val);
    const ev = this.selectedEvent();
    if (ev && val !== null && val >= (ev.remainingPayment ?? 0)) {
      this.fullPaymentReceived.set(true);
    } else {
      this.fullPaymentReceived.set(false);
    }
  }

  closePaymentModal(): void {
    this.paymentModalOpen.set(false);
  }

  confirmReturned(): void {
    const ev = this.selectedEvent();
    if (!ev) return;
    this.isSubmitting.set(true);

    let payload: any = { status: 'returned' };

    if (this.amountReceived() !== null && this.amountReceived()! > 0) {
      const remaining = Math.max(0, (ev.remainingPayment || 0) - this.amountReceived()!);
      payload.remainingPayment = remaining;
    }

    this.bookingSvc.update(ev.bookingId, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.paymentModalOpen.set(false);
        this.closeModal();
        this._loadMonth();
      },
      error: () => {
        this.isSubmitting.set(false);
        alert('Failed to mark as returned');
      }
    });
  }

  isDaySelected(day: CalendarDay): boolean {
    const sel = this.selectedDay();
    return !!sel && this._dateKey(sel) === this._dateKey(day.date);
  }

  // ── Helpers ────────────────────────────────────────────────
  getChipClass(type: EventType): string {
    return `chip--${type}`;
  }

  getLabel(type: EventType): string {
    if (type === 'booked') return 'BOOKED';
    if (type === 'rented') return 'RENTED';
    if (type === 'pending_return') return 'PENDING RETURN';
    if (type === 'returned') return 'RETURNED';
    if (type === 'cancelled') return 'CANCELLED';
    return 'UNKNOWN';
  }

  getIcon(type: EventType): string {
    if (type === 'booked') return 'event_available';
    if (type === 'rented') return 'shopping_bag';
    if (type === 'pending_return') return 'warning';
    if (type === 'returned') return 'assignment_return';
    if (type === 'cancelled') return 'cancel';
    return 'info';
  }

  getEventsForDay(day: CalendarDay): RentalEvent[] {
    const key = this._dateKey(day.date);
    return this.filteredEvents().filter((e) => this._dateKey(e.date) === key);
  }

  retry(): void {
    this.hasError.set(false);
    this._loadMonth();
  }

  trackByDay(_: number, d: CalendarDay): string {
    return this._dateKey(d.date);
  }
  trackById(_: number, e: RentalEvent): string {
    return e.id;
  }

  // ── Private ────────────────────────────────────────────────
  private _loadMonth(): void {
    const vd = this.viewDate();
    this.isLoading.set(true);
    this.hasError.set(false);

    this.calendarSvc
      .getBookingsForMonth(vd.getFullYear(), vd.getMonth())
      .subscribe({
        next: (res) => {
          const events: RentalEvent[] = [];
          for (const booking of res.data) {
            events.push(...bookingToEvents(booking));
          }
          this.allEvents.set(events);
          this.isLoading.set(false);
        },
        error: () => {
          this.hasError.set(true);
          this.isLoading.set(false);
        },
      });
  }

  private _dateKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  private _makeDay(
    d: Date,
    isCurrentMonth: boolean,
    todayKey: string,
  ): CalendarDay {
    return {
      date: d,
      dayNum: d.getDate(),
      isCurrentMonth,
      isToday: this._dateKey(d) === todayKey,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      events: [],
    };
  }

  private _clearSelection(): void {
    this.selectedDay.set(null);
    this.selectedEvent.set(null);
  }
}
