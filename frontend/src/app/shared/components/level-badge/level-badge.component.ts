import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { XpService } from '../../../core/services/xp.service';

@Component({
  selector: 'app-level-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black border shadow-sm"
      [class]="colorClass()"
    >
      <span class="text-[10px] opacity-70">Lv</span>
      <span>{{ level }}</span>
    </div>
  `
})
export class LevelBadgeComponent {
  @Input() level = 1;

  private xpService = inject(XpService);

  colorClass = computed(() => this.xpService.levelColor(this.level));
}
