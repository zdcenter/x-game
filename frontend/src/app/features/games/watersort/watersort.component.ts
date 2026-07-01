import { GameDifficulty, GameId, GameMode, GameStatus } from '../../../core/models/game.model';
import { storageGet, storageSet } from '../../../core/utils/browser.util';
import { Component, inject, OnInit, OnDestroy, signal, ViewChild, ViewChildren, ElementRef, QueryList, effect, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { setupRoomLifecycle } from '../../../core/services/room-lifecycle';
import { WatersortStore } from './store/watersort.store';
import { TubeComponent } from './components/tube/tube.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { GameTimerService } from '../../../core/services/game-timer.service';
import { HintButtonComponent } from '../../../shared/components/hint-button/hint-button.component';
import { ToastService } from '../../../core/services/toast.service';
import { AudioService } from '../../../core/services/audio.service';
import { TutorialOverlayComponent } from '../../../shared/components/tutorial-overlay/tutorial-overlay.component';
import { TutorialService } from '../../../core/services/tutorial.service';
import { GamePlayerMiniHudComponent } from '../../../shared/components/game-player-mini-hud/game-player-mini-hud.component';

@Component({
  selector: 'app-watersort',
  standalone: true,
  imports: [
    CommonModule, TubeComponent, GameStartingOverlayComponent,
    GameWaitingRoomComponent, GameLobbyPanelComponent, GameRulesModalComponent,
    GameResultOverlayComponent, GameHeaderComponent, PlayerBadgeComponent,
    HintButtonComponent, TutorialOverlayComponent, GamePlayerMiniHudComponent, FormsModule
  ],
  templateUrl: './watersort.component.html',
  styles: [`
    .is-receiving {
      animation: pour-vibrate 0.1s linear infinite;
    }
    ::ng-deep .is-receiving .liquid-layer:first-child {
      animation: liquid-wave 0.15s infinite alternate;
      transform-origin: bottom;
    }
    @keyframes pour-vibrate {
      0% { transform: translate(0, 0); }
      25% { transform: translate(-0.5px, 0.5px); }
      50% { transform: translate(0.5px, -0.5px); }
      75% { transform: translate(0.5px, 0.5px); }
      100% { transform: translate(0, 0); }
    }
    @keyframes liquid-wave {
      0% { transform: scaleY(1); }
      100% { transform: scaleY(1.05); filter: brightness(1.2); }
    }
  `]
})
export class WatersortComponent extends BaseGameComponent implements OnInit, OnDestroy {
  GameMode = GameMode;
  GameStatus = GameStatus;
  GameDifficulty = GameDifficulty;
@ViewChild('lobbyPanel') lobbyPanel!: GameLobbyPanelComponent;
  @ViewChildren('tubeElements', { read: ElementRef }) tubeElements!: QueryList<ElementRef>;
  public i18n = inject(I18nService);
  public _store = inject(WatersortStore);
  private authStore = inject(AuthStore);
  public timerService = inject(GameTimerService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private audioService = inject(AudioService);
  private tutorialService = inject(TutorialService);

  showRules = signal(false);
  showOverlay = signal(false);
  showTutorial = signal(false);
  tutorialSteps = this.tutorialService.getStepsForGame(GameId.WaterSort);

  get store() { return this._store; }
  override get playerId() { return this.authStore.currentUser()?.username || this.authStore.guestId; }
  
  private cdr = inject(ChangeDetectorRef);

  pouringState: {
    from: number,
    to: number,
    color: string,
    step: 'flying' | 'pouring' | 'returning',
    deltaX: number,
    deltaY: number,
    angle: number,
    streamX: number,
    streamY: number,
    streamHeight: number
  } | null = null;
  
  private roomLifecycle = setupRoomLifecycle({
    gameId: 'watersort',
    getCurrentMode: () => this._store.currentRoomMode(),
    onLeaveRoom: () => {
      this._store.leaveRoom();
      this.roomLifecycle.clearReconnectInfo();
    },
  });

  selectedTubeIndex: number | null = null;

  get status() { return this._store.status(); }
  get myId() { return this.playerId; }
  
  currentRoomMode() { return this._store.currentRoomMode(); }
  currentRoomId() { return this._store.roomId(); }
  currentDifficulty() { return this._store.currentDifficulty(); }

  constructor() {
    super();
    effect((onCleanup) => {
      const status = this._store.status();
      if (status === GameStatus.Starting) {
        this.gameTimer.startCountdown();
      } else {
        this.gameTimer.stopCountdown();
      }

      if (status === GameStatus.Finished) {
        const timer = setTimeout(() => this.showOverlay.set(true), 1500);
        onCleanup(() => clearTimeout(timer));
      } else {
        this.showOverlay.set(false);
      }
    });
  }

  override ngOnInit() {
    super.ngOnInit();
    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      if (pending.password) this.wsService.setPendingPassword(pending.password);
      this._store.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host || '', pending.target ?? 1);
      if (pending.mode !== GameMode.Single) {
        this.roomLifecycle.saveReconnectInfo(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
      }
    } else {
      const savedDiff = storageGet('watersort_single_diff') || 'easy';
      const uniqueLocalRoom = 'local_' + this.myId;
      this._store.joinRoom(uniqueLocalRoom, GameMode.Single, savedDiff, this.myId);
      if (!this.tutorialService.hasSeen(GameId.WaterSort) && this.tutorialSteps.length) {
        setTimeout(() => this.showTutorial.set(true), 600);
      }
    }
  }

  onTutorialDone(): void {
    this.tutorialService.markSeen(GameId.WaterSort);
    this.showTutorial.set(false);
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this._store.leaveRoom();
  }

  isDifficultyModalOpen = signal(false);
  selectedDifficulty = signal<string>(GameDifficulty.Easy);
  isBlindMode = signal(false);
  predefinedDifficulties = [
    { id: 'easy', labelKey: 'game.diff_watersort_easy', desc: '7 Tubes (5 Colors)' },
    { id: GameDifficulty.Medium, labelKey: 'game.diff_watersort_medium', desc: '11 Tubes (9 Colors)' },
    { id: GameDifficulty.Hard, labelKey: 'game.diff_watersort_hard', desc: '16 Tubes (14 Colors)' }
  ];

  openDifficultySettings() {
    this.selectedDifficulty.set(this._store.currentDifficulty() || 'easy');
    this.isDifficultyModalOpen.set(true);
  }

  changeSingleDifficulty(diff: string) {
    storageSet('watersort_single_diff', diff);
    this._store.leaveRoom();
    setTimeout(() => {
      const uniqueLocalRoom = 'local_' + this.myId + '_' + Date.now();
      this.wsService.setPendingAction('create');
      this._store.joinRoom(uniqueLocalRoom, GameMode.Single, diff, this.myId);
    }, 100);
  }

  toggleBlindMode(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.isBlindMode.set(checked);
  }

  getDifficultyText(diff: string) {
    return this.i18n.t(`game.diff_watersort_${diff}`)();
  }

  isTubeCompleted(colors: string[]): boolean {
    return colors.length === 4 && colors.every(c => c === colors[0]);
  }

  isHost(): boolean {
    return this._store.hostId() === this.myId;
  }

  playersList(): any[] {
    return this._store.playersList() as any[];
  }

  myTubes() {
    const player = this._store.players()[this.myId];
    return player ? player.tubes : [];
  }

  myMoves() {
    const player = this._store.players()[this.myId];
    return player ? player.moves : 0;
  }

  opponentId(): string | null {
    const players = this.playersList();
    const opp = players.find((p: any) => p.id !== this.myId);
    return opp ? opp.id : null;
  }

  opponentTubes() {
    const oppId = this.opponentId();
    if (!oppId) return [];
    const player = this._store.players()[oppId];
    return player ? player.tubes : [];
  }

  opponentMoves() {
    const oppId = this.opponentId();
    if (!oppId) return 0;
    const player = this._store.players()[oppId];
    return player ? player.moves : 0;
  }

  didIWin(): boolean {
    return this._store.winners().includes(this.myId);
  }

  isValidPour(from: number, to: number): boolean {
    const fromTube = this.myTubes()[from];
    const toTube = this.myTubes()[to];
    if (from === to || fromTube.colors.length === 0 || toTube.colors.length === 4) return false;
    if (toTube.colors.length === 0) return true;
    return fromTube.colors[fromTube.colors.length - 1] === toTube.colors[toTube.colors.length - 1];
  }

  getTubeTransform(index: number): string {
    if (this.pouringState?.from === index) {
      if (this.pouringState.step !== 'returning') {
        return `translate(${this.pouringState.deltaX}px, ${this.pouringState.deltaY}px) rotate(${this.pouringState.angle}deg)`;
      } else {
        return `translate(0px, 0px) rotate(0deg)`;
      }
    }
    return '';
  }

  getTubeZIndex(index: number): number {
    if (this.pouringState?.from === index) return 50;
    if (this.pouringState?.to === index) return 20;
    return 10;
  }

  triggerPourAnimation(fromIndex: number, toIndex: number) {
    if (this.pouringState) return; // Wait for current animation to finish

    const fromEl = this.tubeElements.get(fromIndex)?.nativeElement;
    const toEl = this.tubeElements.get(toIndex)?.nativeElement;
    if (fromEl && toEl) {
      const fromWrapper = fromEl.querySelector('.tube-wrapper') || fromEl;
      const toWrapper = toEl.querySelector('.tube-wrapper') || toEl;

      const fromRect = fromWrapper.getBoundingClientRect();
      const toRect = toWrapper.getBoundingClientRect();
      
      const fromTube = this.myTubes()[fromIndex];
      const color = fromTube.colors[fromTube.colors.length - 1];

      const w = fromRect.width;
      const h = fromRect.height;
      const C0_x = fromRect.left + w / 2;
      const C0_y = fromRect.top + h / 2;

      const deltaX = toRect.left - fromRect.left;
      const isRight = deltaX >= 0;
      
      const angleDeg = isRight ? 105 : -105;
      const a = angleDeg * Math.PI / 180;

      // Target mouth position
      const M_target_x = toRect.left + toRect.width / 2;
      const M_target_y = toRect.top - 15;

      // The pouring point is the lower corner of the tilted mouth
      const cornerX = isRight ? w / 2 : -w / 2;
      const cornerY = -h / 2;

      const rotX = cornerX * Math.cos(a) - cornerY * Math.sin(a);
      const rotY = cornerX * Math.sin(a) + cornerY * Math.cos(a);

      const C1_x = M_target_x - rotX;
      const C1_y = M_target_y - rotY;

      const tx = C1_x - C0_x;
      const ty = C1_y - C0_y;

      const toTube = this.myTubes()[toIndex];
      
      // Calculate how many layers will be poured
      let pourCount = 0;
      for (let i = fromTube.colors.length - 1; i >= 0; i--) {
        if (fromTube.colors[i] === color) pourCount++;
        else break;
      }
      const availableSpace = 4 - toTube.colors.length;
      pourCount = Math.min(pourCount, availableSpace);

      // Target tube's empty space fraction AFTER pouring
      const newLen = toTube.colors.length + pourCount;
      const emptyRatio = (4 - newLen) / 4;
      
      // Precise calculation: the liquid container has 8px top margin and 4px bottom margin.
      // Tube inner height is toRect.height - 12.
      // Stream starts 15px above the tube top, so it travels 15 + 8 + empty space + 10px (to penetrate surface slightly)
      const streamLen = 33 + ((toRect.height - 12) * emptyRatio);

      this.pouringState = {
        from: fromIndex,
        to: toIndex,
        color: color,
        step: 'flying',
        deltaX: tx,
        deltaY: ty,
        angle: angleDeg,
        streamX: M_target_x,
        streamY: M_target_y,
        streamHeight: streamLen
      };

      // Step 2: pouring
      setTimeout(() => {
        if (this.pouringState) this.pouringState.step = 'pouring';
        this.cdr.markForCheck();
        
        this.audioService.playWaterSort('pour');

        // Trigger actual state change so liquid level changes
        this._store.pour(fromIndex, toIndex);

        // Step 3: returning
        setTimeout(() => {
          if (this.pouringState) this.pouringState.step = 'returning';
          this.cdr.markForCheck();
          
          // Step 4: done
          setTimeout(() => {
            if (this.pouringState?.step === 'returning') {
              const toTube = this.myTubes()[toIndex];
              if (toTube && toTube.colors.length === 4 && toTube.colors.every((c: string) => c === toTube.colors[0])) {
                this.audioService.playWaterSort('bottle_full');
              }
              this.pouringState = null;
              this.cdr.markForCheck();
            }
          }, 300);
        }, 350); // Pouring duration
      }, 300); // Flying duration
    }
  }

  onTubeClick(index: number) {
    if (this.status !== GameStatus.Playing) return;
    if (this.pouringState) return; // Prevent clicking while animating
    
    if (this.selectedTubeIndex === null) {
      const tube = this.myTubes()[index];
      if (tube && tube.colors.length > 0) {
        this.selectedTubeIndex = index;
        this.audioService.playWaterSort('clink');
      }
    } else {
      if (this.selectedTubeIndex !== index) {
        if (this.isValidPour(this.selectedTubeIndex, index)) {
          this.triggerPourAnimation(this.selectedTubeIndex, index);
        } else {
          this.audioService.playWaterSort('clink'); // Play clink on deselect/invalid target
        }
      } else {
        this.audioService.playWaterSort('clink'); // Play clink on deselecting same tube
      }
      this.selectedTubeIndex = null;
    }
  }

  applyHint() {
    if (this.status !== GameStatus.Playing) return;
    const myTubes = this.myTubes();
    let bestMove: { from: number, to: number } | null = null;
    let fallbackMove: { from: number, to: number } | null = null;

    for (let i = 0; i < myTubes.length; i++) {
      const source = myTubes[i];
      if (source.colors.length === 0) continue;
      
      const isSolid = source.colors.every((c: string) => c === source.colors[0]);
      if (isSolid && source.colors.length === 4) continue;

      const topColor = source.colors[source.colors.length - 1];

      for (let j = 0; j < myTubes.length; j++) {
        if (i === j) continue;
        const target = myTubes[j];
        if (target.colors.length === 4) continue;

        if (target.colors.length === 0) {
          if (!isSolid) {
            fallbackMove = { from: i, to: j };
          }
        } else {
          const targetTop = target.colors[target.colors.length - 1];
          if (topColor === targetTop) {
            bestMove = { from: i, to: j };
            break;
          }
        }
      }
      if (bestMove) break;
    }

    const move = bestMove || fallbackMove;
    if (move) {
      this.triggerPourAnimation(move.from, move.to);
      // this._store.pour(move.from, move.to); // Handled in triggerPourAnimation
    } else {
      // Use friendly toast instead of native alert
      const msg = this.i18n.t('game.no_solution')() || 'No moves available!';
      this.toastService.show(msg, 'error');
      
      // Auto restart after a short delay
      setTimeout(() => {
        this._store.restart();
        this.selectedTubeIndex = null;
      }, 2000);
    }
  }

  restart() {
    if (confirm(this.i18n.t('watersort.restart_confirm')())) {
      this._store.restart();
      this.selectedTubeIndex = null;
    }
  }

  playAgain() {
    this.selectedTubeIndex = null;
    this.pouringState = null;
    this._store.restartGame();
  }

  returnToLobby() {
    this._store.leaveRoom();
    this.roomLifecycle.clearReconnectInfo();
    const uniqueLocalRoom = 'local_' + this.myId;
    this._store.joinRoom(uniqueLocalRoom, GameMode.Single, GameDifficulty.Easy, this.myId);
  }

  goBack() {
    if (this.currentRoomMode() !== GameMode.Single) {
      this._store.leaveRoom();
    }
    this.navigateToLobby();
  }

  override handleCreateRoom(config: {name: string, mode: string, difficulty: string, password?: string}): void {
    super.handleCreateRoom(config);
    if (config.password) this.wsService.setPendingPassword(config.password);
    this._store.joinRoom(config.name, config.mode, config.difficulty, this.myId);
    if (config.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(config.name, config.mode, config.difficulty);
    }
    this.isMobileSidebarOpen.set(false);
  }

  override handleJoinRoom(event: {roomId: string, mode: string, difficulty: string, host: string, password?: string}): void {
    super.handleJoinRoom(event);
    if (event.password) this.wsService.setPendingPassword(event.password);
    this._store.joinRoom(event.roomId, event.mode, event.difficulty, event.host);
    if (event.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(event.roomId, event.mode, event.difficulty, event.host);
    }
    this.isMobileSidebarOpen.set(false);
  }

  override handleDismissRoom(): void {
    super.handleDismissRoom();
    this.roomLifecycle.clearReconnectInfo();
  }

  override openChangeSettings() {
    this.navigateToPkArena();
  }

  dismissRoom() {
    this._store.dismissRoom();
  }

  getSubtitle(): string {
    return this.currentRoomMode() === 'same_pk_speed' ? this.i18n.t('game.speed_mode')() : this.i18n.t('game.mode_single_player')();
  }


}
