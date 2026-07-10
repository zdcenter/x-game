import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { Component, Input, computed, inject, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { EmojiPickerComponent } from '../emoji-picker/emoji-picker.component';

@Component({
  selector: 'app-player-badge',
  standalone: true,
  imports: [CommonModule, EmojiPickerComponent],
  templateUrl: './player-badge.component.html',
  styleUrls: ['./player-badge.component.css'],
  host: {
    'class': 'relative block'
  }
})
export class PlayerBadgeComponent implements OnInit, OnDestroy {
  GameStatus = GameStatus;
  i18n = inject(I18nService);
  private ws = inject(WebSocketService);

  @Input() layout: 'card' | 'bar' | 'mini' = 'card';
  @Input({ required: true }) playerName!: string;
  @Input() isHost: boolean = false;
  @Input() isMe: boolean = false;
  @Input() score?: number;
  @Input() stats?: { icon?: string, value: string | number, label?: string, colorClass?: string }[];
  @Input() progress?: { current: number, total: number };
  @Input() subText?: string;
  @Input() status?: 'playing' | 'frozen' | 'finished' | 'spectating' | string = GameStatus.Playing;
  @Input() freezeCountdown?: number;

  get avatarChar(): string {
    return this.playerName ? this.playerName.charAt(0).toUpperCase() : '?';
  }

  get progressPercent(): number {
    if (!this.progress || this.progress.total === 0) return 0;
    return Math.min(100, Math.max(0, (this.progress.current / this.progress.total) * 100));
  }

  get filteredStats() {
    return (this.stats || []).filter(s => !!s);
  }

  isSpectating(): boolean {
    return this.status === 'spectating';
  }

  activeEmoji = signal<{ emoji: string, id: number } | null>(null);
  private emojiIdCounter = 0;
  private emojiTimeout: any;

  constructor() {
    effect(() => {
      const event = this.ws.emojiReceivedEvent();
      if (event && event.senderId === this.playerName) {
        this.showEmoji(event.emoji);
      }
    });
  }

  ngOnInit() {}

  ngOnDestroy() {
    if (this.emojiTimeout) clearTimeout(this.emojiTimeout);
  }

  showEmoji(emoji: string) {
    if (this.emojiTimeout) clearTimeout(this.emojiTimeout);
    this.activeEmoji.set({ emoji, id: ++this.emojiIdCounter });
    
    this.emojiTimeout = setTimeout(() => {
      // Only clear if it hasn't been overwritten
      if (this.activeEmoji()?.id === this.emojiIdCounter) {
        this.activeEmoji.set(null);
      }
    }, 2500);
  }

  onEmojiSelected(emoji: string) {
    this.ws.sendEmoji(emoji);
    this.showEmoji(emoji); // Show it instantly for ourselves
  }
}
