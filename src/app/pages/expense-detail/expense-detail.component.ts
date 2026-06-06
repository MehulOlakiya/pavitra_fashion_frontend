import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ExpenseService,
  Expense,
  ExpenseCategory,
} from '../../core/expense.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-expense-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './expense-detail.component.html',
  styleUrl: './expense-detail.component.scss',
})
export class ExpenseDetailComponent implements OnInit {
  private expenseService = inject(ExpenseService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  expense: Expense | null = null;
  loading = true;

  // Status modal
  statusModalOpen = false;
  statusModalValue = '';
  statusUpdating = false;
  statusModalExpenseItems: any[] = [];
  statusModalRenderItems: any[] = [];
  statusModalSelectedProductIds: Set<string> = new Set();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/expenses']); return; }
    this.load(id);
  }

  load(id: string): void {
    this.loading = true;
    this.expenseService.getById(id).subscribe({
      next: (exp) => { this.expense = exp; this.loading = false; },
      error: () => { this.router.navigate(['/expenses']); },
    });
  }

  getUpdateStatusOptions(currentStatus: string): { value: string; label: string }[] {
    if (currentStatus === 'partial_return') {
      return [{ value: 'returned', label: 'Returned' }];
    }
    if (currentStatus === 'sent') {
      return [{ value: 'returned', label: 'Returned' }];
    }
    return [{ value: 'returned', label: 'Returned' }];
  }

  openStatusModal(): void {
    if (!this.expense) return;
    this.statusModalValue = this.expense.status;
    this.statusModalOpen = true;
    this.statusModalExpenseItems = this.expense.items || [];
    this.statusModalRenderItems = this.statusModalExpenseItems.filter(i => !i.isReturned);
    this.statusModalSelectedProductIds = new Set(this.statusModalRenderItems.map(i => i.product._id));
  }

  closeStatusModal(): void {
    this.statusModalOpen = false;
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
    if (!this.expense || !this.statusModalValue) return;
    this.statusUpdating = true;

    const id = this.expense._id;
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
            next: (updated) => {
              this.expense = updated;
              this.statusUpdating = false;
              this.closeStatusModal();
              this.toast.show('success', 'Status Updated', 'Expense status changed.');
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
        next: (updated) => {
          this.expense = updated;
          this.statusUpdating = false;
          this.closeStatusModal();
          this.toast.show('success', 'Status Updated', 'Expense status changed.');
        },
        error: () => {
          this.toast.show('error', 'Error', 'Failed to update status.');
          this.statusUpdating = false;
        },
      });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────
  categoryLabel(cat: ExpenseCategory): string {
    const map: Record<ExpenseCategory, string> = {
      washing: 'Washing',
      stitching: 'Stitching',
      blouse_stitching: 'Blouse Stitching',
    };
    return map[cat] ?? cat;
  }

  categoryIcon(cat: ExpenseCategory): string {
    const map: Record<ExpenseCategory, string> = {
      washing: 'local_laundry_service',
      stitching: 'content_cut',
      blouse_stitching: 'checkroom',
    };
    return map[cat] ?? 'receipt_long';
  }

  statusLabel(status: string): string {
    if (status === 'partial_return') {
      if (this.expense && this.expense.items) {
        const unreturned = this.expense.items.filter(i => !i.isReturned).length;
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

  categoryClass(cat: ExpenseCategory): string {
    const map: Record<ExpenseCategory, string> = {
      washing: 'badge--washing',
      stitching: 'badge--stitching',
      blouse_stitching: 'badge--blouse',
    };
    return map[cat] ?? 'badge--cat';
  }

  formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }

  goBack(): void {
    this.router.navigate(['/expenses']);
  }
}
