import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Booking,
  BookingService,
  BookingStatus,
} from '../../core/booking.service';
import { forkJoin, of, from } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeUrl, SafeResourceUrl } from '@angular/platform-browser';
import { Product, ProductService } from '../../core/product.service';
import { WhatsappService, WhatsAppStatus } from '../../core/whatsapp.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [DecimalPipe, FormsModule, RouterLink],
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
  }[] = [];
  loading = true;
  errorMessage = '';

  editStatus: BookingStatus | null = null;
  editPaymentAmount: number | null = null;
  fullPaymentReceived: boolean = false;
  isSaving: boolean = false;

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private productService: ProductService,
    private toastService: ToastService,
    private whatsappService: WhatsappService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnDestroy(): void {
    this.waSseSub?.unsubscribe();
  }

  ngOnInit(): void {
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
              ? [{ serialNumber: b.productSerialNumber, quantity: 1 }]
              : [];

        if (itemsToFetch.length > 0) {
          const observables = itemsToFetch.map((item) =>
            this.productService.search(item.serialNumber, 1).pipe(
              map((products) => ({
                product: products[0] || null,
                quantity: item.quantity,
                beltType: item.beltType,
                freshPiece: item.freshPiece,
                freshPieceCost: item.freshPieceCost,
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

  statusClass(status: BookingStatus): string {
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

  onFullPaymentToggle(): void {
    if (this.fullPaymentReceived && this.booking) {
      this.editPaymentAmount = this.booking.remainingPayment || 0;
    } else {
      this.editPaymentAmount = null;
    }
  }

  discardChanges(): void {
    if (this.booking) {
      this.editStatus = this.booking.status;
      this.editPaymentAmount = null;
      this.fullPaymentReceived = false;
    }
  }

  saveChanges(): void {
    if (!this.booking) return;

    const payload: any = {};
    let hasChanges = false;

    if (this.editStatus !== this.booking.status && this.editStatus) {
      payload.status = this.editStatus;
      hasChanges = true;
    }

    if (this.editPaymentAmount && this.editPaymentAmount > 0) {
      payload.advancePayment =
        (this.booking.advancePayment || 0) + this.editPaymentAmount;
      payload.remainingPayment = Math.max(
        0,
        (this.booking.remainingPayment || 0) - this.editPaymentAmount,
      );
      hasChanges = true;
    }

    if (!hasChanges) {
      this.router.navigate(['/bookings']);
      return;
    }

    this.isSaving = true;
    this.bookingService.update(this.booking._id, payload).subscribe({
      next: (updated) => {
        if (this.booking) {
          if (updated.status) this.booking.status = updated.status;
          this.booking.advancePayment = updated.advancePayment;
          this.booking.remainingPayment = updated.remainingPayment;
        }
        this.discardChanges();
        this.isSaving = false;
        this.router.navigate(['/bookings']);
      },
      error: () => {
        this.isSaving = false;
      },
    });
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
        this.pdfBlobUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url + '#navpanes=0&pagemode=none&zoom=80');
        this.isPreviewLoading = false;
      },
      error: () => {
        this.isPreviewLoading = false;
        this.toastService.show('error', 'Preview Failed', 'Failed to generate invoice preview.');
      }
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
    a.download = `Invoice-${this.booking._id.slice(-6).toUpperCase()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.toastService.show('success', 'Download Complete', 'Invoice downloaded successfully.');
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
        if (status.state === 'connected' && this.pendingBillBooking && this.waModalOpen) {
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
      const pdfPromise = this.blobToBase64(blobToSend).then(base64 => {
        return this.whatsappService.sendPdf({
          mobileNumber: phone,
          message,
          fileBase64: base64,
          filename: `Invoice-${booking._id.slice(-6).toUpperCase()}.pdf`,
          mimetype: 'application/pdf'
        }).toPromise();
      });
      requests.push(from(pdfPromise));
    } else {
      requests.push(this.whatsappService.sendMessage({ mobileNumber: phone, message }));
    }

    // Append requests for each product image
    this.products.forEach(p => {
      if (p.product.imageUrl) {
        const beltStr = p.beltType === 'BF' ? 'BF' : (p.beltType === 'HF' ? 'HF' : 'No Belt');
        const freshStr = p.freshPiece ? 'Yes' : 'No';
        
        requests.push(
          this.whatsappService.sendMessage({
            mobileNumber: phone,
            message: `${p.product.name}\nQty: ${p.quantity} | Belt: ${beltStr} | Fresh: ${freshStr}`,
            imageUrl: p.product.imageUrl
          })
        );
      }
    });

    forkJoin(requests).subscribe({
      next: () => this.handleSendSuccess(booking),
      error: () => this.handleSendError()
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
    this.toastService.show('success', 'Bill Sent', 'The bill was successfully sent via WhatsApp.');
  }

  private handleSendError(): void {
    this.sendingBill = false;
    this.toastService.show('error', 'Send Failed', 'Failed to send WhatsApp message. Ensure the number is correct.');
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
