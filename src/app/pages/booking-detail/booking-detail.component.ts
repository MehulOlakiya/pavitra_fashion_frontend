import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Booking,
  BookingService,
  BookingStatus,
} from '../../core/booking.service';
import { forkJoin, of, from, Subject, Subscription } from 'rxjs';
import { catchError, map, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import {
  DomSanitizer,
  SafeUrl,
  SafeResourceUrl,
} from '@angular/platform-browser';
import { Product, ProductService } from '../../core/product.service';
import { Customer, CustomerService } from '../../core/customer.service';
import { WhatsappService, WhatsAppStatus } from '../../core/whatsapp.service';
import { ToastService } from '../../shared/toast/toast.service';
import { DatepickerComponent } from '../../shared/datepicker/datepicker.component';
import { NumbersOnlyDirective } from '../../shared/directives/numbers-only.directive';

export interface SelectedItem {
  product: Product;
  quantity: number;
  conflictLoading: boolean;
  hasConflict: boolean;
  conflictBookings: Booking[];
  beltType: 'HB' | 'FB' | null;
  freshPiece: boolean;
  freshPieceCost: number | null;
  rentPrice: number;
}

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    FormsModule,
    RouterLink,
    DatepickerComponent,
    NumbersOnlyDirective,
  ],
  templateUrl: './booking-detail.component.html',
  styleUrl: './booking-detail.component.scss',
})
export class BookingDetailComponent implements OnInit {
  booking: Booking | null = null;
  products: {
    product: Product;
    quantity: number;
    beltType?: string;
    freshPiece?: boolean;
    freshPieceCost?: number;
    rentPrice?: number;
  }[] = [];
  loading = true;
  errorMessage = '';

  editStatus: BookingStatus | null = null;
  editPaymentAmount: number | null = null;
  fullPaymentReceived: boolean = false;
  isSaving: boolean = false;

  // Image Modal
  selectedImage: string | null = null;
  openImageModal(imageUrl?: string): void {
    if (imageUrl) {
      this.selectedImage = imageUrl;
    }
  }
  closeImageModal(): void {
    this.selectedImage = null;
  }

  // Preview Modal
  isPreviewModalOpen = false;
  isPreviewLoading = false;
  pdfBlobUrl: SafeResourceUrl | null = null;
  rawPdfBlob: Blob | null = null;
  tempPdfBlob: Blob | null = null;

  // WhatsApp bill state
  waModalOpen = false;
  waStatus: WhatsAppStatus = { state: 'idle', qr: null };
  waInitLoading = false;
  sendingBill = false;
  pendingBillBooking: Booking | null = null;
  billResendModalOpen = false;
  private waSseSub: Subscription | null = null;

  get waQrSafeUrl(): SafeUrl | null {
    const qr = this.waStatus.qr;
    if (!qr) return null;
    return this.sanitizer.bypassSecurityTrustUrl(qr);
  }

  // ── Inline Editing State ──
  isEditing = false;
  submitted = false;

  bookingDate: Date | null = null;
  returnDate: Date | null = null;
  pickupTime: 'Morning' | 'Evening' = 'Morning';
  returnTime: 'Morning' | 'Evening' = 'Morning';
  readonly today = new Date();

  selectedItems: SelectedItem[] = [];
  get productSelected(): boolean {
    return this.selectedItems.length > 0;
  }
  get datesSelected(): boolean {
    return !!(this.bookingDate && this.returnDate && this.returnDate >= this.bookingDate);
  }
  get conflictLoading(): boolean {
    return this.selectedItems.some((i) => i.conflictLoading);
  }
  get hasConflict(): boolean {
    return this.selectedItems.some((i) => i.hasConflict);
  }

  searchQuery = '';
  filteredProducts: Product[] = [];
  dropdownVisible = false;
  searchLoading = false;
  private searchSubject = new Subject<string>();
  private searchSub: Subscription | null = null;

  form = {
    customerName: '',
    mobileNumber: '',
    villageCity: '',
    advancePayment: null as number | null,
    remainingPayment: null as number | null,
    note: '',
    status: 'booked' as BookingStatus,
  };

  selectedCustomer: Customer | null = null;
  customerSuggestions: Customer[] = [];
  customerDropdownVisible = false;
  customerSearchLoading = false;
  private customerSearchSubject = new Subject<string>();
  private customerSearchSub: Subscription | null = null;

