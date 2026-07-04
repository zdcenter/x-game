import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Router } from '@angular/router';
import { ShareService } from '../../../core/services/share.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { getOrigin } from '../../../core/utils/browser.util';
import { HintButtonComponent } from '../hint-button/hint-button.component';

@Component({
  selector: 'app-game-toolbar',
  standalone: true,
  imports: [CommonModule, HintButtonComponent],
  templateUrl: './game-toolbar.component.html'
})
export class GameToolbarComponent {
  i18n = inject(I18nService);
  shareService = inject(ShareService);
  router = inject(Router);
  registry = inject(GameRegistryService);

  @Input() showPrev: boolean = true;
  @Input() showNext: boolean = true;
  @Input() showRestart: boolean = true;
  @Input() showUndo: boolean = false;
  @Input() showHint: boolean = true;
  @Input() showBack: boolean = false;
  @Input() showShare: boolean = true;
  
  @Input() gameId?: string;
  
  @Input() disablePrev: boolean = false;
  @Input() disableNext: boolean = false;
  @Input() disableUndo: boolean = false;
  
  @Input() hintLayout: 'compact' | 'math24' | 'sudoku' | 'minesweeper' | 'icon' | 'text' | 'sokoban' = 'sudoku';
  @Input() layoutStyle: 'default' | 'compact' = 'default';

  @Output() prevLevel = new EventEmitter<void>();
  @Output() nextLevel = new EventEmitter<void>();
  @Output() restart = new EventEmitter<void>();
  @Output() undo = new EventEmitter<void>();
  @Output() hintApplied = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  ngOnInit() {
    if (!this.gameId) {
      const match = this.router.url.match(/\/games\/([^?\/]+)/);
      if (match) {
        this.gameId = match[1];
      }
    }
  }

  shareGame() {
    if (!this.gameId) return;
    const url = `${getOrigin()}/games/${this.gameId}`;
    const descKey = `lobby.${this.gameId}.desc`;
    const desc = this.i18n.t(descKey)() || '';
    const config = this.registry.getConfig(this.gameId);
    const title = config?.titleKey ? this.i18n.t(config.titleKey as any)() : this.gameId;
    
    this.shareService.share({
      title: `${title} - Puzzle PK`,
      text: `${this.i18n.t('share.game_invite')() || 'Play this awesome game with me!'} ${title}\n${desc}`,
      url: url
    });
  }
}
