import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgClass, DecimalPipe } from '@angular/common';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  Booking,
  BookingService,
  BookingStatus,
  BookingAnalytics,
} from '../../core/booking.service';
import { Product, ProductService } from '../../core/product.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { ToastService } from '../../shared/toast/toast.service';
import { CustomSelectComponent } from '../../shared/custom-select/custom-select.component';
import { DateRangePickerComponent } from '../../shared/date-range-picker/date-range-picker.component';

@Component({
  selector: 'app-booking-list',
  imports: [
    FormsModule,
    NgClass,
    DecimalPipe,
    PaginationComponent,
    CustomSelectComponent,
    DateRangePickerComponent,
  ],
  templateUrl: './booking-list.component.html',
  styleUrl: './booking-list.component.scss',
})
export class BookingListComponent implements OnInit, OnDestroy {
  searchQuery = '';
  statusFilter = '';
  loading = false;
  openMenuId: string | null = null;

  // Date range filter
  dateRangeOpen = false;
  fromDate: Date | null = null;
  toDate: Date | null = null;

  get dateRangeActive(): boolean {
    return !!(this.fromDate || this.toDate);
  }

  get dateRangeLabel(): string {
    if (this.fromDate && this.toDate) {
      return `${this.fmt(this.fromDate)} – ${this.fmt(this.toDate)}`;
    }
    if (this.fromDate) return `From ${this.fmt(this.fromDate)}`;
    if (this.toDate) return `To ${this.fmt(this.toDate)}`;
    return 'Date Range';
  }

