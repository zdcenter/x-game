import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AudioService } from '../../../core/services/audio.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-game-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './game-header.component.html',
})
export class GameHeaderComponent implements OnInit {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() iconGradientClass: string = 'from-blue-500 to-emerald-500';
  @Input() titleGradientClass: string = 'from-blue-400 to-emerald-400';
  @Input() shadowClass: string = 'shadow-emerald-500/20';
  @Input() headerBgClass: string = 'bg-gradient-to-r from-blue-900/30 to-emerald-900/30';
  @Input() gameId?: string;
  @Input() showRulesBtn: boolean = true;
  
  @Output() back = new EventEmitter<void>();
  @Output() rules = new EventEmitter<void>();
  @Output() titleClick = new EventEmitter<void>();

  audioService = inject(AudioService);

  i18n = inject(I18nService);
  router = inject(Router);

  ngOnInit() {
    if (!this.gameId) {
      const match = this.router.url.match(/\/games\/([^?\/]+)/);
      if (match) {
        this.gameId = match[1];
      }
    }
  }


}
