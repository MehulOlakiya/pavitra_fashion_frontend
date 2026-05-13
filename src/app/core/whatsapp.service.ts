import { Injectable, inject, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type WhatsAppState =
  | 'idle'
  | 'initializing'
  | 'qr'
  | 'connected'
  | 'disconnected';

export interface WhatsAppStatus {
  state: WhatsAppState;
  qr: string | null;
}

export interface SendMessagePayload {
  mobileNumber: string;
  message: string;
  imageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private http = inject(HttpClient);
  private zone = inject(NgZone);
  private readonly base = `${environment.apiUrl}/whatsapp`;

  getStatus(): Observable<WhatsAppStatus> {
    return this.http.get<WhatsAppStatus>(`${this.base}/status`);
  }

  initialize(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/initialize`, {});
  }

  sendMessage(payload: SendMessagePayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/send`, payload);
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/logout`, {});
  }

  /**
   * Opens an SSE connection to /api/whatsapp/events.
   * BehaviorSubject on the server replays the latest value immediately on
   * connect, so the current state (including QR) is always received instantly.
   * The caller is responsible for closing (unsubscribing) to close the connection.
   */
  streamStatus(token: string): Observable<WhatsAppStatus> {
    return new Observable<WhatsAppStatus>((observer) => {
      let es: EventSource;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

      const connect = () => {
        const url = `${this.base}/events?token=${encodeURIComponent(token)}`;
        es = new EventSource(url);

        es.onmessage = (event) => {
          if (reconnectTimer !== null) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          this.zone.run(() => {
            try {
              observer.next(JSON.parse(event.data) as WhatsAppStatus);
            } catch {
              // ignore malformed frames
            }
          });
        };

        es.onerror = () => {
          // EventSource auto-reconnects on network errors, but on a 4xx
          // (e.g. 401) it keeps retrying forever with no back-off.
          // Close and retry after 3 s so we don't hammer the server.
          es.close();
          reconnectTimer = setTimeout(() => connect(), 3000);
        };
      };

      connect();

      // Teardown: close connection and cancel any pending reconnect
      return () => {
        if (reconnectTimer !== null) clearTimeout(reconnectTimer);
        es.close();
      };
    });
  }
}