  private fmt(d: Date): string {
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  summary = {
    total: 0,
    active: 0,
    pendingReturn: 0,
    returned: 0,
    cancelled: 0,
  };

  // Quick-edit modal
  editingBooking: Booking | null = null;
  editForm = {
    status: 'active' as BookingStatus,
    fullPayment: false,
    amountReceived: null as number | null,
  };
  saving = false;

  readonly statusFilterOptions = [
    { value: '', label: 'Status: All' },
    { value: 'active', label: 'Active' },
    { value: 'pending_return', label: 'Pending Return' },
    { value: 'returned', label: 'Returned' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  readonly statusEditOptions = [
    { value: 'active', label: 'Active' },
    { value: 'pending_return', label: 'Pending Return' },
    { value: 'returned', label: 'Returned' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  bookings: Booking[] = [];
  private productImageMap = new Map<string, string>();
  private productRentMap = new Map<string, number>();

  // Pagination state
  currentPage = 1;
  totalPages = 1;
  total = 0;
  readonly limit = 10;

  private searchSubject = new Subject<string>();
  private sub = new Subscription();

  constructor(
    private router: Router,
    private bookingService: BookingService,
    private productService: ProductService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.productService.getAll().subscribe({
      next: (products) => {
        products.forEach((p) => {
          if (p.imageUrl) this.productImageMap.set(p.serialNumber, p.imageUrl);
          this.productRentMap.set(p.serialNumber, p.rentPrice);
        });
      },
    });
    this.load();

    this.sub.add(
      this.searchSubject
        .pipe(debounceTime(400), distinctUntilChanged())
        .subscribe(() => {
          this.currentPage = 1;
          this.load();
        }),
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  onStatusChange(): void {
    this.currentPage = 1;
    this.load();
  }

  goToPage(page: number): void {
    if (page === this.currentPage) return;
    this.currentPage = page;
    this.load();
  }

  newBooking(): void {
    this.router.navigate(['/bookings/new']);
  }

  toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  @HostListener('document:click')
  closeMenu(): void {
    this.openMenuId = null;
  }

  toggleDateRange(event: MouseEvent): void {
    event.stopPropagation();
    this.dateRangeOpen = !this.dateRangeOpen;
  }

  closeDateRange(): void {
    this.dateRangeOpen = false;
  }

  applyDateRange(range: { from: Date | null; to: Date | null }): void {
    this.fromDate = range.from;
    this.toDate = range.to;
    this.dateRangeOpen = false;
    this.currentPage = 1;
    this.load();
  }

  clearDateRange(): void {
    this.fromDate = null;
    this.toDate = null;
    this.dateRangeOpen = false;
    this.currentPage = 1;
    this.load();
  }

  openEdit(booking: Booking, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuId = null;
    this.editingBooking = booking;
    this.editForm.status = booking.status;
    this.editForm.fullPayment = booking.remainingPayment === 0;
    this.editForm.amountReceived = null;
  }

  closeEdit(): void {
    this.editingBooking = null;
    this.saving = false;
  }

  saveEdit(): void {
    if (!this.editingBooking) return;
    this.saving = true;
    const payload: { status: BookingStatus; remainingPayment?: number } = {
      status: this.editForm.status,
    };
    if (this.editForm.fullPayment) {
      payload.remainingPayment = 0;
    } else if (
      this.editForm.amountReceived &&
      this.editForm.amountReceived > 0
    ) {
      payload.remainingPayment = Math.max(
        0,
        (this.editingBooking.remainingPayment ?? 0) -
          this.editForm.amountReceived,
      );
    }
    this.bookingService.update(this.editingBooking._id, payload).subscribe({
      next: (updated) => {
        const idx = this.bookings.findIndex((b) => b._id === updated._id);
        if (idx !== -1) this.bookings[idx] = updated;
        this.toastService.show(
          'success',
          'Booking Updated',
          'Changes saved successfully.',
        );
        this.closeEdit();
      },
      error: () => {
        this.toastService.show(
          'error',
          'Update Failed',
          'Could not save changes.',
        );
        this.saving = false;
      },
    });
  }

  cancelBooking(booking: Booking, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuId = null;
    this.bookingService.updateStatus(booking._id, 'cancelled').subscribe({
      next: (updated) => {
        const idx = this.bookings.findIndex((b) => b._id === updated._id);
        if (idx !== -1) this.bookings[idx] = updated;
        this.toastService.show(
          'success',
          'Booking Cancelled',
          'The booking has been cancelled.',
        );
      },
      error: () => {
        this.toastService.show(
          'error',
          'Update Failed',
          'Could not cancel the booking.',
        );
      },
    });
  }

  private toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}T00:00:00.000Z`;
  }

  private load(): void {
    this.loading = true;
    const q = this.searchQuery.trim() || undefined;
    const hasFilter = q || this.statusFilter || this.fromDate || this.toDate;

    const obs = hasFilter
      ? this.bookingService.search({
          customerName: q,
          serialNumber: q,
          customerPhone: q,
          status: (this.statusFilter as BookingStatus) || undefined,
          fromDate: this.fromDate ? this.toISODate(this.fromDate) : undefined,
          toDate: this.toDate ? this.toISODate(this.toDate) : undefined,
          page: this.currentPage,
          limit: this.limit,
        })
      : this.bookingService.findAll(this.currentPage, this.limit);

    this.sub.add(
      obs.subscribe({
        next: (res) => {
          this.bookings = res.data;
          this.total = res.total;
          this.totalPages = res.totalPages;
          this.loading = false;
          this.loadSummary();
        },
        error: () => {
          this.loading = false;
        },
      }),
    );
  }

  getProductImage(serialNumber: string): string {
    return this.productImageMap.get(serialNumber) ?? '';
  }

  getProductRent(serialNumber: string): number | null {
    return this.productRentMap.get(serialNumber) ?? null;
  }

  private loadSummary(): void {
    const params: { fromDate?: string; toDate?: string } = {};
    if (this.fromDate) params.fromDate = this.toISODate(this.fromDate);
    if (this.toDate) params.toDate = this.toISODate(this.toDate);
    this.bookingService.getAnalytics(params).subscribe({
      next: (analytics: BookingAnalytics) => {
        this.summary.total = analytics.total;
        this.summary.active = analytics.active;
        this.summary.pendingReturn = analytics.pending_return;
        this.summary.returned = analytics.returned;
        this.summary.cancelled = analytics.cancelled;
      },
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'badge--active';
      case 'pending_return':
        return 'badge--pending';
      case 'returned':
        return 'badge--returned';
      case 'cancelled':
        return 'badge--cancelled';
      default:
        return '';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Active';
      case 'pending_return':
        return 'Pending Return';
      case 'returned':
        return 'Returned';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  isCancelled(status: string): boolean {
    return status === 'cancelled';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
