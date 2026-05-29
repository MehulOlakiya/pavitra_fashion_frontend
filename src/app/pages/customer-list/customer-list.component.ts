import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { CustomerService, Customer } from '../../core/customer.service';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.scss'],
})
export class CustomerListComponent implements OnInit {
  searchQuery = '';

  // Pagination
  currentPage = 1;
  limit = 10;
  total = 0;
  totalPages = 0;
  loading = false;

  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];

  // Analytics
  analytics = {
    total: 0,
    active: 0,
    newThisMonth: 0,
  };

  isAddingCustomer = false;
  saving = false;
  newCustomerForm = {
    name: '',
    mobileNumber: '',
    village: '',
  };

  private customerService = inject(CustomerService);
  private router = inject(Router);

  constructor() {}

  ngOnInit(): void {
    this.loadCustomers();
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.customerService.getListAnalytics().subscribe({
      next: (data) => {
        this.analytics = data;
      },
      error: (err) => {
        console.error('Error fetching analytics', err);
      },
    });
  }

  loadCustomers(): void {
    this.loading = true;
    this.customerService
      .getAll(this.currentPage, this.limit, this.searchQuery)
      .subscribe({
        next: (response) => {
          this.filteredCustomers = response.data;
          this.total = response.total;
          this.totalPages = response.totalPages;

          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetching customers', err);
          this.loading = false;
        },
      });
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.loadCustomers();
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadCustomers();
  }

  addCustomer(): void {
    this.isAddingCustomer = true;
    this.newCustomerForm = { name: '', mobileNumber: '', village: '' };
  }

  closeAddCustomer(): void {
    this.isAddingCustomer = false;
  }

  saveCustomer(): void {
    if (
      !this.newCustomerForm.name ||
      !this.newCustomerForm.mobileNumber ||
      !this.newCustomerForm.village
    ) {
      alert('Please fill all fields');
      return;
    }

    this.saving = true;
    // Autogenerate customerId like orderId
    const customerId = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;

    const payload = {
      customerId,
      name: this.newCustomerForm.name,
      mobileNumber: this.newCustomerForm.mobileNumber,
      village: this.newCustomerForm.village,
    };

    this.customerService.create(payload).subscribe({
      next: (newCust) => {
        this.loadCustomers();
        this.saving = false;
        this.isAddingCustomer = false;
      },
      error: (err) => {
        console.error('Error creating customer', err);
        alert('Failed to create customer');
        this.saving = false;
      },
    });
  }

  viewCustomer(id: string): void {
    this.router.navigate(['/customers', id]);
  }
}
