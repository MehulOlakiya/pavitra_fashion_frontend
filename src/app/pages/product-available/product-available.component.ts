import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  ProductService,
  Product,
  ApiBooking,
} from '../../core/product.service';
import { CustomerService, Customer } from '../../core/customer.service';
import { ToastService } from '../../shared/toast/toast.service';
import { DatepickerComponent } from '../../shared/datepicker/datepicker.component';
import { CustomSelectComponent } from '../../shared/custom-select/custom-select.component';
import { NumbersOnlyDirective } from '../../shared/directives/numbers-only.directive';
import { BookingService, Booking } from '../../core/booking.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';

interface CartItem {
  product: Product;
  quantity: number;
  deliveryDate: Date;
  returnDate: Date;
  deliveryTime: string;
  returnTime: string;
}

@Component({
  selector: 'app-product-available',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatepickerComponent,
    CustomSelectComponent,
    NumbersOnlyDirective,
    PaginationComponent,
  ],
  templateUrl: './product-available.component.html',
  styleUrl: './product-available.component.scss',
})
export class ProductAvailableComponent implements OnInit {
  activeTab: 'check' | 'cart' = 'check';

  // Form Fields
  code: string = '';
  quantity: number = 1;
  deliveryDate: Date | null = new Date();
  returnDate: Date | null = new Date();

  customerName: string = '';
  deliveryTime: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | null =
    'Morning';
  returnTime: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | null = 'Morning';

  timeOptions = [
    { value: 'Morning', label: 'Morning' },
    { value: 'Afternoon', label: 'Afternoon' },
    { value: 'Evening', label: 'Evening' },
    { value: 'Night', label: 'Night' },
  ];

  // Search State
  selectedProduct: Product | null = null;
  productFutureBookings: ApiBooking[] = [];
  productDetailsVisible: boolean = false;
  isAvailable: boolean | null = null;
  activeExpense: any | null = null;
  checkLoading: boolean = false;

  // Customer Search
  selectedCustomer: Customer | null = null;
  customerSuggestions: Customer[] = [];
  customerDropdownVisible = false;
  customerSearchLoading = false;

  // Add Customer Modal
  isAddingCustomer = false;
  savingCustomer = false;
  newCustomerForm = {
    name: '',
    mobileNumber: '',
    village: ''
  };

  // Booking History State
  historyModalOpen = false;
  historyLoading = false;
  historyBookings: Booking[] = [];
  historySearchCode: string = '';
  historyCurrentPage = 1;
  historyTotalPages = 1;
  historyTotal = 0;
  historyLimit = 10;

  private customerSearchSubject = new Subject<string>();

  // Cart
  cartList: CartItem[] = [];

