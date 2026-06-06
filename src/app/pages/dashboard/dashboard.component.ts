import { Component, inject, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { UserStateService } from '../../core/user-state.service';
import { CommonModule, DatePipe } from '@angular/common';
import { DateRangePickerComponent } from '../../shared/date-range-picker/date-range-picker.component';

interface StatCard {
  icon: string;
  label: string;
  value: string;
  trendIcon: string;
  trendText: string;
  color: string;
  gradient: boolean;
}

interface Booking {
  sn: string;
  clothIcon: string;
  clothColor: string;
  clothName: string;
  customer: string;
  bookingDate: string;
  returnDate: string;
  status: 'Active' | 'Pending Return' | 'Returned';
  remainingPayment: string;
}

interface BarGroup {
  primary: number; // percentage
  secondary: number; // percentage
  primaryValue: number; // actual rented count
  secondaryValue: number; // actual returned count
  label: string;
}

import { CustomSelectComponent } from '../../shared/custom-select/custom-select.component';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { AnalyticsService } from '../../core/analytics.service';
import { BookingService } from '../../core/booking.service';
import { ProductService } from '../../core/product.service';
import { CustomerService } from '../../core/customer.service';
import { NgApexchartsModule, ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexPlotOptions, ApexYAxis, ApexLegend, ApexStroke, ApexXAxis, ApexFill, ApexTooltip, ApexGrid, ApexMarkers } from "ng-apexcharts";
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  yaxis: ApexYAxis | ApexYAxis[];
  xaxis: ApexXAxis;
  fill: ApexFill;
  tooltip: ApexTooltip;
  stroke: ApexStroke;
  legend: ApexLegend;
  colors: string[];
  grid: ApexGrid;
  markers: ApexMarkers;
};

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, DateRangePickerComponent, DatePipe, CustomSelectComponent, FormsModule, NgApexchartsModule, NgxSkeletonLoaderModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  userState = inject(UserStateService);
  analyticsService = inject(AnalyticsService);
  bookingService = inject(BookingService);
  productService = inject(ProductService);
  customerService = inject(CustomerService);

  // Analytics states
  bookingStats: any = null;
  inventoryStats: any = null;
  customerStats: any = null;
  topWidgetStats: any = null;

  // Date states
  chartDateRangeOpen = false;
  chartFromDate: Date | null = null;
  chartToDate: Date | null = null;

  bookingDateRangeOpen = false;
  bookingFromDate: Date | null = null;
  bookingToDate: Date | null = null;

  inventoryDateRangeOpen = false;
  inventoryFromDate: Date | null = null;
  inventoryToDate: Date | null = null;

  customerDateRangeOpen = false;
  customerFromDate: Date | null = null;
  customerToDate: Date | null = null;
  public chartOptions: ChartOptions = {
    series: [
      { name: "Rented", data: [] },
      { name: "Returned", data: [] }
    ],
    chart: {
      type: "bar",
      height: 250,
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif'
    },
    colors: [
      '#b45309',
      '#166534'
    ],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "40%",
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"]
    },
    xaxis: {
      categories: [],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: 'var(--on-surface-variant)',
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif'
        }
      }
    },
    yaxis: {
      show: true,
      stepSize: 1,
      forceNiceScale: true,
      labels: {
        formatter: function(val) {
          return val.toFixed(0);
        },
        style: {
          colors: 'var(--on-surface-variant)',
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif'
        }
      }
    },
    fill: {
      opacity: 1
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: function (val) {
          return val + " bookings";
        }
      }
    },
    legend: {
      show: false // we already have a custom legend in the HTML
    },
    grid: {
      show: true,
      borderColor: 'rgba(191, 199, 212, 0.3)',
      strokeDashArray: 0,
      yaxis: {
        lines: { show: true }
      }
    },
    markers: {
      size: 0
    }
  };

  public revenueChartOptions: ChartOptions = {
    series: [
      {
        name: "Revenue",
        data: []
      }
    ],
    chart: {
      type: "area",
      height: 250,
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif'
    },
    plotOptions: {},
    colors: ['var(--primary)'],
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    markers: {
      size: 5,
      colors: ["#fff"],
      strokeColors: 'var(--primary)',
      strokeWidth: 2,
      hover: {
        size: 7
      }
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: 'var(--on-surface-variant)',
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif'
        }
      }
    },
    yaxis: {
      show: true,
      labels: {
        formatter: function(val) {
          if (val === 0) return '₹0';
          return val >= 1000 ? '₹' + Number((val / 1000).toFixed(1)) + 'k' : '₹' + Math.floor(val);
        },
        style: {
          colors: 'var(--on-surface-variant)',
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif'
        }
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 100]
      }
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: function (val) {
          return val >= 1000 ? '₹' + Number((val / 1000).toFixed(1)) + 'k' : '₹' + val;
        }
      }
    },
    legend: {
      show: false
    },
    grid: {
      show: true,
      borderColor: 'rgba(191, 199, 212, 0.3)',
      strokeDashArray: 0,
      xaxis: {
        lines: { show: false }
      },
      yaxis: {
        lines: { show: true }
      }
    }
  };

  
  revenueYearOptions: { value: string; label: string }[] = [];
  selectedRevenueYear = '';

  ngOnInit() {
    // Default to last 10 days up to today
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 9); // today + 9 days ago = 10 days total
    
    // Initialize date ranges
    this.onChartDateRangeChange({ from, to });
    this.onBookingDateRangeChange({ from: null, to: null });
    this.onInventoryDateRangeChange({ from: null, to: null });
    this.onCustomerDateRangeChange({ from: null, to: null });

    const currentYear = new Date().getFullYear();
    this.selectedRevenueYear = currentYear.toString();
    for (let i = 0; i < 5; i++) {
      this.revenueYearOptions.push({
        value: (currentYear - i).toString(),
        label: (currentYear - i).toString()
      });
    }

    this.fetchMonthlyRevenue(this.selectedRevenueYear);
    this.fetchDashboardStats();
  }

  onRevenueYearChange(year: string) {
    this.selectedRevenueYear = year;
    this.fetchMonthlyRevenue(year);
  }

  fetchMonthlyRevenue(year: string) {
    this.analyticsService.getMonthlyRevenue(year).subscribe({
      next: (data) => {
        // Pass the actual raw numbers
        const seriesData = data.map(d => d.value > 0 ? d.value : 0);
        
        const minValue = Math.min(...seriesData);
        let maxValue = Math.max(...seriesData);
        
        // Add 10% padding to max so the peak doesn't touch the top edge
        maxValue = maxValue > 0 ? Math.ceil(maxValue * 1.1) : 100;
        
        this.revenueChartOptions = {
          ...this.revenueChartOptions,
          series: [{
            name: "Revenue",
            data: seriesData
          }],
          yaxis: {
            ...(this.revenueChartOptions.yaxis as any),
            min: minValue,
            max: maxValue,
            forceNiceScale: true
          }
        };
      },
      error: (err) => {
        console.error('Failed to fetch monthly revenue', err);
      }
    });
  }

  isLoadingStats = true;

  fetchDashboardStats() {
    this.isLoadingStats = true;
    this.analyticsService.getDashboardStats().subscribe({
      next: (data) => {
        this.topWidgetStats = data.newWidgetStats;
        this.stats = [
          {
            icon: 'shopping_bag',
            label: 'Active Bookings',
            value: data.activeBookings.value.toString(),
            trendIcon: 'trending_up',
            trendText: data.activeBookings.trend,
            color: 'secondary',
            gradient: false,
          },
          {
            icon: 'payments',
            label: 'Pending Payments',
            value: '₹' + data.pendingPayments.value.toLocaleString('en-IN'),
            trendIcon: 'warning',
            trendText: data.pendingPayments.trend,
            color: 'tertiary',
            gradient: false,
          },
          {
            icon: 'account_balance_wallet',
            label: 'Monthly Revenue',
            value: '₹' + data.monthlyRevenue.value.toLocaleString('en-IN'),
            trendIcon: data.monthlyRevenue.value > 0 ? 'trending_up' : 'horizontal_rule',
            trendText: data.monthlyRevenue.trend,
            color: 'primary',
            gradient: false,
          },
          {
            icon: 'assignment_return',
            label: 'Returned (This Month)',
            value: data.returnedThisMonth.value.toString(),
            trendIcon: 'horizontal_rule',
            trendText: data.returnedThisMonth.trend,
            color: 'neutral',
            gradient: false,
          },
          {
            icon: 'local_shipping',
            label: "Today's Returns",
            value: data.todaysReturns.value.toString(),
            trendIcon: 'schedule',
            trendText: data.todaysReturns.trend,
            color: 'error',
            gradient: false,
          }
        ];
        this.isLoadingStats = false;
      },
      error: (err) => {
        console.error('Failed to fetch dashboard stats', err);
        this.isLoadingStats = false;
      }
    });
  }

  stats: StatCard[] = [];

  fetchBookingsAnalytics() {
    const params: { fromDate?: string; toDate?: string } = {};
    if (this.bookingFromDate) params.fromDate = this.bookingFromDate.toISOString();
    if (this.bookingToDate) params.toDate = this.bookingToDate.toISOString();
    this.bookingService.getAnalytics(params).subscribe({
      next: (res) => this.bookingStats = res,
      error: (err) => console.error('Failed to fetch booking analytics', err)
    });
  }

  fetchInventoryAnalytics() {
    const params: { fromDate?: string; toDate?: string } = {};
    if (this.inventoryFromDate) params.fromDate = this.inventoryFromDate.toISOString();
    if (this.inventoryToDate) params.toDate = this.inventoryToDate.toISOString();
    this.productService.getAnalytics(params).subscribe({
      next: (res) => this.inventoryStats = res,
      error: (err) => console.error('Failed to fetch inventory analytics', err)
    });
  }

  fetchCustomerAnalytics() {
    const params: { fromDate?: string; toDate?: string } = {};
    if (this.customerFromDate) params.fromDate = this.customerFromDate.toISOString();
    if (this.customerToDate) params.toDate = this.customerToDate.toISOString();
    this.customerService.getListAnalytics(params).subscribe({
      next: (res) => this.customerStats = res,
      error: (err) => console.error('Failed to fetch customer analytics', err)
    });
  }

  recentBookings: Booking[] = [
    {
      sn: '#1042',
      clothIcon: 'checkroom',
      clothColor: 'secondary',
      clothName: 'Red Bridal Lehenga',
      customer: 'Ananya Sharma',
      bookingDate: '24 Oct, 2023',
      returnDate: '28 Oct, 2023',
      status: 'Active',
      remainingPayment: '₹5,000',
    },
    {
      sn: '#1041',
      clothIcon: 'styler',
      clothColor: 'primary',
      clothName: 'Navy Blue Sherwani',
      customer: 'Rahul Verma',
      bookingDate: '22 Oct, 2023',
      returnDate: '25 Oct, 2023',
      status: 'Pending Return',
      remainingPayment: '₹2,000',
    },
    {
      sn: '#1040',
      clothIcon: 'checkroom',
      clothColor: 'secondary',
      clothName: 'Pastel Floral Anarkali',
      customer: 'Sneha Gupta',
      bookingDate: '20 Oct, 2023',
      returnDate: '23 Oct, 2023',
      status: 'Returned',
      remainingPayment: '₹0',
    },
  ];

  barGroups: BarGroup[] = [
    { primary: 30, secondary: 20, primaryValue: 3, secondaryValue: 2, label: '' },
    { primary: 45, secondary: 35, primaryValue: 4, secondaryValue: 3, label: '' },
    { primary: 60, secondary: 50, primaryValue: 6, secondaryValue: 5, label: '' },
    { primary: 80, secondary: 60, primaryValue: 8, secondaryValue: 6, label: '' },
    { primary: 50, secondary: 40, primaryValue: 5, secondaryValue: 4, label: '' },
    { primary: 90, secondary: 80, primaryValue: 9, secondaryValue: 8, label: '' },
    { primary: 70, secondary: 65, primaryValue: 7, secondaryValue: 6, label: '' },
    { primary: 85, secondary: 60, primaryValue: 8, secondaryValue: 6, label: '' },
    { primary: 40, secondary: 30, primaryValue: 4, secondaryValue: 3, label: '' },
    { primary: 55, secondary: 45, primaryValue: 5, secondaryValue: 4, label: '' },
  ];

  onChartDateRangeChange(range: { from: Date | null; to: Date | null }): void {
    this.chartFromDate = range.from;
    this.chartToDate = range.to;
    this.chartDateRangeOpen = false;
    
    if (this.chartFromDate && this.chartToDate) {
      this.analyticsService.getBookingStats(this.chartFromDate, this.chartToDate).subscribe({
        next: (data) => {
          const bookedData = data.map(d => d.booked);
          const rentedData = data.map(d => d.rented);
          const returnedData = data.map(d => d.returned);
          const categories = data.map(d => {
            const dateObj = new Date(d.date);
            return dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
          });

          this.chartOptions = {
            ...this.chartOptions,
            series: [
              { name: "Rented", data: rentedData },
              { name: "Returned", data: returnedData }
            ],
            xaxis: { 
              ...this.chartOptions.xaxis, 
              categories 
            }
          };
        },
        error: (err) => {
          console.error('Failed to fetch booking statistics', err);
          this.barGroups = [];
        }
      });
    }
  }

  onChartDateRangeClear(): void {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 9);
    this.onChartDateRangeChange({ from, to });
  }

  onBookingDateRangeChange(range: { from: Date | null; to: Date | null }): void {
    this.bookingFromDate = range.from;
    this.bookingToDate = range.to;
    this.bookingDateRangeOpen = false;
    this.fetchBookingsAnalytics();
  }

  onBookingDateRangeClear(): void {
    this.onBookingDateRangeChange({ from: null, to: null });
  }

  onInventoryDateRangeChange(range: { from: Date | null; to: Date | null }): void {
    this.inventoryFromDate = range.from;
    this.inventoryToDate = range.to;
    this.inventoryDateRangeOpen = false;
    this.fetchInventoryAnalytics();
  }

  onInventoryDateRangeClear(): void {
    this.onInventoryDateRangeChange({ from: null, to: null });
  }

  onCustomerDateRangeChange(range: { from: Date | null; to: Date | null }): void {
    this.customerFromDate = range.from;
    this.customerToDate = range.to;
    this.customerDateRangeOpen = false;
    this.fetchCustomerAnalytics();
  }

  onCustomerDateRangeClear(): void {
    this.onCustomerDateRangeChange({ from: null, to: null });
  }


  constructor(private router: Router) {}

  goToBookings(): void {
    this.router.navigate(['/bookings']);
  }

  toggleChartDateRange(event: MouseEvent): void {
    event.stopPropagation();
    this.chartDateRangeOpen = !this.chartDateRangeOpen;
  }

  toggleBookingDateRange(event: MouseEvent): void {
    event.stopPropagation();
    this.bookingDateRangeOpen = !this.bookingDateRangeOpen;
  }

  toggleInventoryDateRange(event: MouseEvent): void {
    event.stopPropagation();
    this.inventoryDateRangeOpen = !this.inventoryDateRangeOpen;
  }

  toggleCustomerDateRange(event: MouseEvent): void {
    event.stopPropagation();
    this.customerDateRangeOpen = !this.customerDateRangeOpen;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.chartDateRangeOpen = false;
    this.bookingDateRangeOpen = false;
    this.inventoryDateRangeOpen = false;
    this.customerDateRangeOpen = false;
  }
}
