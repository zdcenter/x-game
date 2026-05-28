import { Injectable, signal, inject } from '@angular/core';
import { AudioService } from './audio.service';

@Injectable({ providedIn: 'root' })
export class GameTimerService {
  private audioService = inject(AudioService);
  
  countdownDisplay = signal<string>('3');
  private countdownInterval: any;

  startCountdown() {
    this.stopCountdown();
    this.audioService.playClick();
    let secondsLeft = 3;
    this.countdownDisplay.set(secondsLeft.toString());
    
    this.countdownInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        this.countdownDisplay.set('GO!');
        this.audioService.playFlag();
        this.stopCountdown();
      } else {
        this.countdownDisplay.set(secondsLeft.toString());
        this.audioService.playClick();
      }
    }, 1000);
  }

  stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
