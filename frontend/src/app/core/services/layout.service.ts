import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private scrollToTopSubject = new Subject<void>();
  scrollToTop$ = this.scrollToTopSubject.asObservable();

  /** Tracks whether the active route/game is requesting full-screen immersive presentation */
  readonly isImmersiveGame = signal<boolean>(false);

  scrollToTop() {
    this.scrollToTopSubject.next();
  }

  setImmersiveGame(active: boolean) {
    this.isImmersiveGame.set(active);
  }
}
