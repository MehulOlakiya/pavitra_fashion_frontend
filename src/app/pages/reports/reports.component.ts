import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BookingService, Booking, BookingStatus } from '../../core/booking.service';
import { CustomerService, CustomerReport } from '../../core/customer.service';
import { DateRangePickerComponent } from '../../shared/date-range-picker/date-range-picker.component';
import * as XLSX from 'xlsx';

type ReportTab = 'bookings' | 'customers';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DatePipe,
    CurrencyPipe,
    TitleCasePipe,
    DateRangePickerComponent,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  private bookingService = inject(BookingService);
  private customerService = inject(CustomerService);

  activeTab: ReportTab = 'bookings';
  loading = false;

  // Date picker state
  bookingDatePickerOpen = false;

  // Booking Report
  bookings: Booking[] = [];
  bookingFilters = {
    status: '' as BookingStatus | '',
    fromDate: '',
    toDate: '',
  };
  readonly bookingStatuses: { value: BookingStatus | ''; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: 'booked', label: 'Booked' },
    { value: 'rented', label: 'Rented' },
    { value: 'pending_return', label: 'Pending Return' },
    { value: 'returned', label: 'Returned' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  // Customer Report
  customers: CustomerReport[] = [];

  // Computed Date objects for the picker component
  get bookingFromDateObj(): Date | null {
    return this.bookingFilters.fromDate ? new Date(this.bookingFilters.fromDate) : null;
  }

  get bookingToDateObj(): Date | null {
    return this.bookingFilters.toDate ? new Date(this.bookingFilters.toDate) : null;
  }

  ngOnInit() {
    this.loadBookingReport();
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.bookingDatePickerOpen = false;
  }

  toggleBookingDatePicker() {
    this.bookingDatePickerOpen = !this.bookingDatePickerOpen;
  }

  applyBookingDateRange(range: { from: Date | null; to: Date | null }) {
    this.bookingFilters.fromDate = range.from
      ? range.from.toISOString().slice(0, 10)
      : '';
    this.bookingFilters.toDate = range.to
      ? range.to.toISOString().slice(0, 10)
      : '';
    this.bookingDatePickerOpen = false;
  }

  clearBookingDates() {
    this.bookingFilters.fromDate = '';
    this.bookingFilters.toDate = '';
    this.bookingDatePickerOpen = false;
  }

  setTab(tab: ReportTab) {
    this.activeTab = tab;
    if (tab === 'bookings') this.loadBookingReport();
    else this.loadCustomerReport();
  }

  loadBookingReport() {
    this.loading = true;
    const params: any = {};
    if (this.bookingFilters.status) params.status = this.bookingFilters.status;
    if (this.bookingFilters.fromDate) params.fromDate = this.bookingFilters.fromDate;
    if (this.bookingFilters.toDate) params.toDate = this.bookingFilters.toDate;
    this.bookingService.getReport(params).subscribe({
      next: (data) => {
        this.bookings = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  loadCustomerReport() {
    this.loading = true;
    this.customerService.getReport().subscribe({
      next: (data) => {
        this.customers = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  // ── KPI helpers ────────────────────────────────────────────
  get totalBookings() { return this.bookings.length; }
  get totalRevenue() { return this.bookings.reduce((s, b) => s + (b.totalPayment ?? 0), 0); }
  get totalAdvance() { return this.bookings.reduce((s, b) => s + (b.advancePayment ?? 0), 0); }
  get totalPending() { return this.bookings.reduce((s, b) => s + (b.remainingPayment ?? 0), 0); }
  get totalCustomers() { return this.customers.length; }
  get totalCustomerRevenue() { return this.customers.reduce((s, c) => s + (c.totalRevenue ?? 0), 0); }
  get totalCustomerPending() { return this.customers.reduce((s, c) => s + (c.pendingPayment ?? 0), 0); }

  // ── Status helpers ─────────────────────────────────────────
  statusLabel(status: string): string {
    const map: Record<string, string> = {
      booked: 'Booked', rented: 'Rented', pending_return: 'Pending Return',
      returned: 'Returned', cancelled: 'Cancelled',
    };
    return map[status] ?? status;
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      booked: 'badge--booked', rented: 'badge--rented',
      pending_return: 'badge--pending', returned: 'badge--returned', cancelled: 'badge--cancelled',
    };
    return map[status] ?? '';
  }

  productSummary(b: Booking): string {
    if (!b.items || b.items.length === 0) return b.productSerialNumber ?? '—';
    return b.items.map(i => `${i.serialNumber}${i.quantity > 1 ? ` x${i.quantity}` : ''}`).join(', ');
  }

  formatDate(d: string | Date | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  // ── Export ─────────────────────────────────────────────────
  downloadBookingExcel() {
    const statusNote = this.bookingFilters.status
      ? this.statusLabel(this.bookingFilters.status)
      : 'All Statuses';
    const dateNote = (this.bookingFilters.fromDate && this.bookingFilters.toDate)
      ? `${this.bookingFilters.fromDate} to ${this.bookingFilters.toDate}`
      : 'All Dates';

    const rows = this.bookings.map((b, i) => ({
      'Sr.': i + 1,
      'Order ID': b.orderId ?? '—',
      'Customer Name': b.customer?.name ?? '—',
      'Mobile': b.customer?.mobileNumber ?? '—',
      'Village/City': b.customer?.village ?? '—',
      'Products': this.productSummary(b),
      'Booking Date': this.formatDate(b.bookingDate),
      'Pickup Time': b.pickupTime ?? '—',
      'Return Date': this.formatDate(b.returnDate),
      'Return Time': b.returnTime ?? '—',
      'Advance (₹)': b.advancePayment ?? 0,
      'Remaining (₹)': b.remainingPayment ?? 0,
      'Total (₹)': b.totalPayment ?? 0,
      'Status': this.statusLabel(b.status),
      'Note': b.note ?? '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto column widths
    const colWidths = Object.keys(rows[0] || {}).map(() => ({ wch: 18 }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Booking Report');

    // Add meta sheet
    const metaRows = [
      { Field: 'Report Type', Value: 'Booking Report' },
      { Field: 'Status Filter', Value: statusNote },
      { Field: 'Date Range', Value: dateNote },
      { Field: 'Generated On', Value: new Date().toLocaleString('en-IN') },
      { Field: 'Total Records', Value: rows.length },
    ];
    const metaWs = XLSX.utils.json_to_sheet(metaRows);
    XLSX.utils.book_append_sheet(wb, metaWs, 'Report Info');

    const filename = `Booking-Report-${statusNote.replace(/\s/g, '_')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  downloadCustomerExcel() {
    const rows = this.customers.map((c, i) => ({
      'Sr.': i + 1,
      'Customer ID': c.customerId ?? '—',
      'Name': c.name,
      'Mobile': c.mobileNumber,
      'Village/City': c.village,
      'Total Bookings': c.totalBooking ?? 0,
      'Total Revenue (₹)': c.totalRevenue ?? 0,
      'Pending Payment (₹)': c.pendingPayment ?? 0,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer Report');

    const metaRows = [
      { Field: 'Report Type', Value: 'Customer Report' },
      { Field: 'Generated On', Value: new Date().toLocaleString('en-IN') },
      { Field: 'Total Customers', Value: rows.length },
    ];
    const metaWs = XLSX.utils.json_to_sheet(metaRows);
    XLSX.utils.book_append_sheet(wb, metaWs, 'Report Info');

    XLSX.writeFile(wb, `Customer-Report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
}
