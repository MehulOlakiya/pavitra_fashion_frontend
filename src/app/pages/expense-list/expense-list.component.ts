import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ExpenseService,
  Expense,
  ExpenseCategory,
  SearchExpenseParams,
} from '../../core/expense.service';
import { PartyService, Party } from '../../core/party.service';
import { ToastService } from '../../shared/toast/toast.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { DateRangePickerComponent } from '../../shared/date-range-picker/date-range-picker.component';
import { CustomSelectComponent } from '../../shared/custom-select/custom-select.component';

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent, DateRangePickerComponent, CustomSelectComponent],
  templateUrl: './expense-list.component.html',
  styleUrl: './expense-list.component.scss',
})
export class ExpenseListComponent implements OnInit {
  private expenseService = inject(ExpenseService);
  private partyService = inject(PartyService);
  private toast = inject(ToastService);
  private router = inject(Router);

  expenses: Expense[] = [];
  parties: Party[] = [];
  loading = false;
  deletingId: string | null = null;

  // Filters
  searchQuery = '';
  selectedParty = '';
  selectedCategory: ExpenseCategory | '' = '';
  selectedStatus = '';
  fromDate = '';
  toDate = '';

  // Pagination
  currentPage = 1;
  readonly limit = 10;
  total = 0;
  totalPages = 1;

  // Status update modal
  statusModalExpenseId: string | null = null;
  statusModalCurrentCategory: ExpenseCategory | null = null;
  statusModalValue = '';
  statusUpdating = false;

  // Confirm delete
  deleteConfirmId: string | null = null;

  readonly categoryOptions: { value: ExpenseCategory; label: string }[] = [
    { value: 'washing', label: 'Washing' },
    { value: 'stitching', label: 'Stitching' },
    { value: 'blouse_stitching', label: 'Blouse Stitching' },
  ];

  ngOnInit(): void {
    this.loadParties();
    this.load();
  }

  loadParties(): void {
    this.partyService.getAll().subscribe({
      next: (res) => (this.parties = res.data),
    });
  }

  load(): void {
    this.loading = true;
    const params: SearchExpenseParams = {
      page: this.currentPage,
      limit: this.limit,
    };
    if (this.searchQuery.trim()) params.search = this.searchQuery.trim();
    if (this.selectedParty) params.partyId = this.selectedParty;
    if (this.selectedCategory) params.category = this.selectedCategory;
    if (this.selectedStatus) params.status = this.selectedStatus;
    if (this.fromDate) params.fromDate = this.fromDate;
    if (this.toDate) params.toDate = this.toDate;

    this.expenseService.search(params).subscribe({
      next: (res) => {
        this.expenses = res.data;
        this.total = res.total;
        this.totalPages = res.totalPages;
        this.loading = false;
      },
      error: () => {
        this.toast.show('error', 'Error', 'Failed to load expenses.');
        this.loading = false;
      },
    });
  }

  // Date range filter
  dateRangeOpen = false;
  fromDateObj: Date | null = null;
  toDateObj: Date | null = null;

  get dateRangeActive(): boolean {
    return !!(this.fromDateObj || this.toDateObj);
  }

  get dateRangeLabel(): string {
    if (this.fromDateObj && this.toDateObj) {
      return `${this.fmt(this.fromDateObj)} – ${this.fmt(this.toDateObj)}`;
    }
    if (this.fromDateObj) return `From ${this.fmt(this.fromDateObj)}`;
    if (this.toDateObj) return `To ${this.fmt(this.toDateObj)}`;
    return 'Date Range';
  }

