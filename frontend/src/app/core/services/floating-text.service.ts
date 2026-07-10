import { Injectable, signal } from '@angular/core';

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

@Injectable({
  providedIn: 'root'
})
export class FloatingTextService {
  private _texts = signal<FloatingText[]>([]);
  public readonly texts = this._texts.asReadonly();
  
  private nextId = 0;

  show(text: string, x: number, y: number, options?: { color?: string, size?: 'sm'|'md'|'lg'|'xl' }) {
    const id = this.nextId++;
    const newText: FloatingText = {
      id,
      text,
      x,
      y,
      color: options?.color || '#fbbf24', // Default amber
      size: options?.size || 'md'
    };

    this._texts.update(texts => [...texts, newText]);

    // Remove text after animation completes (usually 1.5s)
    setTimeout(() => {
      this._texts.update(texts => texts.filter(t => t.id !== id));
    }, 1500);
  }
}
