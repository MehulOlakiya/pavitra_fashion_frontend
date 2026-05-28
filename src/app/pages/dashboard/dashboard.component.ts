import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserStateService } from '../../core/user-state.service';

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
  primary: number;
  secondary: number;
  label: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  userState = inject(UserStateService);
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
    { primary: 40, secondary: 30, label: 'Mon' },
    { primary: 60, secondary: 50, label: 'Tue' },
    { primary: 80, secondary: 60, label: 'Wed' },
    { primary: 50, secondary: 40, label: 'Thu' },
    { primary: 90, secondary: 80, label: 'Fri' },
    { primary: 70, secondary: 65, label: 'Sat' },
  ];

  // ── Monthly Revenue line chart ───────────────────────────
  private readonly CW = 520; // chart plot width
  private readonly CH = 175; // chart plot height
  private readonly CX0 = 52; // left padding (room for y-axis labels)
  private readonly CYB = 195; // y-coordinate of chart bottom
  private readonly Y_MIN = 0;
  private readonly Y_MAX = 280;

  revenueData = [
    { month: 'Jan', value: 82 },
    { month: 'Feb', value: 95 },
    { month: 'Mar', value: 108 },
    { month: 'Apr', value: 97 },
    { month: 'May', value: 128 },
    { month: 'Jun', value: 147 },
    { month: 'Jul', value: 133 },
    { month: 'Aug', value: 162 },
    { month: 'Sep', value: 175 },
    { month: 'Oct', value: 168 },
    { month: 'Nov', value: 195 },
    { month: 'Dec', value: 245 },
  ];

  revenueYTicks = [0, 70, 140, 210, 280];

  get revenuePoints(): {
    x: number;
    y: number;
    month: string;
    value: number;
  }[] {
    const n = this.revenueData.length;
    return this.revenueData.map((d, i) => ({
      ...d,
      x: this.CX0 + (i * this.CW) / (n - 1),
      y:
        this.CYB -
        ((d.value - this.Y_MIN) * this.CH) / (this.Y_MAX - this.Y_MIN),
    }));
  }

  private smoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[Math.max(0, i - 2)];
      const p1 = pts[i - 1];
      const p2 = pts[i];
      const p3 = pts[Math.min(pts.length - 1, i + 1)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }

  get revenueLinePath(): string {
    return this.smoothPath(this.revenuePoints);
  }

  get revenueAreaPath(): string {
    const pts = this.revenuePoints;
    if (pts.length < 2) return '';
    const last = pts[pts.length - 1];
    return `${this.revenueLinePath} L ${last.x.toFixed(1)} ${this.CYB} L ${this.CX0} ${this.CYB} Z`;
  }

  yTickY(value: number): number {
    return (
      this.CYB - ((value - this.Y_MIN) * this.CH) / (this.Y_MAX - this.Y_MIN)
    );
  }

  yTickLabel(value: number): string {
    return value === 0 ? '₹0' : `₹${value}k`;
  }

  constructor(private router: Router) {}

  goToBookings(): void {
    this.router.navigate(['/bookings']);
  }
}
