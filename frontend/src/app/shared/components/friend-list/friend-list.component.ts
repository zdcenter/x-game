import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FriendService } from '../../../core/services/friend.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { Router } from '@angular/router';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';

@Component({
  selector: 'app-friend-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './friend-list.component.html',
  styleUrls: ['./friend-list.component.css']
})
export class FriendListComponent implements OnInit {
  friendService = inject(FriendService);
  auth = inject(AuthStore);
  i18n = inject(I18nService);
  ws = inject(WebSocketService);
  gameRegistry = inject(GameRegistryService);

  isOpen = signal(false);
  activeTab = signal<'friends' | 'requests'>('friends');
  selectedFriends = signal<Set<string>>(new Set());

  // Computed lists
  acceptedFriends = computed(() => this.friendService.friends().filter(f => f.status === 'accepted'));
  pendingRequests = computed(() => this.friendService.friends().filter(f => f.status === 'pending_received'));

  ngOnInit() {
    if (this.auth.currentUser()) {
      this.friendService.loadFriends().subscribe();
    }
  }

  togglePanel() {
    this.isOpen.set(!this.isOpen());
    if (this.isOpen() && this.auth.currentUser()) {
      this.friendService.loadFriends().subscribe();
    } else {
      this.selectedFriends.set(new Set()); // clear selection when closed
    }
  }

  toggleSelection(username: string) {
    const current = new Set(this.selectedFriends());
    if (current.has(username)) {
      current.delete(username);
    } else {
      current.add(username);
    }
    this.selectedFriends.set(current);
  }

  inviteSelected() {
    const selected = Array.from(this.selectedFriends());
    if (selected.length === 0) return;

    const currentRooms = this.ws.activeRooms();
    const myId = this.auth.currentUser()?.username || this.auth.guestId;
    if (!myId) return;

    const myRoom = currentRooms.find((r: any) => 
      r.host === myId || (r.clients && Object.keys(r.clients).includes(myId))
    );

    if (myRoom) {
      selected.forEach(username => {
        this.friendService.sendInvite(username, myRoom.id);
      });
      alert(this.i18n.t('game.invite_sent')() || 'Invite sent!');
      this.selectedFriends.set(new Set());
    } else {
      // Not in a room. Check if we are currently on a game page.
      const urlPath = this.router.url.split('?')[0];
      const segments = urlPath.split('/');
      const gamesIdx = segments.indexOf('games');
      const gameId = gamesIdx >= 0 ? segments[gamesIdx + 1] : null;

      if (gameId) {
        const randomPassword = Math.floor(1000 + Math.random() * 9000).toString();
        const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const myId = this.auth.currentUser()?.username || this.auth.guestId;
        const generatedRoomId = `${myId}-${suffix}`;

        let targetMode = 'multi';
        let targetDiff = 'medium';
        const config = this.gameRegistry.getConfig(gameId);
        if (config) {
          const mpMode = config.modes.find(m => m.id !== 'single');
          targetMode = mpMode ? mpMode.id : config.modes[0].id;
          targetDiff = config.difficulties.length > 0 ? config.difficulties[0].id : 'medium';
        }

        this.crossGameJoin.setPendingJoin({
          game: gameId,
          roomId: generatedRoomId,
          mode: targetMode,
          difficulty: targetDiff,
          host: '',
          password: randomPassword,
          action: 'create',
          inviteUsernames: selected
        });
        
        const lang = segments[1] || 'zh';
        const targetUrl = `/${lang}/games/${gameId}`;
        this.router.navigateByUrl(`/${lang}`, { skipLocationChange: true }).then(() => {
          this.router.navigate([targetUrl]);
        });
        
        this.isOpen.set(false);
        this.selectedFriends.set(new Set());
      } else {
        alert(this.i18n.t('game.create_room_first')() || 'Create or join a room first!');
      }
    }
  }

  acceptRequest(id: number) {
    this.friendService.acceptRequest(id).subscribe();
  }

  rejectRequest(id: number) {
    this.friendService.rejectRequest(id).subscribe();
  }

  removeFriend(id: number) {
    if (confirm(this.i18n.t('game.confirm_remove_friend')() || 'Remove this friend?')) {
      this.friendService.rejectRequest(id).subscribe();
    }
  }

  private router = inject(Router);
  private crossGameJoin = inject(CrossGameJoinService);


}
