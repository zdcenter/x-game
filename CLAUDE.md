# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (Go + Fiber v3)

```bash
# Development server (port 3001)
cd backend && go run cmd/api/main.go

# Production build (standalone binary)
cd backend && go build -ldflags="-s -w" -o x-game-api cmd/api/main.go

# Production build with version injection
bash deploy/build_prod.sh
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
- **i18n**: Compile-time via `@angular/localize` with XLF files (`messages.en.xlf`, `messages.zh.xlf`). Two separate builds for en/zh.
- **SSR/SSG**: 54 routes prerendered at build time (`RenderMode.Prerender`). Express SSR server in `server.ts`. Cloudflare Pages for production hosting with edge function in `functions/[[path]].js`.
- **SSR Safety**: `ssrNoopInterceptor` shorts all HTTP requests during SSR. `browser.util.ts` wraps all browser APIs (`localStorage`, `WebSocket`, `window`). WebSocket connections guarded with `isBrowser()` check.
- **Entry point**: `main.ts` bootstraps `AppComponent` with `appConfig` (provides router, HTTP client with fetch, SSR hydration with event replay).

### Game Engine Pattern

Every game follows the same architecture on both ends:

**Backend** (`backend/internal/engine/`):
1. Implement the `GameEngine` interface (`engine.go`):
   - `InitGame`, `HandleAction`, `CheckGameOver`, `GetState`, `GetStatus`, `SetBroadcaster`, `AddPlayer`, `RemovePlayer`, `HasPlayer`
2. Embed `BaseEngine` (`base.go`) which provides default `GetStatus`, `SetBroadcaster`, and `Broadcast`.
3. Register in `init()` via `engine.Register("gameId_mode", factoryFunc)`.
4. Lifecycle: `waiting → starting → playing → finished`. Use `StartWithCountdown()` for the 3-second countdown.

**Frontend** (`frontend/src/app/features/games/`):
1. Create a Signals-based Store implementing `GameStoreInterface` (in `core/interfaces/`).
2. Extend `BaseGameComponent` (in `core/utils/`) for shared lobby/room/dismissal handling.
3. Use `WebSocketService` for real-time state sync — the service exposes `gameState` as a Signal; the Store derives local state with `computed()`.
4. Shared UI components live in `shared/components/`: `GameHeaderComponent`, `GameLobbyPanelComponent`, `GameWaitingRoomComponent`, `GameResultOverlayComponent`, `GameStartingOverlayComponent`, `PlayerBadgeComponent`.

### WebSocket System

- **Room connection** (`/ws/join/:roomId`): Per-game real-time gameplay. Carries `gameId`, `mode`, `difficulty`, `playerId`, `hostId`, `password` as query params.
- **Lobby connection** (`/ws/lobby`): Global online players, room list, announcements.
- **Protocol**: State broadcast as `{type: "gameState", state, host, readyPlayers}`. Heartbeat ping every 25s. Exponential backoff reconnect (2s → 4s → 8s → max 30s).
- Backend WS manager in `pkg/ws/`. Frontend WS logic in `core/services/websocket.service.ts`.

### Database Tables (all `gm_` prefix)

`users`, `game_configs`, `game_stats`, `sudoku_puzzles`, `user_sudoku_progress`, `math24_puzzles`, `user_math24_progress`, `sokoban_puzzles`, `user_sokoban_progress`, `system_settings`, `announcements`, `ad_placements`, `ad_networks`

## Critical Conventions

From `.cursorrules` (must follow):

1. **Docs sync**: Every new feature must update `docs/FEATURES.md` and `docs/CHANGELOG.md`.
2. **No hardcoded text or colors**: All UI text goes through `I18nService` / translation dictionaries. All colors use CSS theme variables (never `bg-slate-900`, `text-white`, etc.).
3. **Game isolation**: New games need an independent `GameEngine` implementation (backend) and a standalone route module under `features/games/` (frontend). Never leak game-specific logic into shared components.
4. **Responsive design**: Use TailwindCSS breakpoints (`sm:`, `md:`, `lg:`) on all UI. No horizontal scrollbars on mobile.

## Key Reference Files

- `docs/HOW_TO_ADD_GAME.md` — Step-by-step guide for adding new games with anti-pitfall checklist. Read this before implementing any new game.
- `docs/FEATURES.md` — Complete feature inventory (13 games, infrastructure, admin, multiplayer).
- `docs/CHANGELOG.md` — Recent change history.
- `desc.md` — Backend service description (engines, API, WebSocket, DB schema, simulator).
- `.cursorrules` — AI coding rules (summarized above).
- `readme.md` — Project blueprint (Chinese).
