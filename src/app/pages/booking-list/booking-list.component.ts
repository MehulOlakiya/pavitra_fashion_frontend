import { Component, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgClass, DecimalPipe } from '@angular/common';
import {
  DomSanitizer,
  SafeUrl,
  SafeResourceUrl,
} from '@angular/platform-browser';
import { Subject, Subscription, forkJoin, of, from } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  catchError,
  map,
} from 'rxjs/operators';
import {
  Booking,
  BookingService,
  BookingStatus,
  BookingAnalytics,
} from '../../core/booking.service';
import { Product, ProductService } from '../../core/product.service';
import { WhatsappService, WhatsAppStatus } from '../../core/whatsapp.service';
import { AuthService } from '../../core/auth.service';
import { UserStateService } from '../../core/user-state.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { ToastService } from '../../shared/toast/toast.service';
import { CustomSelectComponent } from '../../shared/custom-select/custom-select.component';
import { DateRangePickerComponent } from '../../shared/date-range-picker/date-range-picker.component';
import { NumbersOnlyDirective } from '../../shared/directives/numbers-only.directive';

@Component({
  selector: 'app-booking-list',
  imports: [
    FormsModule,
    NgClass,
    DecimalPipe,
    PaginationComponent,
    CustomSelectComponent,
    DateRangePickerComponent,
    NumbersOnlyDirective,
  ],
  templateUrl: './booking-list.component.html',
  styleUrl: './booking-list.component.scss',
})
export class BookingListComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private userState = inject(UserStateService);

  // ── WhatsApp bill ───────────────────────────────────────────────
  waModalOpen = false;
  waStatus: WhatsAppStatus = { state: 'idle', qr: null };
  waInitLoading = false;
  sendingBill = false;
  pendingBillBooking: Booking | null = null;
  billResendModalOpen = false;
  private waBookingProduct: Product | null = null;
  private billSourceModal: 'detail' | 'edit' | null = null;
  private waSseSub: Subscription | null = null;

  // Preview Modal
  isPreviewModalOpen = false;
  isPreviewLoading = false;
  isPrinting = false;
  pdfBlobUrl: SafeResourceUrl | null = null;
  rawPdfBlob: Blob | null = null;
  tempPdfBlob: Blob | null = null;
  previewBooking: Booking | null = null;

  // Items Modal
  itemsModalOpen = false;
  selectedBookingForItems: Booking | null = null;
  modalItems: any[] = [];

  get waQrSafeUrl(): SafeUrl | null {
    const qr = this.waStatus.qr;
    if (!qr) return null;
    return this.sanitizer.bypassSecurityTrustUrl(qr);
  }

  // Cancel Modal
  cancelModalOpen = false;
  bookingToCancel: Booking | null = null;

  searchQuery = '';
  statusFilter = '';
  loading = false;
  openMenuId: string | null = null;

  // Date range filter
  dateRangeOpen = false;
  fromDate: Date | null = null;
  toDate: Date | null = null;

  // Password Modal
  passwordModalOpen = false;
  masterPassword = '';
  verifyingPassword = false;
  passwordError = '';
  private passwordSuccessCallback: (() => void) | null = null;
  private passwordCancelCallback: (() => void) | null = null;

  promptMasterPassword(onSuccess: () => void, onCancel?: () => void): void {
    this.masterPassword = '';
    this.passwordError = '';
    this.passwordSuccessCallback = onSuccess;
    this.passwordCancelCallback = onCancel || null;
    this.passwordModalOpen = true;
  }

  closePasswordModal(): void {
    this.passwordModalOpen = false;
    if (this.passwordCancelCallback) {
      this.passwordCancelCallback();
    }
    this.passwordSuccessCallback = null;
    this.passwordCancelCallback = null;
  }

  verifyPasswordAndProceed(): void {
    if (!this.masterPassword) {
      this.passwordError = 'Password is required';
      return;
    }
    
    const user = this.userState.user();
    if (!user || !user.email) {
      this.passwordError = 'Could not determine user email.';
      return;
    }

    this.verifyingPassword = true;
    this.passwordError = '';
    
    this.authService.login({ email: user.email, password: this.masterPassword }).subscribe({
      next: () => {
        this.verifyingPassword = false;
        this.passwordModalOpen = false;
        if (this.passwordSuccessCallback) {
          this.passwordSuccessCallback();
        }
        this.passwordSuccessCallback = null;
        this.passwordCancelCallback = null;
      },
      error: () => {
        this.verifyingPassword = false;
        this.passwordError = 'Incorrect password. Please try again.';
      }
    });
  }

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

  // Quick-edit modal
  quickEditView: 'menu' | 'status' | 'settlement' | 'return_settlement' | 'delete' = 'menu';
  editingBooking: Booking | null = null;
  editForm = {
    status: 'booked' as BookingStatus,
    fullPayment: false,
    amountReceived: null as number | null,
  };
  statusModalSelectedProductIds: Set<string> = new Set();
  
  settlementForm = {
    type: 'receive' as 'receive' | 'refund',
    amount: null as number | null,
  };
  saving = false;
  originalStatusForCancel: string | null = null;

  // Detail view modal
  viewingBooking: Booking | null = null;
  viewingProducts: { product: Product; quantity: number }[] = [];
  viewingProductLoading = false;

  readonly statusFilterOptions = [
    { value: '', label: 'Status: All' },
    { value: 'booked', label: 'Booked' },
    { value: 'rented', label: 'Rented' },
    { value: 'pending_return', label: 'Pending Return' },
    { value: 'returned', label: 'Returned' },
    { value: 'partial_return', label: 'Partial Return' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  readonly statusEditOptions = [
    { value: 'booked', label: 'Booked' },
    { value: 'rented', label: 'Rented' },
    { value: 'pending_return', label: 'Pending Return' },
    { value: 'returned', label: 'Returned' },
    { value: 'partial_return', label: 'Partial Return' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  bookings: Booking[] = [];
  private productImageMap = new Map<string, string>();
  private productNameMap = new Map<string, string>();
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
    private whatsappService: WhatsappService,
    private sanitizer: DomSanitizer,
  ) {}

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
    this.waSseSub?.unsubscribe();
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

  viewBooking(booking: Booking): void {
    this.router.navigate(['/bookings', booking._id]);
  }

  closeDetail(): void {
    this.viewingBooking = null;
    this.viewingProducts = [];
  }

  openItemModal(booking: Booking): void {
    this.selectedBookingForItems = booking;
    this.modalItems =
      booking.items && booking.items.length > 0
        ? booking.items
        : booking.productSerialNumber
          ? [{ serialNumber: booking.productSerialNumber, quantity: 1 }]
          : [];
    this.itemsModalOpen = true;
  }

  closeItemModal(): void {
    this.itemsModalOpen = false;
    this.selectedBookingForItems = null;
    this.modalItems = [];
  }

  getPendingCount(booking: Booking | null): number {
    if (!booking) return 0;
    if (booking.items && booking.items.length > 0) {
      return booking.items.filter((item: any) => !item.isReturned).length;
    }
    return booking.status === 'returned' ? 0 : 1;
  }

  toggleMenu(id: string, event: MouseEvent): void {
    const booking = this.bookings.find((booking) => id === booking._id);
    if (booking?.status === 'cancelled') {
      return;
    }
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

  openEdit(booking: Booking, event?: MouseEvent): void {
    event?.stopPropagation();
    this.openMenuId = null;
    this.editingBooking = booking;
    this.quickEditView = 'menu';
    this.editForm.status = booking.status;
    this.editForm.fullPayment = booking.remainingPayment === 0;
    this.editForm.amountReceived = null;
    
    this.statusModalSelectedProductIds = new Set();
    if (booking.items) {
      booking.items.forEach(i => {
        if (i.isReturned) {
          this.statusModalSelectedProductIds.add(i.serialNumber);
        }
      });
    }
  }

  goToStatus(skipPassword = false): void {
    const execute = () => {
      this.quickEditView = 'status';
      if (this.editForm.status === 'returned' || this.editForm.status === 'partial_return') {
        if (this.editForm.status === 'returned' && this.statusModalSelectedProductIds.size === 0) {
           this.getEditingItems().forEach(i => this.statusModalSelectedProductIds.add(i.serialNumber));
        }
      }
    };

    if (skipPassword) {
      execute();
    } else {
      this.promptMasterPassword(execute);
    }
  }

  goToReturnSettlement(): void {
    this.quickEditView = 'return_settlement';
    this.settlementForm = {
      type: 'receive',
      amount: null,
    };
    if (this.editForm.status === 'returned' && this.statusModalSelectedProductIds.size === 0) {
      this.getEditingItems().forEach(i => this.statusModalSelectedProductIds.add(i.serialNumber));
    }
  }

  toggleStatusProduct(serialNumber: string): void {
    if (this.statusModalSelectedProductIds.has(serialNumber)) {
      this.statusModalSelectedProductIds.delete(serialNumber);
    } else {
      this.statusModalSelectedProductIds.add(serialNumber);
    }
    this.updatePartialReturnStatus();
  }

  updatePartialReturnStatus(): void {
    const totalItems = this.getEditingItems().length;
    if (totalItems === 0) return;
    
    if (this.statusModalSelectedProductIds.size === totalItems) {
      this.editForm.status = 'returned';
    } else if (this.statusModalSelectedProductIds.size > 0) {
      this.editForm.status = 'partial_return';
    }
  }

  onEditStatusChange(status: string): void {
    if (status === 'returned') {
      this.getEditingItems().forEach(i => this.statusModalSelectedProductIds.add(i.serialNumber));
    } else if (status !== 'partial_return') {
      this.statusModalSelectedProductIds.clear();
    }
  }


  goToSettlement(): void {
    this.quickEditView = 'settlement';
    this.settlementForm = {
      type: 'receive',
      amount: null,
    };
  }

  goToDelete(): void {
    this.quickEditView = 'delete';
  }

  backToMenu(): void {
    this.quickEditView = 'menu';
  }

  cancelSettlement(): void {
    if (this.originalStatusForCancel) {
      this.closeEdit();
    } else {
      this.backToMenu();
    }
  }

  closeEdit(): void {
    if (this.editingBooking && this.originalStatusForCancel) {
      this.editingBooking.status = this.originalStatusForCancel as BookingStatus;
    }
    this.originalStatusForCancel = null;

    this.editingBooking = null;
    this.saving = false;
    this.quickEditView = 'menu';
    this.bookings = [...this.bookings];
  }

  getEditingItems(): any[] {
    if (!this.editingBooking) return [];
    if (this.editingBooking.items?.length) return this.editingBooking.items;
    return [{ serialNumber: this.editingBooking.productSerialNumber, quantity: 1, rentPrice: 0 }];
  }

  submitSettlement(): void {
    if (!this.editingBooking) return;

    this.saving = true;
    let newRemaining = this.editingBooking.remainingPayment || 0;
    let newAdvance = this.editingBooking.advancePayment || 0;

    if (this.settlementForm.amount) {
      newRemaining = Math.max(0, newRemaining - this.settlementForm.amount);
    }

    const payload: any = {
      remainingPayment: newRemaining,
      advancePayment: newAdvance,
      status: this.editForm.status,
    };

    if (this.quickEditView === 'return_settlement') {
      payload.status = this.editForm.status;
      payload.items = this.getEditingItems().map(item => ({
        product: item.product?._id || item.product,
        serialNumber: item.serialNumber,
        quantity: item.quantity,
        isReturned: this.statusModalSelectedProductIds.has(item.serialNumber)
      }));
    }

    this.bookingService.update(this.editingBooking._id, payload).subscribe({
      next: (updated) => {
        const idx = this.bookings.findIndex((b) => b._id === updated._id);
        if (idx !== -1) this.bookings[idx] = updated;
        this.toastService.show('success', 'Changes Saved', 'Information updated successfully.');
        this.originalStatusForCancel = null;
        this.closeEdit();
      },
      error: () => {
        this.toastService.show('error', 'Update Failed', 'Could not save changes.');
        this.saving = false;
      },
    });
  }

  deleteBookingSoft(): void {
    if (!this.editingBooking) return;
    this.saving = true;
    this.bookingService.delete(this.editingBooking._id).subscribe({
      next: () => {
        this.bookings = this.bookings.filter((b) => b._id !== this.editingBooking!._id);
        this.toastService.show('success', 'Booking Deleted', 'The booking was successfully deleted.');
        this.originalStatusForCancel = null;
        this.closeEdit();
        this.total--;
      },
      error: () => {
        this.toastService.show('error', 'Delete Failed', 'Could not delete the booking.');
        this.saving = false;
      },
    });
  }

  saveEdit(): void {
    if (!this.editingBooking) return;
    this.saving = true;
    const payload: { status: BookingStatus; remainingPayment?: number; items?: any[] } = {
      status: this.editForm.status,
    };
    
    if (this.editForm.status === 'returned' || this.editForm.status === 'partial_return') {
      payload.items = this.getEditingItems().map(item => ({
        product: item.product?._id || item.product,
        serialNumber: item.serialNumber,
        quantity: item.quantity,
        isReturned: this.statusModalSelectedProductIds.has(item.serialNumber)
      }));
    }
    
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
        this.originalStatusForCancel = null;
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

  markAsRented(): void {
    this.editForm.status = 'rented' as any;
    this.saveEdit();
  }

  markAsReturned(): void {
    this.editForm.status = 'returned' as any;
    this.saveEdit();
  }

  cancelBooking(booking: Booking, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuId = null;
    this.bookingToCancel = booking;
    this.cancelModalOpen = true;
  }

  confirmCancelBooking(): void {
    if (!this.bookingToCancel) return;
    this.bookingService
      .updateStatus(this.bookingToCancel._id, 'cancelled')
      .subscribe({
        next: (updated) => {
          const idx = this.bookings.findIndex((b) => b._id === updated._id);
          if (idx !== -1) this.bookings[idx] = updated;
          this.toastService.show(
            'success',
            'Booking Cancelled',
            'The booking has been cancelled.',
          );
          this.closeCancelModal();
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

  closeCancelModal(): void {
    this.cancelModalOpen = false;
    this.bookingToCancel = null;
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
          orderId: q,
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
          this.loadMissingProducts(res.data);
        },
        error: () => {
          this.loading = false;
        },
      }),
    );
  }

  private loadMissingProducts(bookings: Booking[]): void {
    const missingSerials = new Set<string>();
    bookings.forEach((b) => {
      const items =
        b.items && b.items.length > 0
          ? b.items
          : b.productSerialNumber
            ? [{ serialNumber: b.productSerialNumber }]
            : [];
      items.forEach((i: any) => {
        const sn = String(i.serialNumber).trim().toLowerCase();
        if (
          sn &&
          !this.productImageMap.has(sn) &&
          !this.productRentMap.has(sn)
        ) {
          missingSerials.add(sn);
        }
      });
    });

    if (missingSerials.size === 0) return;

    this.productService
      .getBySerialNumbers(Array.from(missingSerials))
      .subscribe({
        next: (products) => {
          products.forEach((p) => {
            const sn = p.serialNumber.trim().toLowerCase();
            if (p.imageUrl) this.productImageMap.set(sn, p.imageUrl);
            if (p.name) this.productNameMap.set(sn, p.name);
            this.productRentMap.set(sn, p.rentPrice);
          });
        },
      });
  }

  getProductImage(serialNumber: any): string {
    if (!serialNumber) return '';
    return (
      this.productImageMap.get(String(serialNumber).trim().toLowerCase()) ?? ''
    );
  }

  getProductName(serialNumber: any): string {
    if (!serialNumber) return '';
    return (
      this.productNameMap.get(String(serialNumber).trim().toLowerCase()) ?? String(serialNumber)
    );
  }

  getProductRent(serialNumber: any): number | null {
    if (!serialNumber) return null;
    return (
      this.productRentMap.get(String(serialNumber).trim().toLowerCase()) ?? null
    );
  }

  getTotalPayment(booking: Booking): number {
    if (booking.totalPayment !== undefined && booking.totalPayment !== null) {
      return booking.totalPayment;
    }
    let total = 0;
    const items =
      booking.items && booking.items.length > 0
        ? booking.items
        : booking.productSerialNumber
          ? [
              {
                serialNumber: booking.productSerialNumber,
                quantity: 1,
                freshPiece: booking.freshPiece,
                freshPieceCost: booking.freshPieceCost,
              },
            ]
          : [];

    items.forEach((i: any) => {
      const rent = this.getProductRent(i.serialNumber) || 0;
      total += rent * i.quantity;
      if (i.freshPiece && i.freshPieceCost) {
        total += i.freshPieceCost;
      }
    });
    return total;
  }

  statusClass(status: string): string {
    switch (status) {
      case 'booked':
        return 'badge--booked';
      case 'rented':
        return 'badge--rented';
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
      case 'booked':
        return 'Pending Pickup';
      case 'rented':
        return 'Rented';
      case 'pending_return':
        return 'Pending Return';
      case 'partial_return':
        return 'Partial Return';
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

  getAvailableStatusOptions(status: string): { value: string; label: string }[] {
    const optionsMap: Record<string, { value: string; label: string }[]> = {
      'booked': [
        { value: 'booked', label: 'Booked' },
        { value: 'rented', label: 'Rented' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      'rented': [
        { value: 'rented', label: 'Rented' },
        { value: 'pending_return', label: 'Pending Return' },
        { value: 'returned', label: 'Returned' },
      ],
      'pending_return': [
        { value: 'pending_return', label: 'Pending Return' },
        { value: 'returned', label: 'Returned' },
      ],
      'partial_return': [
        { value: 'partial_return', label: 'Partial Return' },
        { value: 'returned', label: 'Returned' },
      ],
      'returned': [
        { value: 'returned', label: 'Returned' },
      ],
      'cancelled': [
        { value: 'cancelled', label: 'Cancelled' },
      ],
    };

    return optionsMap[status] || [{ value: status, label: this.statusLabel(status) }];
  }

  onRowStatusChange(booking: Booking, newStatus: string): void {
    if (booking.status === newStatus) return;

    this.originalStatusForCancel = booking.status;
    booking.status = newStatus as BookingStatus;
    this.openEdit(booking);
    this.editForm.status = newStatus as BookingStatus;

    if (newStatus === 'returned' || newStatus === 'partial_return') {
      this.goToReturnSettlement();
    } else {
      this.goToSettlement();
    }
  }

  totalRemaining(booking: Booking): number {
    if (booking.remainingPayment === 0) {
      return 0;
    }
    return (
      (booking.remainingPayment ?? 0) +
      (booking.freshPiece ? (booking.freshPieceCost ?? 0) : 0)
    );
  }

  // ── Download/Generate Bill ─────────────────────────────────────────────────
  generateBill(booking: Booking, event?: MouseEvent): void {
    event?.stopPropagation();
    this.openMenuId = null;
    this.previewBooking = booking;

    this.isPreviewModalOpen = true;
    this.isPreviewLoading = true;
    this.pdfBlobUrl = null;
    this.rawPdfBlob = null;

    this.bookingService.downloadInvoice(booking._id).subscribe({
      next: (blob) => {
        this.rawPdfBlob = blob;
        const url = window.URL.createObjectURL(blob);
        this.pdfBlobUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          url + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH',
        );
        this.isPreviewLoading = false;
      },
      error: () => {
        this.isPreviewLoading = false;
        this.toastService.show(
          'error',
          'Preview Failed',
          'Failed to generate invoice preview.',
        );
      },
    });
  }

  closePreview(): void {
    this.isPreviewModalOpen = false;
    this.pdfBlobUrl = null;
    this.rawPdfBlob = null;
    this.previewBooking = null;
  }

  downloadFromPreview(): void {
    if (!this.rawPdfBlob || !this.previewBooking) return;
    const url = window.URL.createObjectURL(this.rawPdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${this.previewBooking.orderId?.split('-')[1] || this.previewBooking.orderId}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.toastService.show(
      'success',
      'Download Complete',
      'Invoice downloaded successfully.',
    );
    this.closePreview();
  }

  downloadBill(booking: Booking): void {
    this.closeEdit();
    this.toastService.show('info', 'Downloading', 'Bill downloading started...');
    this.bookingService.downloadInvoice(booking._id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice-${booking.orderId?.split('-')[1] || booking.orderId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toastService.show('success', 'Download Complete', 'Invoice downloaded successfully.');
      },
      error: () => {
        this.toastService.show('error', 'Download Failed', 'Failed to download invoice.');
      },
    });
  }

  printBill(booking: Booking): void {
    this.closeEdit();
    this.isPrinting = true; // Show dedicated print loader
    this.bookingService.downloadInvoice(booking._id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          this.isPrinting = false; // Hide loader when ready to print
          iframe.contentWindow?.print();
          // Optional: Clean up iframe after a delay
          setTimeout(() => {
            document.body.removeChild(iframe);
            window.URL.revokeObjectURL(url);
          }, 2000);
        };
      },
      error: () => {
        this.isPrinting = false;
        this.toastService.show('error', 'Print Failed', 'Failed to generate invoice for printing.');
      },
    });
  }

  printFromPreview(): void {
    if (!this.rawPdfBlob) return;
    const url = window.URL.createObjectURL(this.rawPdfBlob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print();
      }, 500);
    };
    this.closePreview();
  }

  sendBillFromPreview(): void {
    if (!this.previewBooking) return;

    if (this.rawPdfBlob) {
      this.tempPdfBlob = this.rawPdfBlob;
    }

    this.closePreview();
    this.sendBillWhatsApp(this.previewBooking, undefined, 'detail');
  }

  // ── WhatsApp Bill ─────────────────────────────────────────────────

  sendBillWhatsApp(
    booking: Booking,
    event?: MouseEvent,
    source?: 'detail' | 'edit',
  ): void {
    event?.stopPropagation();
    this.openMenuId = null;

    // If bill was already sent, show the resend-warning modal first
    if (booking.isBillSend) {
      this.pendingBillBooking = booking;
      this.billSourceModal = source ?? null;
      this.billResendModalOpen = true;
      return;
    }

    this.initiateSendBillFlow(booking, source);
  }

  confirmResend(): void {
    this.billResendModalOpen = false;
    if (this.pendingBillBooking) {
      this.initiateSendBillFlow(
        this.pendingBillBooking,
        this.billSourceModal ?? undefined,
      );
    }
  }

  cancelResend(): void {
    this.billResendModalOpen = false;
    this.pendingBillBooking = null;
    this.billSourceModal = null;
  }

  private initiateSendBillFlow(
    booking: Booking,
    source?: 'detail' | 'edit',
  ): void {
    this.pendingBillBooking = booking;
    this.billSourceModal = source ?? null;
    // Build a minimal product stub from map data so we can include rent in msg
    const sn = booking.productSerialNumber?.trim().toLowerCase() || '';
    this.waBookingProduct = null;
    // (Legacy handling if needed, but we rely on items array directly inside buildBillMessage now)

    this.whatsappService.getStatus().subscribe({
      next: (status) => {
        this.waStatus = status;
        if (status.state === 'connected') {
          this.doSendBill(booking);
        } else {
          this.waModalOpen = true;
          this.startWaSession();
        }
      },
      error: () => {
        this.waModalOpen = true;
        this.startWaSession();
      },
    });
  }

  private startWaSession(): void {
    this.waInitLoading = true;
    this.whatsappService.initialize().subscribe({
      next: () => {
        this.waInitLoading = false;
        this.subscribeWaSse();
      },
      error: () => {
        this.waInitLoading = false;
        this.subscribeWaSse(); // still subscribe; may already be initializing
      },
    });
  }

  private subscribeWaSse(): void {
    this.waSseSub?.unsubscribe();
    const token = localStorage.getItem('accessToken') ?? '';
    this.waSseSub = this.whatsappService.streamStatus(token).subscribe({
      next: (status) => {
        this.waStatus = status;
        if (
          status.state === 'connected' &&
          this.pendingBillBooking &&
          this.waModalOpen
        ) {
          this.waSseSub?.unsubscribe();
          this.waSseSub = null;
          this.waModalOpen = false;
          this.doSendBill(this.pendingBillBooking);
        }
      },
    });
  }

  closeWaModal(): void {
    this.waModalOpen = false;
    this.waSseSub?.unsubscribe();
    this.waSseSub = null;
    this.pendingBillBooking = null;
    this.billSourceModal = null;
    this.waStatus = { state: 'idle', qr: null };
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private doSendBill(booking: Booking): void {
    const phone = (booking.customer?.mobileNumber || '').replace(/\D/g, '');
    const message = this.buildBillMessage(booking);
    const firstImageSn =
      booking.items && booking.items.length > 0
        ? booking.items[0].serialNumber
        : booking.productSerialNumber;

    const imageUrl = firstImageSn
      ? this.productImageMap.get(firstImageSn.trim().toLowerCase())
      : undefined;

    this.sendingBill = true;

    const blobToSend = this.tempPdfBlob;
    this.tempPdfBlob = null; // Clear it

    let obs;
    if (blobToSend) {
      obs = from(
        this.blobToBase64(blobToSend).then((base64) => {
          return this.whatsappService
            .sendPdf({
              mobileNumber: phone,
              message,
              fileBase64: base64,
              filename: `Invoice-${booking.orderId?.split('-')[1]}.pdf`,
              mimetype: 'application/pdf',
            })
            .toPromise();
        }),
      );
    } else {
      obs = this.whatsappService.sendMessage({
        mobileNumber: phone,
        message,
        imageUrl,
      });
    }

    obs.subscribe({
      next: () => {
        this.sendingBill = false;
        // Mark isBillSend = true on backend (best-effort)
        this.bookingService.markBillSent(booking._id).subscribe({
          next: (updated) => {
            // Update the booking in the local list so the flag is reflected
            const idx = this.bookings.findIndex((b) => b._id === booking._id);
            if (idx !== -1) this.bookings[idx] = updated;
          },
          error: (e) => console.error('markBillSent failed', e),
        });
        this.pendingBillBooking = null;
        // Close the modal that triggered the send
        if (this.billSourceModal === 'detail') {
          this.closeDetail();
        } else if (this.billSourceModal === 'edit') {
          this.closeEdit();
        }
        this.billSourceModal = null;
        this.toastService.show(
          'success',
          'Bill Sent',
          'Booking bill sent on WhatsApp.',
        );
      },
      error: (err) => {
        this.sendingBill = false;
        this.toastService.show(
          'error',
          'Send Failed',
          err?.error?.message ?? 'Could not send bill on WhatsApp.',
        );
      },
    });
  }

  private buildBillMessage(booking: Booking): string {
    const lines: string[] = [];
    lines.push('🧾 *Pavitra Fashion – Booking Bill*');
    lines.push('');
    // List items
    const items =
      booking.items && booking.items.length > 0
        ? booking.items
        : booking.productSerialNumber
          ? [{ serialNumber: booking.productSerialNumber, quantity: 1 }]
          : [];

    let totalRent = 0;
    items.forEach((i) => {
      const rent = this.getProductRent(i.serialNumber) || 0;
      totalRent += rent * i.quantity;
      lines.push(`👗 *Item:* #${i.serialNumber} (Qty: ${i.quantity})`);
    });

    if (totalRent > 0) {
      lines.push(
        `💵 *Total Rental Rate:* ₹${totalRent.toLocaleString('en-IN')}`,
      );
    }
    lines.push('');
    lines.push(`📅 *Booking Date:* ${this.formatDate(booking.bookingDate)}`);
    lines.push(`📅 *Return Date:* ${this.formatDate(booking.returnDate)}`);
    lines.push('');
    lines.push(
      `💰 *Advance Paid:* ₹${(booking.advancePayment ?? 0).toLocaleString('en-IN')}`,
    );
    const remaining = booking.remainingPayment ?? 0;
    if (remaining > 0) {
      lines.push(`💳 *Remaining:* ₹${remaining.toLocaleString('en-IN')}`);
    } else {
      lines.push(`✅ *Payment:* Fully Paid`);
    }
    if (booking.freshPiece && (booking.freshPieceCost ?? 0) > 0) {
      lines.push('');
      lines.push(
        `🪡 *Extra (Fresh Piece):* ₹${(booking.freshPieceCost ?? 0).toLocaleString('en-IN')}`,
      );
    }
    if (booking.beltType) lines.push(`🔗 *Belt:* ${booking.beltType}`);
    if (booking.note) {
      lines.push('');
      lines.push(`📝 *Note:* ${booking.note}`);
    }
    lines.push('');
    lines.push('🙏 Thank you for choosing *Pavitra Fashion*!');
    return lines.join('\n');
  }
}