  get subtotal(): number {
    return this.selectedItems.reduce((acc, item) => {
      let itemTotal = item.rentPrice * item.quantity;
      if (item.freshPiece && item.freshPieceCost) {
        itemTotal += item.freshPieceCost;
      }
      return acc + itemTotal;
    }, 0);
  }

  get grandTotal(): number {
    return this.subtotal;
  }

  calculateRemainingPayment(): void {
    const total = this.grandTotal;
    const advance = this.form.advancePayment || 0;
    this.form.remainingPayment = Math.max(0, total - advance);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private productService: ProductService,
    private customerService: CustomerService,
    private toastService: ToastService,
    private whatsappService: WhatsappService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnDestroy(): void {
    this.waSseSub?.unsubscribe();
    this.searchSub?.unsubscribe();
    this.customerSearchSub?.unsubscribe();
  }

  ngOnInit(): void {
    this.initSearchPipelines();
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/bookings']);
      return;
    }
    this.bookingService.findById(id).subscribe({
      next: (b) => {
        this.booking = b;
        this.loading = false;
        this.editStatus = b.status;

        const itemsToFetch =
          b.items && b.items.length > 0
            ? b.items
            : b.productSerialNumber
              ? [{ serialNumber: b.productSerialNumber, quantity: 1, beltType: b.beltType, freshPiece: b.freshPiece, freshPieceCost: b.freshPieceCost }]
              : [];

        if (itemsToFetch.length > 0) {
          const observables = itemsToFetch.map((item) =>
            this.productService.search(item.serialNumber, 1).pipe(
              map((products) => ({
                product: products[0] || null,
                quantity: item.quantity,
                beltType: item.beltType || b.beltType,
                freshPiece: item.freshPiece || b.freshPiece,
                freshPieceCost: item.freshPieceCost || b.freshPieceCost,
                rentPrice: item.rentPrice,
              })),
              catchError(() => of({ product: null, quantity: item.quantity })),
            ),
          );

          forkJoin(observables).subscribe({
            next: (results) => {
              this.products = results.filter((r) => r.product !== null) as {
                product: Product;
                quantity: number;
                beltType?: string;
                freshPiece?: boolean;
                freshPieceCost?: number;
                rentPrice?: number;
              }[];
            },
          });
        }
      },
      error: () => {
        this.errorMessage = 'Booking not found.';
        this.loading = false;
      },
    });
  }


