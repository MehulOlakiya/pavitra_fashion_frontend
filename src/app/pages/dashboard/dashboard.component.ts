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

import { AnalyticsService } from '../../core/analytics.service';
import { NgApexchartsModule, ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexPlotOptions, ApexYAxis, ApexLegend, ApexStroke, ApexXAxis, ApexFill, ApexTooltip, ApexGrid, ApexMarkers } from "ng-apexcharts";

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
  imports: [CommonModule, DateRangePickerComponent, DatePipe, CustomSelectComponent, FormsModule, NgApexchartsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  userState = inject(UserStateService);
  analyticsService = inject(AnalyticsService);
  
  public chartOptions: ChartOptions = {
    series: [
      { name: "Booked", data: [] },
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
      'var(--primary)',
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
    this.onDateRangeChange({ from, to });

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

  fetchDashboardStats() {
    this.analyticsService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats = [
          {
            icon: 'checkroom',
            label: 'Total Cloths',
            value: data.totalCloths.value.toString(),
            trendIcon: 'trending_up',
            trendText: data.totalCloths.trend,
            color: 'primary',
            gradient: false,
          },
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
      },
      error: (err) => console.error('Failed to fetch dashboard stats', err)
    });
  }

  stats: StatCard[] = [
    {
      icon: 'checkroom',
      label: 'Total Cloths',
      value: '1,248',
      trendIcon: 'trending_up',
      trendText: '+12 this week',
      color: 'primary',
      gradient: false,
    },
    {
      icon: 'shopping_bag',
      label: 'Active Bookings',
      value: '84',
      trendIcon: 'trending_up',
      trendText: '+5 since yesterday',
      color: 'secondary',
      gradient: false,
    },
    {
      icon: 'payments',
      label: 'Pending Payments',
      value: '₹15,400',
      trendIcon: 'warning',
      trendText: '12 invoices due',
      color: 'tertiary',
      gradient: false,
    },
    {
      icon: 'account_balance_wallet',
      label: 'Monthly Revenue',
      value: '₹2,45,000',
      trendIcon: 'trending_up',
      trendText: '+18% vs last month',
      color: 'primary',
      gradient: false,
    },
    {
      icon: 'assignment_return',
      label: 'Returned (This Month)',
      value: '112',
      trendIcon: 'horizontal_rule',
      trendText: 'Stable',
      color: 'neutral',
      gradient: false,
    },
    {
      icon: 'local_shipping',
      label: "Today's Returns",
      value: '8',
      trendIcon: 'schedule',
      trendText: '3 pending inspection',
      color: 'tertiary',
      gradient: false,
    },
  ];

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

  dateRangeOpen = false;
  fromDate: Date | null = null;
  toDate: Date | null = null;

  onDateRangeChange(range: { from: Date | null; to: Date | null }): void {
    this.fromDate = range.from;
    this.toDate = range.to;
    this.dateRangeOpen = false;
    
    if (this.fromDate && this.toDate) {
      this.analyticsService.getBookingStats(this.fromDate, this.toDate).subscribe({
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
              { name: "Booked", data: bookedData },
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

  onDateRangeClear(): void {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 9);
    this.onDateRangeChange({ from, to });
  }


  constructor(private router: Router) {}

  goToBookings(): void {
    this.router.navigate(['/bookings']);
  }

  toggleDateRange(event: MouseEvent): void {
    event.stopPropagation();
    this.dateRangeOpen = !this.dateRangeOpen;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.dateRangeOpen = false;
  }
}
