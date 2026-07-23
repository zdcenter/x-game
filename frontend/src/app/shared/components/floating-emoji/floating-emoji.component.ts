import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../../../core/services/websocket.service';
import { effect } from '@angular/core';
import { AuthStore } from '../../../core/auth/auth.store';

interface FloatingEmoji {
  id: number;
  emoji: string;
  senderId: string;
  left: number; // random starting position x
  bottom: number; // random starting position y
}

@Component({
  selector: 'app-floating-emoji',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      @for (e of emojis; track e.id) {
        <div class="absolute text-5xl md:text-7xl animate-float-up drop-shadow-2xl"
             [style.left.%]="e.left"
             [style.bottom.%]="e.bottom">
          {{ e.emoji }}
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes float-up {
      0% { transform: translateY(0) scale(0.3) rotate(-10deg); opacity: 0; }
      15% { transform: translateY(-30px) scale(1.3) rotate(10deg); opacity: 1; }
      30% { transform: translateY(-60px) scale(1) rotate(-5deg); opacity: 1; }
      80% { transform: translateY(-120px) scale(1) rotate(5deg); opacity: 0.8; }
      100% { transform: translateY(-150px) scale(0.8) rotate(0deg); opacity: 0; }
    }
    .animate-float-up {
      animation: float-up 2.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
    }
  `]
})
export class FloatingEmojiComponent {
  private wsService = inject(WebSocketService);
  private authStore = inject(AuthStore);
  private cdr = inject(ChangeDetectorRef);
  emojis: FloatingEmoji[] = [];
  private nextId = 0;

  constructor() {
    effect(() => {
      const event = this.wsService.emojiReceivedEvent();
      if (event) {
        this.addEmoji(event.emoji, event.senderId);
      }
    });
  }

  addEmoji(emoji: string, senderId: string) {
    // If it's my own emoji, spawn on the left side, if opponent, spawn on the right side
    const myId = this.authStore.currentUser()?.id || this.authStore.guestId;
    const isMe = senderId === myId;
    
    const e: FloatingEmoji = {
      id: this.nextId++,
      emoji,
      senderId,
      left: isMe ? 20 + Math.random() * 10 : 70 + Math.random() * 10,
      bottom: 20 + Math.random() * 10
    };
    this.emojis.push(e);
    this.cdr.detectChanges();
    
    // Remove after 2.5 seconds
    setTimeout(() => {
      this.emojis = this.emojis.filter(item => item.id !== e.id);
      this.cdr.detectChanges();
    }, 2500);
  }
}
