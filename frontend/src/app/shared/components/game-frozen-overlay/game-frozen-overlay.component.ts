import { Component, Input, OnInit, OnDestroy, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameTimerService } from '../../../core/services/game-timer.service';
import { AdService } from '../../../core/services/ad.service';
import { AdsenseComponent } from '../adsense/adsense.component';

@Component({
  selector: 'app-game-frozen-overlay',
  standalone: true,
  imports: [CommonModule, AdsenseComponent],
  templateUrl: './game-frozen-overlay.component.html'
})
export class GameFrozenOverlayComponent implements OnInit, OnDestroy {
  @Input({ required: true }) set cooldownUntil(val: number) {
    this._cooldownUntil.set(val);
  }
  @Input() messageKey: string = 'game.frozen_msg';
  @Input() containerClass: string = 'absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-900/40 backdrop-blur-sm rounded-2xl pointer-events-none';

  private _cooldownUntil = signal<number>(0);
  frozenRemaining = signal<number>(0);
  isFrozen = signal<boolean>(false);
  
  private intervalId: any;
  
  i18n = inject(I18nService);
  gameTimer = inject(GameTimerService);
  adService = inject(AdService);

  constructor() {
    effect(() => {
      const until = this._cooldownUntil();
      if (until > Date.now()) {
        this.isFrozen.set(true);
        this.updateRemaining(until);
        this.startTimer(until);
      } else {
        this.isFrozen.set(false);
        this.stopTimer();
      }
    });
  }

  ngOnInit() {}

  private startTimer(until: number) {
    this.stopTimer();
    this.intervalId = setInterval(() => {
      this.updateRemaining(until);
      if (Date.now() >= until) {
        this.isFrozen.set(false);
        this.stopTimer();
      }
    }, 100); // 100ms for smooth update
  }

  private updateRemaining(until: number) {
    const remMs = Math.max(0, until - Date.now());
    this.frozenRemaining.set(Math.ceil(remMs / 1000));
  }

  private stopTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  ngOnDestroy() {
    this.stopTimer();
  }
}
