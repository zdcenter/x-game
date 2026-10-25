import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FeedbackPayload {
  game_id: string;
  level?: string;
  type: string; // 'bug' | 'suggestion' | 'wrong_answer' | 'other'
  content: string;
  device_info?: string;
  contact?: string;
}

export interface FeedbackContext {
  gameId?: string;
  gameTitle?: string;
  level?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private http = inject(HttpClient);

  isOpen = signal<boolean>(false);
  activeContext = signal<FeedbackContext | null>(null);

  open(context?: FeedbackContext) {
    this.activeContext.set(context || null);
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  submit(payload: FeedbackPayload): Observable<any> {
    return this.http.post(`${environment.apiUrl}/feedback`, payload);
  }
}
