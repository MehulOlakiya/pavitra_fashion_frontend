import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  Booking,
  BookingService,
  BookingStatus,
} from '../../core/booking.service';

@Component({
  selector: 'app-booking-list',
  imports: [FormsModule, NgClass],
  templateUrl: './booking-list.component.html',
  styleUrl: './booking-list.component.scss',
})
export class BookingListComponent implements OnInit, OnDestroy {
  searchQuery = '';
  statusFilter = '';
  loading = false;

  bookings: Booking[] = [];

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
  ) {}

  get pageNumbers(): (number | '...')[] {
    const pages: (number | '...')[] = [];
    const total = this.totalPages;
    const cur = this.currentPage;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (cur > 3) pages.push('...');

    const start = Math.max(2, cur - 1);
    const end = Math.min(total - 1, cur + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (cur < total - 2) pages.push('...');
    pages.push(total);

    return pages;
  }

  get rangeStart(): number {
    return this.total === 0 ? 0 : (this.currentPage - 1) * this.limit + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.limit, this.total);
  }

  ngOnInit(): void {
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

  goToPage(page: number | '...'): void {
    if (page === '...' || page === this.currentPage) return;
    this.currentPage = page as number;
    this.load();
  }

  newBooking(): void {
    this.router.navigate(['/bookings/new']);
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
        },
        error: () => {
          this.loading = false;
        },
      }),
    );
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