  // ── Search Pipelines ──
  private initSearchPipelines(): void {
    this.searchSub = this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          if (!q) {
            this.filteredProducts = [];
            this.dropdownVisible = false;
            this.searchLoading = false;
            return of([]);
          }
          this.searchLoading = true;
          return this.productService.search(q);
        })
      )
      .subscribe({
        next: (products) => {
          this.searchLoading = false;
          this.filteredProducts = products;
          this.dropdownVisible = products.length > 0;
        },
        error: () => {
          this.searchLoading = false;
        },
      });

    this.customerSearchSub = this.customerSearchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          if (!q) {
            this.customerSuggestions = [];
            this.customerDropdownVisible = false;
            this.customerSearchLoading = false;
            return of({ data: [] });
          }
          this.customerSearchLoading = true;
          return this.customerService.search(q);
        })
      )
      .subscribe({
        next: (response: any) => {
          this.customerSearchLoading = false;
          this.customerSuggestions = response.data || [];
          this.customerDropdownVisible = (response.data || []).length > 0;
        },
        error: () => {
          this.customerSearchLoading = false;
        },
      });
  }

  // ── Inline Edit Mode ──
  enterEditMode(): void {
    if (!this.booking) return;
    this.isEditing = true;
    this.submitted = false;
    
    this.bookingDate = new Date(this.booking.bookingDate);
    this.returnDate = new Date(this.booking.returnDate);
    this.pickupTime = this.booking.pickupTime || "Morning";
    this.returnTime = this.booking.returnTime || "Morning";
    
    this.form.customerName = this.booking.customer?.name || "";
    this.form.mobileNumber = this.booking.customer?.mobileNumber || "";
    this.form.villageCity = this.booking.customer?.village || "";
    this.form.advancePayment = this.booking.advancePayment || 0;
    this.form.remainingPayment = this.booking.remainingPayment || 0;
    this.form.note = this.booking.note || "";
    this.form.status = this.booking.status;

    if (this.booking.customer) {
      this.selectedCustomer = this.booking.customer;
    }

    this.selectedItems = this.products.map(p => ({
      product: p.product,
      quantity: p.quantity,
      conflictLoading: false,
      hasConflict: false,
      conflictBookings: [],
      beltType: p.beltType as any || null,
      freshPiece: p.freshPiece || false,
      freshPieceCost: p.freshPieceCost || null,
      rentPrice: (p as any).rentPrice || p.product.rentPrice || 0,
    }));
  }

  cancelEdit(): void {
    this.isEditing = false;
  }

  onDateChange(): void {
    if (this.datesSelected) {
      this.selectedItems.forEach((item) => this.checkConflict(item));
    }
  }

  onSearchInput(): void {
    const q = this.searchQuery.trim();
    if (!q) {
      this.filteredProducts = [];
      this.dropdownVisible = false;
      this.searchLoading = false;
    }
    this.searchSubject.next(q);
  }

  selectProduct(product: Product): void {
    const existing = this.selectedItems.find(
      (i) => i.product.serialNumber === product.serialNumber,
    );
    if (existing) {
      existing.quantity += 1;
    } else {
      const newItem: SelectedItem = {
        product,
        quantity: 1,
        conflictLoading: false,
        hasConflict: false,
        conflictBookings: [],
        beltType: null,
        freshPiece: false,
        freshPieceCost: null,
        rentPrice: product.rentPrice || 0,
      };
      this.selectedItems.push(newItem);
      this.checkConflict(newItem);
    }
    this.dropdownVisible = false;
    this.searchQuery = "";
    this.calculateRemainingPayment();
  }

  incrementQuantity(item: SelectedItem): void {
    item.quantity += 1;
    this.calculateRemainingPayment();
  }

  decrementQuantity(item: SelectedItem): void {
    if (item.quantity > 1) {
      item.quantity -= 1;
      this.calculateRemainingPayment();
    }
  }

  removeItem(item: SelectedItem): void {
    this.selectedItems = this.selectedItems.filter(
      (i) => i.product.serialNumber !== item.product.serialNumber,
    );
    this.calculateRemainingPayment();
  }

  clearAllProducts(): void {
    this.selectedItems = [];
    this.searchQuery = "";
    this.filteredProducts = [];
    this.calculateRemainingPayment();
  }

  private toISTDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}T00:00:00.000Z`;
  }

  private checkConflict(item: SelectedItem): void {
    if (!this.datesSelected) return;

    item.conflictLoading = true;
    item.hasConflict = false;
    item.conflictBookings = [];

    this.bookingService
      .search({
        serialNumber: item.product.serialNumber,
        fromDate: this.toISTDate(this.bookingDate!),
        toDate: this.toISTDate(this.returnDate!),
        overlap: "true",
      })
      .subscribe({
        next: (res) => {
          const actualConflicts = res.data.filter(b => b._id !== this.booking?._id);
          item.conflictBookings = actualConflicts;
          item.hasConflict = actualConflicts.length > 0;
          item.conflictLoading = false;
        },
        error: () => {
          item.conflictLoading = false;
        },
      });
  }

  get canConfirm(): boolean {
    if (this.conflictLoading) return false;
    // For edit we don"t have a strict confirmed boolean unless we want to, let"s just return true if no conflict or confirmed is checked
    // Wait, the template uses `confirmed`, we need to add `confirmed = false;` to the class, and check it here.
    return this.hasConflict ? this.confirmed : true;
  }
  confirmed = false;

  // ── Customer search ──
  onCustomerNameInput(): void {
    if (
      this.selectedCustomer &&
      this.form.customerName !== this.selectedCustomer.name
    ) {
      this.selectedCustomer = null;
    }
    const q = this.form.customerName.trim();
    if (!q) {
      this.customerSuggestions = [];
      this.customerDropdownVisible = false;
      this.customerSearchLoading = false;
    }
    this.customerSearchSubject.next(q);
  }

  selectCustomer(customer: Customer): void {
    this.selectedCustomer = customer;
    this.form.customerName = customer.name;
    this.form.mobileNumber = customer.mobileNumber;
    this.form.villageCity = customer.village;
    this.customerDropdownVisible = false;
    this.customerSuggestions = [];
  }

  clearCustomerSelection(): void {
    this.selectedCustomer = null;
    this.form.customerName = "";
    this.form.mobileNumber = "";
    this.form.villageCity = "";
  }

  closeCustomerDropdown(): void {
    this.customerDropdownVisible = false;
  }

  goBack(): void {
    this.router.navigate(['/bookings']);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  statusLabel(status: BookingStatus): string {
    switch (status) {
      case 'booked':
        return 'Pending Pickup';
      case 'rented':
        return 'Rented';
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

  statusClass(status: BookingStatus): string {
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

  onFullPaymentToggle(): void {
    if (this.fullPaymentReceived && this.booking) {
      this.editPaymentAmount = this.booking.remainingPayment || 0;
    } else {
      this.editPaymentAmount = null;
    }
  }

  get totalPayment(): number {
    if (!this.booking) return 0;
    if (
      this.booking.totalPayment !== undefined &&
      this.booking.totalPayment !== null
    ) {
      return this.booking.totalPayment;
    }
    let total = 0;
    this.products.forEach((p) => {
      total += (p.product.rentPrice || 0) * p.quantity;
      if (p.freshPiece && p.freshPieceCost) {
        total += p.freshPieceCost;
      }
    });
    return total;
  }

  discardChanges(): void {
    if (this.booking) {
      this.editStatus = this.booking.status;
      this.editPaymentAmount = null;
      this.fullPaymentReceived = false;
    }
  }

  saveChanges(): void {
    if (!this.booking || !this.isEditing) return;

    this.submitted = true;
    if (
      this.selectedItems.length === 0 ||
      !this.bookingDate ||
      !this.returnDate ||
      !this.form.mobileNumber ||
      this.form.mobileNumber.toString().length !== 10 ||
      !this.form.villageCity
    ) {
      this.toastService.show('error', 'Validation Failed', 'Please fill all required fields correctly.');
      return;
    }

    this.isSaving = true;

    const itemsPayload = this.selectedItems.map((item) => ({
      serialNumber: item.product.serialNumber,
      product: item.product._id,
      quantity: item.quantity,
      beltType: item.beltType || undefined,
      freshPiece: item.freshPiece,
      freshPieceCost: item.freshPieceCost || undefined,
      rentPrice: item.rentPrice,
    }));

    const updateBooking = (customerId: string) => {
      const payload: any = {
        items: itemsPayload,
        customer: customerId,
        advancePayment: this.form.advancePayment ?? 0,
        remainingPayment: this.form.remainingPayment ?? 0,
        totalPayment: this.grandTotal,
        bookingDate: this.toISTDate(this.bookingDate!),
        pickupTime: this.pickupTime,
        returnDate: this.toISTDate(this.returnDate!),
        returnTime: this.returnTime,
        note: this.form.note || undefined,
        status: this.form.status,
      };

      this.bookingService.update(this.booking!._id, payload).subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.booking = updated;
          this.toastService.show('success', 'Changes Saved', 'Booking details updated successfully.');
          this.isEditing = false;
          this.ngOnInit(); // Reload full detail
        },
        error: (err) => {
          this.isSaving = false;
          const msg = err?.error?.message || 'Failed to update booking.';
          this.toastService.show('error', 'Update Failed', msg);
        },
      });
    };

    if (this.selectedCustomer && this.selectedCustomer._id) {
      updateBooking(this.selectedCustomer._id);
    } else {
      this.customerService.search(this.form.mobileNumber.toString(), 1, 50).subscribe({
        next: (res) => {
          const exactMatch = res.data.find(
            (c) =>
              c.name.trim().toLowerCase() === this.form.customerName.trim().toLowerCase() &&
              c.mobileNumber === this.form.mobileNumber.toString() &&
              c.village.trim().toLowerCase() === this.form.villageCity.trim().toLowerCase(),
          );

          if (exactMatch) {
            updateBooking(exactMatch._id);
          } else {
            const customerId = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
            this.customerService
              .create({
                customerId,
                name: this.form.customerName || 'Unknown',
                mobileNumber: this.form.mobileNumber.toString(),
                village: this.form.villageCity,
              })
              .subscribe({
                next: (newCust) => updateBooking(newCust._id),
                error: (err) => {
                  this.isSaving = false;
                  this.toastService.show('error', 'Customer Creation Failed', err?.error?.message || 'Could not create customer.');
                },
              });
          }
        },
        error: () => {
          this.isSaving = false;
          this.toastService.show('error', 'Customer Check Failed', 'Could not verify customer existence.');
        },
      });
    }
  }

  isDownloading = false;

  generateBill(): void {
    if (!this.booking) return;
    this.isPreviewModalOpen = true;
    this.isPreviewLoading = true;
    this.pdfBlobUrl = null;
    this.rawPdfBlob = null;

    this.bookingService.downloadInvoice(this.booking._id).subscribe({
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
  }

  downloadFromPreview(): void {
    if (!this.rawPdfBlob || !this.booking) return;
    const url = window.URL.createObjectURL(this.rawPdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${this.booking.orderId?.split('-')[1]}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.toastService.show(
      'success',
      'Download Complete',
      'Invoice downloaded successfully.',
    );
    this.closePreview();
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

  sendBill(): void {
    if (!this.booking) return;

    if (this.rawPdfBlob) {
      this.tempPdfBlob = this.rawPdfBlob;
    }

    this.closePreview();

    if (this.booking.isBillSend) {
      this.pendingBillBooking = this.booking;
      this.billResendModalOpen = true;
      return;
    }

    this.initiateSendBillFlow(this.booking);
  }

  confirmResend(): void {
    this.billResendModalOpen = false;
    if (this.pendingBillBooking) {
      this.initiateSendBillFlow(this.pendingBillBooking);
    }
  }

  cancelResend(): void {
    this.billResendModalOpen = false;
    this.pendingBillBooking = null;
  }

  private initiateSendBillFlow(booking: Booking): void {
    this.pendingBillBooking = booking;

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
    this.waStatus = { state: 'idle', qr: null };
  }

  private doSendBill(booking: Booking): void {
    const phone = (booking.customer?.mobileNumber || '').replace(/\D/g, '');
    const message = this.buildBillMessage();

    this.sendingBill = true;

    const blobToSend = this.tempPdfBlob;
    this.tempPdfBlob = null; // Clear it

    const requests = [];

    if (blobToSend) {
      const pdfPromise = this.blobToBase64(blobToSend).then((base64) => {
        return this.whatsappService
          .sendPdf({
            mobileNumber: phone,
            message,
            fileBase64: base64,
            filename: `Invoice-${booking.orderId?.split('-')[1]}.pdf`,
            mimetype: 'application/pdf',
          })
          .toPromise();
      });
      requests.push(from(pdfPromise));
    } else {
      requests.push(
        this.whatsappService.sendMessage({ mobileNumber: phone, message }),
      );
    }

    // Append requests for each product image
    this.products.forEach((p) => {
      if (p.product.imageUrl) {
        const beltStr =
          p.beltType === 'BF' ? 'BF' : p.beltType === 'HF' ? 'HF' : 'No Belt';
        const freshStr = p.freshPiece ? 'Yes' : 'No';

        requests.push(
          this.whatsappService.sendMessage({
            mobileNumber: phone,
            message: `${p.product.name}\nQty: ${p.quantity} | Belt: ${beltStr} | Fresh: ${freshStr}`,
            imageUrl: p.product.imageUrl,
          }),
        );
      }
    });

    forkJoin(requests).subscribe({
      next: () => this.handleSendSuccess(booking),
      error: () => this.handleSendError(),
    });
  }

  private handleSendSuccess(booking: Booking): void {
    this.sendingBill = false;
    this.bookingService.markBillSent(booking._id).subscribe({
      next: (updated) => {
        if (this.booking) {
          this.booking.isBillSend = updated.isBillSend;
        }
      },
      error: (e) => console.error('markBillSent failed', e),
    });
    this.pendingBillBooking = null;
    this.toastService.show(
      'success',
      'Bill Sent',
      'The bill was successfully sent via WhatsApp.',
    );
  }

  private handleSendError(): void {
    this.sendingBill = false;
    this.toastService.show(
      'error',
      'Send Failed',
      'Failed to send WhatsApp message. Ensure the number is correct.',
    );
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

  private buildBillMessage(): string {
    if (!this.booking) return '';

    let message = `*Order Summary*\n`;
    message += `Customer: ${this.booking.customer?.name || 'Unknown'}\n`;
    message += `Booking Date: ${this.formatDate(this.booking.bookingDate)}\n`;
    message += `Return Date: ${this.formatDate(this.booking.returnDate)}\n\n`;

    message += `*Products*\n`;
    this.products.forEach((p) => {
      message += `- ${p.product.name} (Qty: ${p.quantity})\n`;
    });

    message += `\n*Payment Details*\n`;
    message += `Advance Paid: ₹${this.booking.advancePayment || 0}\n`;
    message += `Remaining: ₹${this.booking.remainingPayment || 0}\n`;

    return message;
  }
}
