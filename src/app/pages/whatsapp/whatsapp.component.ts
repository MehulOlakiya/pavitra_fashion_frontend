import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import {
  WhatsappService,
  WhatsAppState,
  WhatsAppStatus,
} from '../../core/whatsapp.service';

@Component({
  selector: 'app-whatsapp',
  imports: [CommonModule, FormsModule],
  templateUrl: './whatsapp.component.html',
  styleUrl: './whatsapp.component.scss',
})
export class WhatsappComponent implements OnInit, OnDestroy {
  private whatsappService = inject(WhatsappService);
  private sanitizer = inject(DomSanitizer);

  status = signal<WhatsAppStatus>({ state: 'idle', qr: null });
  initLoading = signal(false);
  sendLoading = signal(false);
  disconnectLoading = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  mobileNumber = '';
  message = '';

  private sseSub: Subscription | null = null;

  get state(): WhatsAppState {
    return this.status().state;
  }

  get qrSafeUrl(): SafeUrl | null {
    const qr = this.status().qr;
    if (!qr) return null;
    return this.sanitizer.bypassSecurityTrustUrl(qr);
  }

  ngOnInit(): void {
    this.connectSSE();
  }

  ngOnDestroy(): void {
    this.sseSub?.unsubscribe();
  }

  /**
   * Opens the SSE stream. The server immediately sends the current status as
   * the first event, then pushes every state change (qr generated, ready, etc.)
   * in real-time — no polling needed.
   */
  private connectSSE(): void {
    this.sseSub?.unsubscribe();
    const token = localStorage.getItem('accessToken') ?? '';
    this.sseSub = this.whatsappService.streamStatus(token).subscribe({
      next: (s) => this.status.set(s),
      error: () => {
        // SSE connection dropped – fall back to a single HTTP fetch
        this.whatsappService.getStatus().subscribe({
          next: (s) => this.status.set(s),
          error: () => {},
        });
      },
    });
  }

  initialize(): void {
    this.initLoading.set(true);
    this.clearMessages();
    this.whatsappService.initialize().subscribe({
      next: () => this.initLoading.set(false),
      error: (err) => {
        this.initLoading.set(false);
        this.errorMessage.set(
          err?.error?.message ?? 'Failed to initialize WhatsApp.',
        );
      },
    });
  }

  sendMessage(form: NgForm): void {
    if (form.invalid) return;
    this.sendLoading.set(true);
    this.clearMessages();
    this.whatsappService
      .sendMessage({ mobileNumber: this.mobileNumber, message: this.message })
      .subscribe({
        next: () => {
          this.sendLoading.set(false);
          this.successMessage.set('Message sent successfully!');
          this.message = '';
        },
        error: (err) => {
          this.sendLoading.set(false);
          this.errorMessage.set(
            err?.error?.message ?? 'Failed to send message.',
          );
        },
      });
  }

  disconnect(): void {
    this.disconnectLoading.set(true);
    this.clearMessages();
    this.whatsappService.logout().subscribe({
      next: () => {
        this.disconnectLoading.set(false);
        // SSE will push the 'idle' state automatically;
        // set it locally too for instant feedback.
        this.status.set({ state: 'idle', qr: null });
      },
      error: (err) => {
        this.disconnectLoading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Failed to disconnect.');
      },
    });
  }

  private clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }
}
