import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { HintButtonComponent } from '../hint-button/hint-button.component';

@Component({
  selector: 'app-game-toolbar',
  standalone: true,
  imports: [CommonModule, HintButtonComponent],
  templateUrl: './game-toolbar.component.html'
})
export class GameToolbarComponent {
  i18n = inject(I18nService);

  @Input() showPrev: boolean = true;
  @Input() showNext: boolean = true;
  @Input() showRestart: boolean = true;
  @Input() showUndo: boolean = false;
  @Input() showHint: boolean = true;
  @Input() showBack: boolean = false;
  
  @Input() disablePrev: boolean = false;
  @Input() disableNext: boolean = false;
  @Input() disableUndo: boolean = false;
  
  @Input() hintLayout: 'compact' | 'math24' | 'sudoku' | 'minesweeper' | 'icon' | 'text' | 'sokoban' = 'icon';
  @Input() layoutStyle: 'default' | 'compact' = 'default';

  @Output() prevLevel = new EventEmitter<void>();
  @Output() nextLevel = new EventEmitter<void>();
  @Output() restart = new EventEmitter<void>();
  @Output() undo = new EventEmitter<void>();
  @Output() hintApplied = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
}
