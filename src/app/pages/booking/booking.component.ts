import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookingService, Booking } from '../../core/booking.service';
import { Product, ProductService } from '../../core/product.service';
import { Customer, CustomerService } from '../../core/customer.service';
import { ToastService } from '../../shared/toast/toast.service';
import { CommonModule } from '@angular/common';
import { DatepickerComponent } from '../../shared/datepicker/datepicker.component';
import { NumbersOnlyDirective } from '../../shared/directives/numbers-only.directive';

interface SelectedItem {
  product: Product;
  quantity: number;
  conflictLoading: boolean;
  hasConflict: boolean;
  conflictBookings: Booking[];
  beltType: 'HB' | 'FB' | null;
  freshPiece: boolean;
  freshPieceCost: number | null;
}

@Component({
  selector: 'app-booking',
  imports: [
    FormsModule,
    CommonModule,
    RouterLink,
    DatepickerComponent,
    NumbersOnlyDirective,
  ],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss',
})
export class BookingComponent implements OnInit {
  // Step 1 – dates
  bookingDate: Date | null = null;
  returnDate: Date | null = null;
  readonly today = new Date();

  get datesSelected(): boolean {
    return !!(
      this.bookingDate &&
      this.returnDate &&
      this.returnDate >= this.bookingDate
    );
  }

  // Step 2 – products
  selectedItems: SelectedItem[] = [];
  get productSelected(): boolean {
    return this.selectedItems.length > 0;
  }

  searchQuery = '';
  filteredProducts: Product[] = [];
  dropdownVisible = false;
  searchLoading = false;
  private searchSubject = new Subject<string>();

  get conflictLoading(): boolean {
    return this.selectedItems.some((i) => i.conflictLoading);
  }

  get hasConflict(): boolean {
    return this.selectedItems.some((i) => i.hasConflict);
  }

  // Customer / payment form
  form = {
    customerName: '',
    mobileNumber: '',
    villageCity: '',
    advancePayment: null as number | null,
    remainingPayment: null as number | null,
    note: '',
  };

  // Customer suggestion state
  selectedCustomer: Customer | null = null;
  customerSuggestions: Customer[] = [];
  customerDropdownVisible = false;
  customerSearchLoading = false;
  private customerSearchSubject = new Subject<string>();

  submitted = false;
  loading = false;
  confirmed = false;

  get subtotal(): number {
    return this.selectedItems.reduce((acc, item) => {
      let itemTotal = (item.product.rentPrice || 0) * item.quantity;
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
    private router: Router,
    private bookingService: BookingService,
    private productService: ProductService,
    private customerService: CustomerService,
    private toast: ToastService,
  ) {
    // Product search pipeline
    this.searchSubject
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
        }),
        takeUntilDestroyed(),
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

    // Customer search pipeline
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

  onDateChange(): void {
    if (this.datesSelected) {
      // Re-check conflicts for all selected items
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

  // ── Customer search ──────────────────────────────────────
  onCustomerNameInput(): void {
    // Clear selection if user modifies the name after selecting
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
    this.form.customerName = '';
    this.form.mobileNumber = '';
    this.form.villageCity = '';
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
      };
      this.selectedItems.push(newItem);
      this.checkConflict(newItem);
    }
    this.dropdownVisible = false;
    this.searchQuery = '';
    this.confirmed = false;
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
    if (this.selectedItems.length === 0) {
      this.confirmed = false;
    }
    this.calculateRemainingPayment();
  }

  clearAllProducts(): void {
    this.selectedItems = [];
    this.searchQuery = '';
    this.filteredProducts = [];
    this.confirmed = false;
    this.calculateRemainingPayment();
  }

  private toISTDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
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
        overlap: 'true',
      })
      .subscribe({
        next: (res) => {
          item.conflictBookings = res.data;
          item.hasConflict = res.data.length > 0;
          item.conflictLoading = false;
        },
        error: () => {
          item.conflictLoading = false;
        },
      });
  }

  get canConfirm(): boolean {
    if (this.conflictLoading) return false;
    return this.hasConflict ? this.confirmed : true;
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

  onSubmit(): void {
    this.submitted = true;
    if (
      this.selectedItems.length === 0 ||
      !this.bookingDate ||
      !this.returnDate ||
      !this.form.mobileNumber ||
      !this.form.villageCity
    ) {
      this.toast.show(
        'error',
        'Validation Failed',
        'Please fill all required fields.',
      );
      return;
    }
    this.loading = true;

    const itemsPayload = this.selectedItems.map((item) => ({
      serialNumber: item.product.serialNumber,
      product: item.product._id,
      quantity: item.quantity,
      beltType: item.beltType || undefined,
      freshPiece: item.freshPiece,
      freshPieceCost: item.freshPieceCost || undefined,
    }));

    const createBooking = (customerId: string) => {
      this.bookingService
        .create({
          items: itemsPayload,
          customer: customerId,
          advancePayment: this.form.advancePayment ?? undefined,
          remainingPayment: this.form.remainingPayment ?? undefined,
          bookingDate: this.toISTDate(this.bookingDate!),
          returnDate: this.toISTDate(this.returnDate!),
          note: this.form.note || undefined,
        })
        .subscribe({
          next: () => {
            this.loading = false;
            this.toast.show(
              'success',
              'Booking Created',
              'The booking was saved successfully.',
            );
            this.router.navigate(['/bookings']);
          },
          error: (err) => {
            this.loading = false;
            const message: string =
              err?.error?.message ??
              'Could not save booking. Please try again.';
            this.toast.show('error', 'Booking Failed', message);
          },
        });
    };

    // If a customer was selected from suggestions, use their _id directly
    if (this.selectedCustomer) {
      createBooking(this.selectedCustomer._id);
    } else {
      // Create a new customer first, then use the returned _id
      const customerId = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
      this.customerService
        .create({
          customerId,
          name: this.form.customerName || 'Unknown',
          mobileNumber: this.form.mobileNumber.toString(),
          village: this.form.villageCity,
        })
        .subscribe({
          next: (newCustomer) => {
            createBooking(newCustomer._id);
          },
          error: (err) => {
            this.loading = false;
            const message: string =
              err?.error?.message ??
              'Could not create customer. Please try again.';
            this.toast.show('error', 'Customer Creation Failed', message);
          },
        });
    }
  }

  goBack(): void {
    this.router.navigate(['/bookings']);
  }
}