  constructor(
    private productService: ProductService,
    private bookingService: BookingService,
    private customerService: CustomerService,
    private toast: ToastService,
    private router: Router,
  ) {
    this.customerSearchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          if (!q) {
            this.customerSuggestions = [];
            this.customerDropdownVisible = false;
            this.customerSearchLoading = false;
            return of({
              data: [],
              total: 0,
              page: 1,
              limit: 10,
              totalPages: 1,
            });
          }
          this.customerSearchLoading = true;
          return this.customerService.search(q);
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (response) => {
          this.customerSearchLoading = false;
          this.customerSuggestions = response.data;
          this.customerDropdownVisible = response.data.length > 0;
        },
        error: () => {
          this.customerSearchLoading = false;
        },
      });
  }

  ngOnInit(): void {}

  setTab(tab: 'check' | 'cart'): void {
    this.activeTab = tab;
  }

  checkAvailability(): void {
    if (!this.code) {
      this.toast.show('error', 'Missing Code', 'Please enter a product code.');
      return;
    }
    if (!this.deliveryDate || !this.returnDate) {
      this.toast.show(
        'error',
        'Missing Dates',
        'Please select delivery and return dates.',
      );
      return;
    }

    if (this.returnDate < this.deliveryDate) {
      this.toast.show(
        'error',
        'Invalid Dates',
        'Return date must be after delivery date.',
      );
      return;
    }

    this.checkLoading = true;
    this.productDetailsVisible = true;
    this.isAvailable = null;
    this.selectedProduct = null;
    this.productFutureBookings = [];

    this.productService.getInventoryDetail(this.code).subscribe({
      next: (res) => {
        this.checkLoading = false;
        if (!res.product) {
          this.toast.show(
            'error',
            'Not Found',
            `Product with code ${this.code} not found.`,
          );
          this.productDetailsVisible = false;
          return;
        }

        this.selectedProduct = res.product;
        this.productFutureBookings = res.futureBookings || [];
        this.activeExpense = res.activeExpense || null;

        if (this.activeExpense) {
          // If it's currently at an expense (washing/stitching), it's completely unavailable
          this.isAvailable = false;
        } else {
          // Check if there are overlapping bookings
          const dStart = new Date(this.toISTDate(this.deliveryDate!));
          const dEnd = new Date(this.toISTDate(this.returnDate!));

          const hasConflict = this.productFutureBookings.some((booking) => {
            if (booking.status === 'cancelled' || booking.status === 'returned')
              return false;
            const bStart = new Date(booking.bookingDate);
            const bEnd = new Date(booking.returnDate);
            return dStart <= bEnd && dEnd >= bStart;
          });

          this.isAvailable = !hasConflict;
        }
      },
      error: () => {
        this.checkLoading = false;
        this.toast.show(
          'error',
          'Search Failed',
          'Could not retrieve product details.',
        );
      },
    });
  }

  private toISTDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}T00:00:00.000Z`;
  }

  formatDate(d: Date | string | null): string {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  toggleProductDetails(): void {
    this.productDetailsVisible = !this.productDetailsVisible;
  }

  // Customer Search
  onCustomerNameInput(): void {
    if (
      this.selectedCustomer &&
      this.customerName !== this.selectedCustomer.name
    ) {
      this.selectedCustomer = null;
    }
    const q = this.customerName.trim();
    if (!q) {
      this.customerSuggestions = [];
      this.customerDropdownVisible = false;
      this.customerSearchLoading = false;
    }
    this.customerSearchSubject.next(q);
  }

  selectCustomer(customer: Customer): void {
    this.selectedCustomer = customer;
    this.customerName = customer.name;
    this.customerDropdownVisible = false;
    this.customerSuggestions = [];
  }

  closeCustomerDropdown(): void {
    this.customerDropdownVisible = false;
  }

  clearCustomerSelection(): void {
    this.selectedCustomer = null;
    this.customerName = '';
  }

  // Add Customer Modal Logic
  openAddCustomer(): void {
    this.isAddingCustomer = true;
    this.newCustomerForm = { name: '', mobileNumber: '', village: '' };
  }

  closeAddCustomer(): void {
    this.isAddingCustomer = false;
  }

  saveCustomer(): void {
    if (!this.newCustomerForm.name || !this.newCustomerForm.mobileNumber) {
      this.toast.show('error', 'Validation Error', 'Name and Mobile Number are required.');
      return;
    }

    this.savingCustomer = true;
    this.customerService.create(this.newCustomerForm as any).subscribe({
      next: (res) => {
        this.savingCustomer = false;
        this.toast.show('success', 'Customer Created', 'New customer added successfully.');
        this.isAddingCustomer = false;
        
        // Auto-select the newly created customer
        this.selectedCustomer = res;
        this.customerName = res.name;
        this.customerDropdownVisible = false;
      },
      error: () => {
        this.savingCustomer = false;
        this.toast.show('error', 'Error', 'Failed to create customer.');
      }
    });
  }

  addToCart(): void {
    if (!this.selectedProduct) {
      this.toast.show(
        'error',
        'No Product',
        'Please check availability of a product first.',
      );
      return;
    }
    if (!this.isAvailable) {
      this.toast.show(
        'error',
        'Not Available',
        'The selected product is not available for these dates.',
      );
      return;
    }
    if (
      !this.deliveryDate ||
      !this.returnDate ||
      !this.deliveryTime ||
      !this.returnTime
    ) {
      this.toast.show(
        'error',
        'Missing Info',
        'Please ensure dates and times are selected.',
      );
      return;
    }

    const newItem: CartItem = {
      product: this.selectedProduct,
      quantity: this.quantity,
      deliveryDate: this.deliveryDate,
      returnDate: this.returnDate,
      deliveryTime: this.deliveryTime,
      returnTime: this.returnTime,
    };

    this.cartList.push(newItem);
    this.toast.show(
      'success',
      'Added to Cart',
      `${this.selectedProduct.name} added to cart.`,
    );

    // Reset form
    this.code = '';
    this.selectedProduct = null;
    this.isAvailable = null;
    this.productDetailsVisible = false;
  }

  removeFromCart(index: number): void {
    this.cartList.splice(index, 1);
  }

  quickBill(): void {
    if (!this.selectedCustomer) {
      this.toast.show(
        'error',
        'Missing Customer',
        'Please select a customer for quick booking.',
      );
      return;
    }

    let itemsToPass = [...this.cartList];

    if (
      this.selectedProduct &&
      this.isAvailable &&
      this.deliveryDate &&
      this.returnDate
    ) {
      const alreadyInCart = itemsToPass.some(
        (item) => item.product._id === this.selectedProduct!._id,
      );
      if (!alreadyInCart) {
        itemsToPass.push({
          product: this.selectedProduct,
          quantity: this.quantity,
          deliveryDate: this.deliveryDate,
          returnDate: this.returnDate,
          deliveryTime: this.deliveryTime || 'Morning',
          returnTime: this.returnTime || 'Morning',
        });
      }
    }

    this.router.navigate(['/bookings/new'], {
      state: {
        customer: this.selectedCustomer,
        items: itemsToPass,
        // searchQuery: this.code,
        dates: {
          deliveryDate: this.deliveryDate,
          returnDate: this.returnDate,
          deliveryTime: this.deliveryTime,
          returnTime: this.returnTime,
        },
      },
    });
  }

  openProductHistory(): void {
    if (!this.code) {
      this.toast.show(
        'error',
        'Missing SN Number',
        'Please enter a SN Number first.',
      );
      return;
    }

    this.activeTab = 'cart'; // Switch to Booking History Tab
    this.historySearchCode = this.code;
    this.fetchHistory(this.code.trim());
  }

  searchHistoryByCode(): void {
    if (!this.historySearchCode) {
      this.toast.show(
        'error',
        'Missing SN Number',
        'Please enter a SN Number to search.',
      );
      return;
    }
    this.historyCurrentPage = 1;
    this.fetchHistory(this.historySearchCode.trim());
  }

  goToHistoryPage(page: number): void {
    if (page === this.historyCurrentPage) return;
    this.historyCurrentPage = page;
    if (this.historySearchCode) {
      this.fetchHistory(this.historySearchCode.trim());
    }
  }

  private fetchHistory(serialNumber: string): void {
    this.historyLoading = true;
    this.historyBookings = [];

    this.bookingService
      .search({
        serialNumber,
        page: this.historyCurrentPage,
        limit: this.historyLimit,
      })
      .subscribe({
        next: (res) => {
          this.historyBookings = res.data;
          this.historyTotal = res.total;
          this.historyTotalPages = res.totalPages;
          this.historyCurrentPage = res.page;
          this.historyLoading = false;
        },
        error: () => {
          this.toast.show(
            'error',
            'Load Failed',
            'Could not load booking history.',
          );
          this.historyLoading = false;
        },
      });
  }

  // --- Table Helpers ---
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
      // For history table, we just use the rentPrice saved in the booking item if available,
      // otherwise it might be 0 unless we fetch the product, but usually it's in the item.
      const rent = i.rentPrice || 0;
      total += rent * i.quantity;
      if (i.freshPiece && i.freshPieceCost) {
        total += i.freshPieceCost;
      }
    });
    return total;
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
}
