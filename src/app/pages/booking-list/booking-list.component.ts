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
} from '../../core/booking.service';
import { Product, ProductService } from '../../core/product.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { ToastService } from '../../shared/toast/toast.service';
import { CustomSelectComponent } from '../../shared/custom-select/custom-select.component';

@Component({
  selector: 'app-booking-list',
  imports: [
    FormsModule,
    NgClass,
    DecimalPipe,
    PaginationComponent,
    CustomSelectComponent,
  ],
  templateUrl: './booking-list.component.html',
  styleUrl: './booking-list.component.scss',
})
export class BookingListComponent implements OnInit, OnDestroy {
  searchQuery = '';
  statusFilter = '';
  loading = false;
  openMenuId: string | null = null;

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

  private load(): void {
    this.loading = true;
    const q = this.searchQuery.trim() || undefined;
    const hasFilter = q || this.statusFilter;

    const obs = hasFilter
      ? this.bookingService.search({
          customerName: q,
          serialNumber: q,
          customerPhone: q,
          status: (this.statusFilter as BookingStatus) || undefined,
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

  private loadSummary(): void {
    this.bookingService.findAll(1, 1000).subscribe({
      next: (res) => {
        this.summary.total = res.total;
        this.summary.active = res.data.filter(
          (b) => b.status === 'active',
        ).length;
        this.summary.pendingReturn = res.data.filter(
          (b) => b.status === 'pending_return',
        ).length;
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
