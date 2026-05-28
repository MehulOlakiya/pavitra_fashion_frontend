import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { CustomerService, Customer } from '../../core/customer.service';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.scss']
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
    newThisMonth: 0
  };

  isAddingCustomer = false;
  saving = false;
  newCustomerForm = {
    name: '',
    mobileNumber: '',
    village: ''
  };

  private customerService = inject(CustomerService);

  constructor() {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    this.customerService.getAll().subscribe({
      next: (data) => {
        this.customers = data;
        
        // Basic analytics estimation since we don't have real analytics API yet
        this.analytics = {
          total: data.length,
          active: Math.floor(data.length * 0.2), 
          newThisMonth: Math.floor(data.length * 0.1)
        };

        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching customers', err);
        this.loading = false;
      }
    });
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilter();
  }

  applyFilter(): void {
    let result = this.customers;
    
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = this.customers.filter(c => 
        c.name?.toLowerCase().includes(q) || 
        c.mobileNumber?.includes(q) || 
        c.village?.toLowerCase().includes(q)
      );
    }
    
    this.total = result.length;
    this.totalPages = Math.ceil(this.total / this.limit) || 1;
    
    // Ensure currentPage is valid
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    
    const startIndex = (this.currentPage - 1) * this.limit;
    this.filteredCustomers = result.slice(startIndex, startIndex + this.limit);
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.applyFilter();
  }

  addCustomer(): void {
    this.isAddingCustomer = true;
    this.newCustomerForm = { name: '', mobileNumber: '', village: '' };
  }

  closeAddCustomer(): void {
    this.isAddingCustomer = false;
  }

  saveCustomer(): void {
    if (!this.newCustomerForm.name || !this.newCustomerForm.mobileNumber || !this.newCustomerForm.village) {
      alert('Please fill all fields');
      return;
    }
    
    this.saving = true;
    // Autogenerate customerId like orderId
    const customerId = `CUST-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payload = {
      customerId,
      name: this.newCustomerForm.name,
      mobileNumber: this.newCustomerForm.mobileNumber,
      village: this.newCustomerForm.village
    };

    this.customerService.create(payload).subscribe({
      next: (newCust) => {
        this.customers.unshift(newCust);
        this.applyFilter();
        this.saving = false;
        this.isAddingCustomer = false;
      },
      error: (err) => {
        console.error('Error creating customer', err);
        alert('Failed to create customer');
        this.saving = false;
      }
    });
  }
}