  private fmt(d: Date): string {
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  toggleDateRange(event: MouseEvent): void {
    event.stopPropagation();
    this.dateRangeOpen = !this.dateRangeOpen;
  }

  applyDateRange(range: { from: Date | null; to: Date | null }): void {
    this.fromDateObj = range.from;
    this.toDateObj = range.to;
    this.fromDate = range.from ? range.from.toISOString().split('T')[0] : '';
    this.toDate = range.to ? range.to.toISOString().split('T')[0] : '';
    this.dateRangeOpen = false;
    this.currentPage = 1;
    this.load();
  }

  clearDateRange(): void {
    this.fromDateObj = null;
    this.toDateObj = null;
    this.fromDate = '';
    this.toDate = '';
    this.dateRangeOpen = false;
    this.currentPage = 1;
    this.load();
  }

  @HostListener('document:click')
  closeDateRange(): void {
    this.dateRangeOpen = false;
  }

  openMenuId: string | null = null;

  toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  @HostListener('document:click', ['$event'])
  closeMenu(event?: Event): void {
    this.openMenuId = null;
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.load();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedParty = '';
    this.selectedCategory = '';
    this.selectedStatus = '';
    this.fromDate = '';
    this.toDate = '';
    this.fromDateObj = null;
    this.toDateObj = null;
    this.currentPage = 1;
    this.load();
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.load();
  }

  viewExpense(id: string): void {
    this.router.navigate(['/expenses', id]);
  }

  confirmDelete(id: string): void {
    this.deleteConfirmId = id;
  }

  cancelDelete(): void {
    this.deleteConfirmId = null;
  }

  doDelete(): void {
    if (!this.deleteConfirmId) return;
    const id = this.deleteConfirmId;
    this.deletingId = id;
    this.deleteConfirmId = null;
    this.expenseService.delete(id).subscribe({
      next: () => {
        this.toast.show('success', 'Deleted', 'Expense deleted successfully.');
        this.deletingId = null;
        this.load();
      },
      error: () => {
        this.toast.show('error', 'Error', 'Failed to delete expense.');
        this.deletingId = null;
      },
    });
  }

  statusModalExpenseItems: any[] = [];
  statusModalRenderItems: any[] = [];
  statusModalSelectedProductIds: Set<string> = new Set();
  statusModalCurrentStatus = '';

  openStatusModal(expense: Expense): void {
    this.statusModalExpenseId = expense._id;
    this.statusModalCurrentCategory = expense.category;
    this.statusModalValue = expense.status;
    this.statusModalCurrentStatus = expense.status;
    this.statusUpdating = false;
    this.statusModalExpenseItems = expense.items || [];
    this.statusModalRenderItems = this.statusModalExpenseItems.filter(i => !i.isReturned);
    this.statusModalSelectedProductIds = new Set(this.statusModalRenderItems.map(i => i.product._id));
  }

  closeStatusModal(): void {
    this.statusModalExpenseId = null;
    this.statusModalCurrentCategory = null;
    this.statusModalValue = '';
    this.statusModalExpenseItems = [];
    this.statusModalRenderItems = [];
    this.statusModalSelectedProductIds.clear();
  }

  toggleStatusProduct(productId: string): void {
    if (this.statusModalSelectedProductIds.has(productId)) {
      this.statusModalSelectedProductIds.delete(productId);
    } else {
      this.statusModalSelectedProductIds.add(productId);
    }
  }

  saveStatus(): void {
    if (!this.statusModalExpenseId || !this.statusModalValue) return;
    this.statusUpdating = true;

    const id = this.statusModalExpenseId;
    const status = this.statusModalValue;

    if (status === 'returned') {
      const newItems = this.statusModalExpenseItems.map(item => {
        const isRendered = this.statusModalRenderItems.some(ri => ri.product._id === item.product._id);
        const isReturned = isRendered ? this.statusModalSelectedProductIds.has(item.product._id) : !!item.isReturned;
        return {
          product: item.product._id,
          quantity: item.quantity,
          isReturned
        };
      });

      const returnedCount = newItems.filter(i => i.isReturned).length;
      let finalStatus = 'sent';
      if (newItems.length > 0 && returnedCount === newItems.length) {
        finalStatus = 'returned';
      } else if (returnedCount > 0) {
        finalStatus = 'partial_return';
      }

      this.expenseService.update(id, { items: newItems }).subscribe({
        next: () => {
          this.expenseService.updateStatus(id, finalStatus).subscribe({
            next: () => {
              this.toast.show('success', 'Status Updated', 'Expense status changed.');
              this.statusUpdating = false;
              this.closeStatusModal();
              this.load();
            },
            error: () => {
              this.toast.show('error', 'Error', 'Failed to update status.');
              this.statusUpdating = false;
            }
          });
        },
        error: () => {
          this.toast.show('error', 'Error', 'Failed to update returned items.');
          this.statusUpdating = false;
        }
      });
    } else {
      this.expenseService.updateStatus(id, status).subscribe({
        next: () => {
          this.toast.show('success', 'Status Updated', 'Expense status changed.');
          this.statusUpdating = false;
          this.closeStatusModal();
          this.load();
        },
        error: () => {
          this.toast.show('error', 'Error', 'Failed to update status.');
          this.statusUpdating = false;
        },
      });
    }
  }

  get partyOptions() {
    return [
      { label: 'All Parties', value: '' },
      ...this.parties.map(p => ({ label: p.name, value: p._id }))
    ];
  }

  get categoryFilterOptions() {
    return [
      { label: 'All Categories', value: '' },
      ...this.categoryOptions
    ];
  }

  get statusFilterOptions() {
    return [
      { label: 'All Statuses', value: '' },
      { value: 'sent', label: 'Sent' },
      { value: 'returned', label: 'Returned' },
      { value: 'partial_return', label: 'Partial Return' }
    ];
  }

  getUpdateStatusOptions(currentStatus: string): { value: string; label: string }[] {
    if (currentStatus === 'partial_return') {
      return [{ value: 'returned', label: 'Returned' }];
    }
    if (currentStatus === 'sent') {
      return [{ value: 'returned', label: 'Returned' }];
    }
    // For any other legacy statuses or if it's already returned (though UI should hide button)
    return [{ value: 'returned', label: 'Returned' }];
  }

  // ── Display helpers ───────────────────────────────────────────
  categoryLabel(cat: ExpenseCategory): string {
    const map: Record<ExpenseCategory, string> = {
      washing: 'Washing',
      stitching: 'Stitching',
      blouse_stitching: 'Blouse Stitching',
    };
    return map[cat] ?? cat;
  }

  categoryClass(cat: ExpenseCategory): string {
    const map: Record<ExpenseCategory, string> = {
      washing: 'badge--washing',
      stitching: 'badge--stitching',
      blouse_stitching: 'badge--blouse',
    };
    return map[cat] ?? 'badge--cat';
  }

  statusLabel(status: string, items?: any[]): string {
    if (status === 'partial_return') {
      if (items) {
        const unreturned = items.filter(i => !i.isReturned).length;
        if (unreturned > 0) return `Partial Return (${unreturned} Not Returned)`;
      }
      return 'Partial Return';
    }
    // Fallbacks for any legacy statuses
    if (status.includes('returned')) return 'Returned';
    if (status.includes('progress')) return 'In Progress';
    if (status.includes('sent')) return 'Sent';
    return status;
  }

  statusClass(status: string): string {
    if (status === 'partial_return') return 'badge--partial';
    if (status.includes('returned')) return 'badge--returned';
    if (status.includes('progress')) return 'badge--progress';
    return 'badge--sent';
  }

  formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
