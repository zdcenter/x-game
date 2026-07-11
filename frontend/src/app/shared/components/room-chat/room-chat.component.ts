import { Component, effect, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AudioService } from '../../../core/services/audio.service';

interface ChatMessage {
  id: number;
  senderId: string;
  text: string;
  timestamp: number;
  fading: boolean;
}

@Component({
  selector: 'app-room-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (ws.isConnected()) {
      <div class="fixed bottom-4 left-4 z-50 flex flex-col justify-end w-[260px] md:w-[320px] pointer-events-none transition-all duration-300">
        
        <!-- Messages Feed -->
        <div class="flex flex-col gap-2 mb-2 overflow-y-auto max-h-[300px] hide-scrollbar" #scrollContainer>
          @for (msg of visibleMessages(); track msg.id) {
            <div class="pointer-events-auto w-max max-w-full px-3 py-1.5 rounded-2xl text-[13px] md:text-sm shadow-md animate-in slide-in-from-left-4 fade-in duration-300 transition-opacity"
                 [ngClass]="{
                   'bg-blue-500/80 text-white ml-auto rounded-br-sm': msg.senderId === myPlayerId,
                   'bg-[var(--color-bg-card)]/90 backdrop-blur-md border border-[var(--color-border-card)] text-[var(--color-text-main)] rounded-bl-sm': msg.senderId !== myPlayerId,
                   'opacity-0': msg.fading
                 }">
              @if (msg.senderId !== myPlayerId) {
                <span class="font-black text-xs text-[var(--color-text-muted)] block mb-0.5">{{ msg.senderId }}</span>
              }
              <span class="font-medium break-words leading-tight">{{ msg.text }}</span>
            </div>
          }
        </div>

        <!-- Input Box -->
        <div class="pointer-events-auto bg-[var(--color-bg-card)]/90 backdrop-blur-xl border border-[var(--color-border-card)] p-1.5 rounded-full shadow-lg flex items-center transition-all focus-within:ring-2 focus-within:ring-blue-500/50 hover:bg-[var(--color-bg-main)]">
          <input 
            type="text" 
            [(ngModel)]="inputText"
            (keydown.enter)="sendMessage()"
            (focus)="onFocus()"
            (blur)="onBlur()"
            placeholder="Type a message..."
            class="flex-1 bg-transparent border-none outline-none text-[13px] px-3 text-[var(--color-text-main)] placeholder-[var(--color-text-muted)]"
            maxlength="50"
          />
          <button 
            (click)="sendMessage()"
            [disabled]="!inputText.trim()"
            class="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500 text-white transition-all hover:bg-blue-400 active:scale-90 disabled:opacity-50 disabled:bg-gray-500 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>

      </div>
    }
  `,
  styles: [`
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `]
})
export class RoomChatComponent {
  ws = inject(WebSocketService);
  audio = inject(AudioService);
  
  messages = signal<ChatMessage[]>([]);
  inputText = '';
  private msgIdCounter = 0;
  private isInputFocused = false;

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  get myPlayerId() {
    return this.ws.gameState()?.players?.find((p: any) => p.isMe)?.id || 'Me';
  }

  get visibleMessages() {
    return this.messages;
  }

  constructor() {
    effect(() => {
      const event = this.ws.roomChatReceivedEvent();
      if (event) {
        this.addMessage(event.senderId, event.text);
      }
    });
  }

  onFocus() {
    this.isInputFocused = true;
  }

  onBlur() {
    this.isInputFocused = false;
  }

  sendMessage() {
    const text = this.inputText.trim();
    if (text) {
      this.ws.sendRoomChat(text);
      this.inputText = '';
      this.audio.playClick();
    }
  }

  private addMessage(senderId: string, text: string) {
    const msg: ChatMessage = {
      id: ++this.msgIdCounter,
      senderId,
      text,
      timestamp: Date.now(),
      fading: false
    };

    this.messages.update(m => [...m, msg].slice(-20)); // keep last 20

    // Auto scroll to bottom
    setTimeout(() => {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    }, 50);

    // Fade out after 10 seconds if not focused
    setTimeout(() => {
      this.messages.update(msgs => 
        msgs.map(m => m.id === msg.id ? { ...m, fading: true } : m)
      );
      
      // Remove from array shortly after fade transition
      setTimeout(() => {
        this.messages.update(msgs => msgs.filter(m => m.id !== msg.id));
      }, 300);
    }, 10000);
  }
}
