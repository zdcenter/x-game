import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore, User } from '../auth/auth.store';

export interface ShopItem {
  id: string;
  type: 'frame' | 'title';
  name_key: string;
  desc_key: string;
  price: number;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  equipped: boolean;
  unlock_hint?: string;
}

export interface ShopResponse {
  brain_coins: number;
  equipped_frame: string;
  equipped_title: string;
  frames: ShopItem[];
  titles: ShopItem[];
}

@Injectable({ providedIn: 'root' })
export class ShopService {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);
  private apiUrl = environment.apiUrl;

  catalogData = signal<ShopResponse | null>(null);

  getCatalog(): Observable<ShopResponse> {
    return this.http.get<ShopResponse>(`${this.apiUrl}/shop/items`).pipe(
      tap(res => this.catalogData.set(res))
    );
  }

  buyItem(itemId: string, itemType: 'frame' | 'title'): Observable<{ success: boolean; user: User }> {
    return this.http.post<{ success: boolean; user: User }>(`${this.apiUrl}/shop/buy`, {
      item_id: itemId,
      item_type: itemType,
    }).pipe(
      tap(res => {
        if (res.user) {
          this.authStore.updateUser(res.user);
        }
        // Refresh catalog
        this.getCatalog().subscribe();
      })
    );
  }

  equipItem(itemId: string, itemType: 'frame' | 'title'): Observable<{ success: boolean; user: User }> {
    return this.http.post<{ success: boolean; user: User }>(`${this.apiUrl}/shop/equip`, {
      item_id: itemId,
      item_type: itemType,
    }).pipe(
      tap(res => {
        if (res.user) {
          this.authStore.updateUser(res.user);
        }
        // Refresh catalog
        this.getCatalog().subscribe();
      })
    );
  }
}
