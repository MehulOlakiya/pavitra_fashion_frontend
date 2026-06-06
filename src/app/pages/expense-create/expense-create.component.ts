import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ExpenseService,
  ExpenseCategory,
  CreateExpensePayload,
  CreateExpenseItemPayload,
} from '../../core/expense.service';
import { PartyService, Party } from '../../core/party.service';
import { ProductService, Product } from '../../core/product.service';
import { ToastService } from '../../shared/toast/toast.service';

interface CartProduct {
  product: Product;
  quantity: number;
}

@Component({
  selector: 'app-expense-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './expense-create.component.html',
  styleUrl: './expense-create.component.scss',
})
export class ExpenseCreateComponent implements OnInit {
  private expenseService = inject(ExpenseService);
  private partyService = inject(PartyService);
  private productService = inject(ProductService);
  private toast = inject(ToastService);
  private router = inject(Router);

  // Parties
  parties: Party[] = [];
  partySearch = '';
  partyDropdownVisible = false;
  selectedPartyId = '';
  selectedPartyName = '';

  // Category
  selectedCategory: ExpenseCategory | '' = '';
  isCustomCategory = false;
  customCategory = '';

  // Product search
  productSearch = '';
  productSearchResults: Product[] = [];
  productSearchLoading = false;
  productPickerOpen = false;
  
  // Pagination
  productSearchPage = 1;
  productSearchHasMore = false;
  productSearchLoadingMore = false;

  // Cart (selected products)
  cartProducts: CartProduct[] = [];

  // Pricing
  perPiecePrice: number | null = null;

  // Remarks
  remarks = '';

  // Saving
  saving = false;

  // Party create inline
  newPartyName = '';
  creatingParty = false;
  addPartyOpen = false;

  readonly categoryOptions: { value: ExpenseCategory; label: string; icon: string }[] = [
    { value: 'washing', label: 'Washing', icon: 'local_laundry_service' },
    { value: 'stitching', label: 'Stitching', icon: 'content_cut' },
    { value: 'blouse_stitching', label: 'Blouse Stitching', icon: 'checkroom' },
  ];

  ngOnInit(): void {
    this.loadParties();
  }

  loadParties(): void {
    this.partyService.getAll(this.partySearch).subscribe({
      next: (res) => (this.parties = res.data),
    });
  }

  onPartySearch(): void {
    this.partyService.getAll(this.partySearch).subscribe({
      next: (res) => { this.parties = res.data; this.partyDropdownVisible = true; },
    });
  }

  selectParty(p: Party): void {
    this.selectedPartyId = p._id;
    this.selectedPartyName = p.name;
    this.partySearch = p.name;
    this.partyDropdownVisible = false;
  }

  clearParty(): void {
    this.selectedPartyId = '';
    this.selectedPartyName = '';
    this.partySearch = '';
  }

  createParty(): void {
    if (!this.newPartyName.trim()) return;
    this.creatingParty = true;
    this.partyService.create({ name: this.newPartyName.trim() }).subscribe({
      next: (p) => {
        this.toast.show('success', 'Party Created', `"${p.name}" has been added.`);
        this.selectParty(p);
        this.parties.unshift(p);
        this.addPartyOpen = false;
        this.newPartyName = '';
        this.creatingParty = false;
      },
      error: () => {
        this.toast.show('error', 'Error', 'Failed to create party.');
        this.creatingParty = false;
      },
    });
  }

  // ── Product Picker ────────────────────────────────────────────
  openProductPicker(): void {
    this.productPickerOpen = true;
    this.productSearch = '';
    this.searchProducts(true);
  }

  closeProductPicker(): void {
    this.productPickerOpen = false;
  }

  searchProducts(reset = true): void {
    if (reset) {
      this.productSearchPage = 1;
      this.productSearchLoading = true;
      this.productSearchResults = [];
    } else {
      this.productSearchLoadingMore = true;
    }

    this.productService.getPaginated({ 
      page: this.productSearchPage, 
      limit: 20, 
      search: this.productSearch || undefined 
    }).subscribe({
      next: (res) => {
        if (reset) {
          this.productSearchResults = res.data;
        } else {
          this.productSearchResults = [...this.productSearchResults, ...res.data];
        }
        this.productSearchHasMore = this.productSearchPage < res.totalPages;
        this.productSearchLoading = false;
        this.productSearchLoadingMore = false;
      },
      error: () => { 
        this.productSearchLoading = false; 
        this.productSearchLoadingMore = false;
      },
    });
  }

  onProductScroll(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
      if (this.productSearchHasMore && !this.productSearchLoading && !this.productSearchLoadingMore) {
        this.productSearchPage++;
        this.searchProducts(false);
      }
    }
  }

  isInCart(product: Product): boolean {
    return this.cartProducts.some((cp) => cp.product._id === product._id);
  }

  toggleProduct(product: Product): void {
    const idx = this.cartProducts.findIndex((cp) => cp.product._id === product._id);
    if (idx >= 0) {
      this.cartProducts.splice(idx, 1);
    } else {
      this.cartProducts.push({ product, quantity: 1 });
    }
  }

  removeFromCart(productId: string): void {
    this.cartProducts = this.cartProducts.filter((cp) => cp.product._id !== productId);
  }

  get totalQuantity(): number {
    return this.cartProducts.reduce((s, cp) => s + (cp.quantity || 0), 0);
  }

  get totalPrice(): number {
    return this.totalQuantity * (this.perPiecePrice || 0);
  }

  // ── Save ──────────────────────────────────────────────────────
  submit(): void {
    if (!this.selectedPartyId) {
      this.toast.show('error', 'Validation', 'Please select a party.'); return;
    }
    if (!this.selectedCategory && !this.isCustomCategory) {
      this.toast.show('error', 'Validation', 'Please select a category.'); return;
    }
    if (this.isCustomCategory && !this.customCategory.trim()) {
      this.toast.show('error', 'Validation', 'Please enter a custom category name.'); return;
    }
    if (this.cartProducts.length === 0) {
      this.toast.show('error', 'Validation', 'Please select at least one product.'); return;
    }
    if (!this.perPiecePrice || this.perPiecePrice <= 0) {
      this.toast.show('error', 'Validation', 'Please enter per piece price.'); return;
    }

    this.saving = true;
    const payload: CreateExpensePayload = {
      party: this.selectedPartyId,
      category: this.isCustomCategory ? this.customCategory.trim() : (this.selectedCategory as ExpenseCategory),
      items: this.cartProducts.map((cp) => ({
        product: cp.product._id,
        quantity: cp.quantity,
      })),
      perPiecePrice: this.perPiecePrice,
      remarks: this.remarks || undefined,
    };

    this.expenseService.create(payload).subscribe({
      next: (res) => {
        this.toast.show('success', 'Expense Created', `${res.expenseNo} created successfully.`);
        this.saving = false;
        this.router.navigate(['/expenses', res._id]);
      },
      error: () => {
        this.toast.show('error', 'Error', 'Failed to create expense.');
        this.saving = false;
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/expenses']);
  }
}
