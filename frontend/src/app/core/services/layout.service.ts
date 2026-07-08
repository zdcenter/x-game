import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private scrollToTopSubject = new Subject<void>();
  scrollToTop$ = this.scrollToTopSubject.asObservable();

  scrollToTop() {
    this.scrollToTopSubject.next();
  }
}
