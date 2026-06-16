# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (Go + Fiber v3)

```bash
# Development server (port 3001)
cd backend && go run ./cmd/api/

# Production build (standalone binary)
cd backend && go build -ldflags="-s -w" -o x-game-api ./cmd/api/

# Production build with version injection
bash deploy/build_prod.sh

# Regenerate engine blank-import list after adding a new engine package
cd backend && go generate ./cmd/api/...
```

### Frontend (Angular 21 + TailwindCSS v4)

```bash
cd frontend

# Development server (port 4201, proxies /api and /ws to backend)
npm start

# Locale-specific dev servers
npm run zh          # Chinese on :4201
npm run en          # English on :4202

# Tests (Vitest)
npm test

# Production build (version gen → sitemap gen → ng build → post-build)
npm run build

# Serve SSR build locally
npm run serve:ssr:frontend

# Format check
npx prettier --check .

# Regenerate XLF translation files after editing core.translations.ts
node generate-xlf.js
```

## Architecture

### Backend (`backend/`)

- **Framework**: Go with Fiber v3 HTTP framework. Module path: `github.com/x-game/backend`.
- **Database**: PostgreSQL via GORM (`gorm.io/gorm`). Auto-migrated (no versioned migrations). All tables prefixed `gm_`. Global `db.DB` variable used for all queries.
- **Auth**: JWT (HS256, 72h expiry). Middleware layers: `Protected()` (required JWT), `OptionalProtected()` (JWT optional), `AdminProtected()` (requires `role == "admin"`).
- **Entry point**: `cmd/api/main.go` — loads `.env`, inits DB, seeds data, registers REST/WS routes, starts simulator, listens on `:3001`.

### Frontend (`frontend/`)

- **Framework**: Angular 21 standalone components (no NgModules), Zoneless change detection with Signals throughout.
- **Styling**: TailwindCSS v4 via `@tailwindcss/postcss`. Theme colors use CSS custom properties (no hardcoded colors).
- **i18n**: Compile-time via `@angular/localize` with XLF files (`messages.en.xlf`, `messages.zh.xlf`). Two separate builds for en/zh. Static template text uses `i18n="@@id"` attribute; dynamic TS text uses `I18nService.t('key')()`. Source of truth: `core/i18n/core.translations.ts` → run `node generate-xlf.js` to emit XLF files.
- **SSR/SSG**: 54 routes prerendered at build time (`RenderMode.Prerender`). Express SSR server in `server.ts`. Cloudflare Pages for production hosting with edge function in `functions/[[path]].js`.
- **SSR Safety**: `ssrNoopInterceptor` shorts all HTTP requests during SSR. `browser.util.ts` wraps all browser APIs (`localStorage`, `WebSocket`, `window`). WebSocket connections guarded with `isBrowser()` check.
- **Entry point**: `main.ts` bootstraps `AppComponent` with `appConfig` (provides router, HTTP client with fetch, SSR hydration with event replay).

### Game Engine Pattern

Every game follows the same architecture on both ends:

**Backend** (`backend/internal/engine/`):
1. Implement the `GameEngine` interface (`engine.go`): `InitGame`, `HandleAction`, `CheckGameOver`, `GetState`, `GetStatus`, `SetBroadcaster`, `AddPlayer`, `RemovePlayer`, `HasPlayer`.
2. Embed `BaseEngine` (`base.go`) which provides `Mu` (sync lock), `State`, `SetBroadcaster`, and `Broadcast`.
3. Register in `init()` via `engine.Register("gameId_mode", factoryFunc)`. Key format: `<gameId>_<mode>` (e.g. `tetris_pk_steal`).
4. Lifecycle: `waiting → starting → playing → finished`. Use `StartWithCountdown()` for the 3-second countdown.
5. After creating the engine package, run `go generate ./cmd/api/...` — `gen_engines.go` auto-scans `internal/engine/*/` and rewrites `cmd/api/engines_gen.go` with the blank imports. **Never manually edit `engines_gen.go`.**

**Frontend** (`frontend/src/app/features/games/`):
1. Create a Signals-based Store extending `BaseGameStore` (`core/store/base-game.store.ts`). The base class provides `roomId`, `currentRoomMode`, `rawState`, `status`, `joinRoom`, `leaveRoom`, `startGame`, `ready`, `restartGame` — do not re-implement these.
2. For single-player logic, extract it into a separate `<game>-engine.ts` implementing `ILocalEngine<State, Action>` (`core/models/engine.model.ts`). The store holds a `signal<Engine>` and syncs it to Angular signals after each action.
3. Override only `singlePlayerStatus`, `singlePlayerWinners`, `singlePlayerList` in the store for single-player computed derivations. The base `status` computed already routes to `singlePlayerStatus()` in Single mode.
4. Extend `BaseGameComponent` (`core/utils/`) for shared lobby/room/dismissal handling. Call `super.ngOnInit()` and `super.ngOnDestroy()`.
5. Use `setupRoomLifecycle()` in the component for reconnect info persistence across navigation.

