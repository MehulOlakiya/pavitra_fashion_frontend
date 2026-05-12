import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, TitleCasePipe } from '@angular/common';

interface ModuleConfig {
  icon: string;
  title: string;
  description: string;
  features: string[];
  accentClass: string;
}

const MODULE_MAP: Record<string, ModuleConfig> = {
  calendar: {
    icon: 'calendar_month',
    title: 'Calendar',
    description:
      'Visualise all your bookings on an interactive monthly and weekly calendar. Spot gaps, plan ahead, and never double-book again.',
    features: [
      'Monthly & weekly booking view',
      'Drag-and-drop rescheduling',
      'Conflict highlighting',
      'Export to PDF / iCal',
    ],
    accentClass: 'accent--primary',
  },
  customers: {
    icon: 'group',
    title: 'Customers',
    description:
      'A dedicated CRM to track every client — booking history, preferences, outstanding payments and more, all in one place.',
    features: [
      'Customer profiles & history',
      'Loyalty & repeat-booking insights',
      'Outstanding payment tracker',
      'SMS / WhatsApp reminders',
    ],
    accentClass: 'accent--secondary',
  },
  payments: {
    icon: 'payments',
    title: 'Payments',
    description:
      'Full payment management with ledger views, partial payment tracking, and automated receipt generation.',
    features: [
      'Payment ledger & summaries',
      'Partial / advance payment tracking',
      'Automated receipt PDF',
      'Daily collection reports',
    ],
    accentClass: 'accent--tertiary',
  },
  reports: {
    icon: 'bar_chart',
    title: 'Reports',
    description:
      'In-depth analytics and exportable reports to understand your business performance at a glance.',
    features: [
      'Revenue & booking trends',
      'Top-performing items report',
      'Idle inventory insights',
      'Exportable CSV / Excel',
    ],
    accentClass: 'accent--primary',
  },
  notifications: {
    icon: 'notifications',
    title: 'Notifications',
    description:
      'Stay on top of overdue returns, upcoming bookings, and important alerts without checking the dashboard manually.',
    features: [
      'In-app notification centre',
      'Overdue return alerts',
      'Booking confirmation pings',
      'Daily digest emails',
    ],
    accentClass: 'accent--secondary',
  },
  settings: {
    icon: 'settings',
    title: 'Settings',
    description:
      'Customise the platform to fit your business — manage users, roles, store details and billing preferences.',
    features: [
      'User & role management',
      'Store profile & branding',
      'Pricing & tax configuration',
      'Data backup & export',
    ],
    accentClass: 'accent--tertiary',
  },
};

const DEFAULT_MODULE: ModuleConfig = {
  icon: 'construction',
  title: 'Coming Soon',
  description:
    'This module is under active development and will be available shortly.',
  features: [],
  accentClass: 'accent--primary',
};

@Component({
  selector: 'app-coming-soon',
  imports: [CommonModule],
  templateUrl: './coming-soon.component.html',
  styleUrl: './coming-soon.component.scss',
})
export class ComingSoonComponent implements OnInit {
  module: ModuleConfig = DEFAULT_MODULE;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const path = this.route.snapshot.url[0]?.path ?? '';
    this.module = MODULE_MAP[path] ?? DEFAULT_MODULE;
  }
}
