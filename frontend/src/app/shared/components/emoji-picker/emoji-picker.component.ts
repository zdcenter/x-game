import { Component, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-emoji-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Trigger Button -->
    <button 
      (click)="togglePicker($event)"
      class="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-[var(--color-bg-card)] border-2 border-[var(--color-border-card)] shadow-lg hover:bg-[var(--color-bg-main)] transition-colors hover:scale-110 active:scale-95"
      title="Send Emoji / Taunt">
      <span class="text-sm md:text-base leading-none drop-shadow-sm">💬</span>
    </button>

    <!-- Modal Overlay -->
    <div *ngIf="isOpen" 
         class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40"
         style="backdrop-filter: blur(4px);"
         (click)="closePicker($event)">
      
      <!-- Modal Content -->
      <div class="p-4 md:p-5 bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-3xl shadow-2xl flex flex-col gap-4 w-[320px] max-w-[90vw] animate-in fade-in zoom-in-95 duration-200"
           (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-2 border-b border-[var(--color-border-card)]/50">
          <h3 class="text-sm md:text-base font-black text-[var(--color-text-main)] tracking-wider">互动与嘲讽 (Social)</h3>
          <button (click)="closePicker($event)" class="text-[var(--color-text-muted)] hover:text-red-400 p-1 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Emojis Section -->
        <div>
          <div class="text-[11px] text-[var(--color-text-muted)] w-full font-bold mb-2 uppercase tracking-widest pl-1">快捷表情</div>
          <div class="grid grid-cols-4 gap-2">
            <button *ngFor="let emoji of emojis" 
                    (click)="select(emoji)"
                    class="h-12 flex items-center justify-center text-3xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)]/30 hover:bg-[var(--color-bg-main)] rounded-2xl transition-all hover:scale-110 hover:shadow-lg active:scale-95">
              {{ emoji }}
            </button>
          </div>
        </div>

        <!-- Taunts Section -->
        <div>
          <div class="text-[11px] text-[var(--color-text-muted)] w-full font-bold mb-2 uppercase tracking-widest pl-1">快捷嘲讽</div>
          <div class="flex flex-col gap-2">
            <button *ngFor="let taunt of taunts"
                    (click)="select(taunt)"
                    class="w-full text-left px-4 py-2.5 text-sm md:text-base font-bold text-[var(--color-text-main)] bg-[var(--color-bg-card)] border border-[var(--color-border-card)]/30 hover:bg-[var(--color-bg-main)] hover:text-blue-400 rounded-xl transition-all shadow-sm hover:shadow active:scale-95 whitespace-nowrap overflow-hidden text-ellipsis">
              {{ taunt }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EmojiPickerComponent {
  @Output() selected = new EventEmitter<string>();
  
  isOpen = false;
  
  emojis = ['😂', '😭', '😡', '😎', '🤯', '👏', '👎', '👀'];
  taunts = ['太慢了吧！(Too slow!)', '干得漂亮！(Nice move!)', '哎呀手滑了 (Oops!)', '承让承让 (GG!)', '快点啊！(Hurry up!)'];

  togglePicker(event: Event) {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  closePicker(event: Event) {
    event.stopPropagation();
    this.isOpen = false;
  }

  select(item: string) {
    this.selected.emit(item);
    this.isOpen = false;
  }
}