**Adding a new game — register the route:**
Add one entry to `GAME_DEFINITIONS` in `core/config/game-definitions.ts` (type `GameRouteDef`). Routes in `app.routes.ts` are auto-generated from this array — no manual route edits needed.

### Puzzle REST Pattern

Puzzle-based games (sudoku, math24, sokoban) share a unified REST layer:

- Implement `PuzzleRepo` interface (`internal/handlers/rest/puzzle.go`): `GetLevels`, `GetPuzzle`, `SaveProgress`, `Finish`, `HasSave`.
- Call `RegisterPuzzleRoutes(group, "gameId", repo)` in `main.go`. This wires `/levels/:difficulty`, `/puzzle/:id`, `/puzzle/:id/save` (if `HasSave()`), and `/puzzle/:id/finish`.
- The `/finish` handler automatically upserts `UserGameStat` (personal best by `BestTime` and `BestScore/stars`) and returns `{ isNewRecord: bool }`. Frontend only calls one endpoint on puzzle completion; no separate `submitStat` call needed.
- Frontend passes `mode` and `difficulty` fields in the finish payload so the backend can write the correct stat row.

### WebSocket System

- **Room connection** (`/ws/join/:roomId`): Per-game real-time gameplay. Carries `gameId`, `mode`, `difficulty`, `playerId`, `hostId`, `password` as query params.
- **Lobby connection** (`/ws/lobby`): Global online players, room list, announcements.
- **Protocol**: State broadcast as `{type: "gameState", state, host, readyPlayers}`. Heartbeat ping/pong every 25–30s (managed by `startHeartbeat()` in `internal/handlers/ws/heartbeat.go`). Exponential backoff reconnect (2s → 4s → 8s → max 30s).
- Backend WS manager in `pkg/ws/`. Frontend WS logic in `core/services/websocket.service.ts`.
- **Do not modify** `pkg/ws/manager.go` or `pkg/ws/lobby.go` when adding games — the room lifecycle (join/leave/reconnect/ghost-room cleanup) is stable and shared. Implement only `GameEngine` and register it.

### Stats & Personal Bests

- `UserGameStat` (`internal/domain/game_stat.go`) stores personal bests keyed by `(userID, gameID, mode, difficulty)`.
- Action games: frontend calls `POST /api/v1/stats/:gameId` via `GameStatsService.submitStat()` after game over.
- Puzzle games: the shared `/puzzle/:id/finish` handler upserts stats automatically — frontend must not call `submitStat` separately.
- `GET /api/v1/stats/:gameId` (or `all`) returns stat rows; frontend uses this to display personal bests on game start.

### Database Tables (all `gm_` prefix)

`users`, `game_configs`, `user_game_stats`, `sudoku_puzzles`, `user_sudoku_progress`, `math24_puzzles`, `user_math24_progress`, `sokoban_puzzles`, `user_sokoban_progress`, `system_settings`, `announcements`, `ad_placements`, `ad_networks`

## Critical Conventions

1. **Docs sync**: Every new feature must update `docs/FEATURES.md` and `docs/CHANGELOG.md`.
2. **No hardcoded text or colors**: All UI text goes through `I18nService` / translation dictionaries. All colors use CSS theme variables defined in `index.css` (e.g. `var(--color-bg-main)`, `var(--color-bg-card)`) — never `bg-slate-900`, `text-white`, or transparent Tailwind utilities as primary colors.
3. **No magic strings in WS actions**: Always use `C2SAction` / `S2CEvent` enums from `core/models/websocket.model.ts`. Backend action strings in `HandleAction` must match these enum values.
4. **Game isolation**: New games need an independent `GameEngine` (backend) and a standalone route module under `features/games/` (frontend). Never leak game-specific logic into shared components.
5. **Responsive design**: Use TailwindCSS breakpoints (`sm:`, `md:`, `lg:`) on all UI. No horizontal scrollbars on mobile.
6. **Board layout**: Use `vmin`-based sizing for game boards to prevent layout jump and Safari incompatibilities. Pattern: `style="width: min(85vmin, 600px); height: min(85vmin, 600px);"`. Do not use `flex-1` / `h-full` to auto-size boards.
7. **Player badge stats**: Pass `[stats]="[{ icon: '⏱️', value: '01:23' }]"` (emoji icon + value) to `<app-player-badge>` — no verbose text labels.

## Key Reference Files

- `docs/HOW_TO_ADD_GAME.md` — Step-by-step guide for adding new games with anti-pitfall checklist. Read this before implementing any new game.
- `docs/FEATURES.md` — Complete feature inventory (13 games, infrastructure, admin, multiplayer).
- `docs/CHANGELOG.md` — Recent change history.
- `desc.md` — Backend service description (engines, API, WebSocket, DB schema, simulator).
- `frontend/src/app/core/config/game-definitions.ts` — Single source of truth for all game metadata and lazy-load routes.
- `backend/cmd/api/engines_gen.go` — Auto-generated engine blank imports. Regenerate with `go generate ./cmd/api/...`.
