const fs = require('fs');

const tsPath = '/home/zd/x-game/frontend/src/app/features/games/math24/math24.component.ts';
let ts = fs.readFileSync(tsPath, 'utf8');

// Imports
ts = ts.replace("import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';", "import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';");

// Remove CrossGameJoinService inject, add RoomLifecycleHandle
ts = ts.replace("private crossGameJoin = inject(CrossGameJoinService);", "private roomLifecycle!: RoomLifecycleHandle;");

// Update constructor to setup RoomLifecycle
ts = ts.replace("constructor() {", `constructor() {
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'math24',
      getCurrentMode: () => this.store.currentMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.roomLifecycle.clearReconnectInfo();
      },
    });`);

// Update ngOnInit
ts = ts.replace(`  override ngOnInit() {
    super.ngOnInit();
    
    // Cross Game Join
    const pending = this.crossGameJoin.consumePendingJoin('math24');
    if (pending) {
      this.handleJoinRoom({ roomId: pending.roomId, mode: pending.mode, difficulty: pending.difficulty, host: pending.host || '' });
    }
  }`, `  override ngOnInit() {
    super.ngOnInit();
    
    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
    if (joinInfo) {
      this.store.joinRoom(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host || '');
      if (joinInfo.mode !== 'single') {
        this.roomLifecycle.saveReconnectInfo(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host || '');
      }
      this.view.set('room');
    }
  }`);

// Update handleCreateRoom
ts = ts.replace(`  override handleCreateRoom(event: {name: string, mode: string, difficulty: string}) {
    super.handleCreateRoom(event);
    this.view.set("room");
  }`, `  override handleCreateRoom(event: {name: string, mode: string, difficulty: string}) {
    super.handleCreateRoom(event);
    if (event.mode !== 'single') {
      this.roomLifecycle.saveReconnectInfo(this.store.roomId() || event.name, event.mode, event.difficulty, this.playerId);
    }
    this.view.set("room");
  }`);

// Update handleJoinRoom
ts = ts.replace(`  override handleJoinRoom(params: { roomId: string; mode: string; difficulty: string; host: string }) {
    super.handleJoinRoom(params);
    this.view.set('room');
  }`, `  override handleJoinRoom(params: { roomId: string; mode: string; difficulty: string; host: string }) {
    super.handleJoinRoom(params);
    if (params.mode !== 'single') {
      this.roomLifecycle.saveReconnectInfo(params.roomId, params.mode, params.difficulty, params.host);
    }
    this.view.set('room');
  }
  
  override handleDismissRoom() {
    super.handleDismissRoom();
    this.roomLifecycle.clearReconnectInfo();
  }`);

fs.writeFileSync(tsPath, ts);
console.log('Fixed math24.component.ts lifecycle');
