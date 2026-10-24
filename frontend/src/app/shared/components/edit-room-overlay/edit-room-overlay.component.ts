import {
  Component, Input, Output, EventEmitter, inject, signal, computed,
  OnChanges, SimpleChanges, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { SettingsService } from '../../../core/services/settings.service';
import { GameMode } from '../../../core/models/game.model';
import { CoinService } from '../../../core/services/coin.service';
import { CoinGuideService } from '../../../core/services/coin-guide.service';
import { ToastService } from '../../../core/services/toast.service';
import { CoinIconComponent } from '../coin-icon/coin-icon.component';

export interface EditRoomConfig {
  gameId: string;
  mode: string;
  difficulty: string;
  target: number;
  bountyCoins?: number;
}

@Component({
  selector: 'app-edit-room-overlay',
  standalone: true,
  imports: [CommonModule, CoinIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './edit-room-overlay.component.html',
})
export class EditRoomOverlayComponent implements OnChanges {
  private i18n     = inject(I18nService);
  private reg      = inject(GameRegistryService);
  private settings = inject(SettingsService);
  readonly coinService = inject(CoinService);
  readonly coinGuideService = inject(CoinGuideService);
  private toast    = inject(ToastService);

  @Input() isOpen      = false;
  @Input() gameId      = '';
  @Input() mode        = '';
  @Input() difficulty  = '';
  @Input() target      = 1;
  @Input() bountyCoins = 0;

  @Output() apply  = new EventEmitter<EditRoomConfig>();
  @Output() closed = new EventEmitter<void>();

  step           = signal<'game' | 'settings'>('game');
  editGameId     = signal('');
  editMode       = signal('');
  editDifficulty = signal('');
  editTarget     = signal(1);
  editBounty     = signal(0);
  readonly bountyOptions = [0, 50, 100, 200];

  readonly isBountyInsufficient = computed(() => {
    const bounty = this.editBounty();
    return bounty > 0 && this.coinService.coins() < bounty;
  });

  readonly bountyShortage = computed(() => {
    const bounty = this.editBounty();
    const current = this.coinService.coins();
    return bounty > current ? bounty - current : 0;
  });

  selectBounty(b: number) {
    this.editBounty.set(b);
    if (b > 0 && this.coinService.coins() < b) {
      const shortage = b - this.coinService.coins();
      const msg = this.t('game.bounty_insufficient_inline')
        .replace('{current}', this.coinService.coins().toString())
        .replace('{needed}', shortage.toString())
        .replace('{cost}', b.toString());
      this.toast.show(msg, 'info');
    }
  }

  allGames = computed(() => this.reg.getAllConfigs());

  availableModes = computed(() => {
    const cfg = this.reg.getConfig(this.editGameId());
    if (!cfg) return [];
    return cfg.modes.filter(m => m.id !== GameMode.Single);
  });

  availableDifficulties = computed(() =>
    this.reg.getConfig(this.editGameId())?.difficulties || []
  );

  isMultiRoundEnabled = computed(() => {
    if (this.settings.settings().pk_multi_round_enabled === 'false') return false;
    return this.reg.getConfig(this.editGameId())?.multiRound === true;
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']?.currentValue === true) {
      this.editGameId.set(this.gameId || '');
      const modes = this.availableModes();
      const validMode = modes.some(m => m.id === this.mode) ? (this.mode || '') : (modes[0]?.id || '');
      this.editMode.set(validMode);
      this.editDifficulty.set(this.difficulty || '');
      this.editTarget.set(this.target || 1);
      this.editBounty.set(this.bountyCoins || 0);
      // 有当前游戏直接进步骤2，否则从选游戏开始
      this.step.set(this.gameId ? 'settings' : 'game');
    }
  }

  t(key: string): string { return this.i18n.t(key)(); }

  pickGame(id: string) {
    this.editGameId.set(id);
    const modes = this.availableModes();
    this.editMode.set(modes[0]?.id || '');
    const diffs = this.availableDifficulties();
    this.editDifficulty.set(diffs[0]?.id || '');
    this.step.set('settings');
  }

  onConfirm() {
    this.apply.emit({
      gameId:      this.editGameId(),
      mode:        this.editMode(),
      difficulty:  this.editDifficulty(),
      target:      this.editTarget(),
      bountyCoins: this.editBounty(),
    });
  }
}
