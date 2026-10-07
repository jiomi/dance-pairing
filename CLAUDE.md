# Dance Pairing — CLAUDE.md

## Stack

- React 18 + TypeScript (strict mode, `react-jsx` preset)
- CSS Modules (`.module.css`) — no Tailwind, no styled-components, no UI library
- Vite as the build tool
- React Router v6 with `HashRouter` for client-side routing
- No backend; all state is persisted in `localStorage`
- PWA: service worker (`public/sw.js`) + manifest for offline support

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run typecheck` — TypeScript type checking
- `npm test` — run tests once
- `npm run test:coverage` — run tests with coverage report
- `npm run test:watch` — run tests in watch mode
- `npm run lint` — run ESLint
- `npm run format` — format with Prettier
- `npm run format:check` — check formatting

## Project structure

```
src/
├── App.tsx              # Main router (5 routes)
├── App.test.tsx         # Integration tests for all UI flows
├── index.css            # Global styles & CSS variables
├── main.tsx             # Entry point (HashRouter + SW registration)
├── pages/               # Page components (co-located CSS modules)
├── states/              # Custom hooks (useLocalStorage, useRooms, useSettings)
├── types/               # Shared TypeScript types
├── utils/               # Pure utility functions + tests
└── test/                # Test setup (jest-dom matchers, cleanup)
```

## Routes

- `/` — RoomsPage (list, create, delete, rename rooms)
- `/rooms/:roomId` — RoomPage (people management, session history)
- `/rooms/:roomId/session` — SessionPage (attendance, pairing config)
- `/rooms/:roomId/sessions/:sessionId` — SessionViewPage (pairs display, reshuffle)
- `/settings` — SettingsPage (dance levels management)

## Code conventions

- Functional components only; no class components
- Co-locate each component's CSS module next to the component file
- Page components live in `src/pages/`; inline sub-components (e.g. `PersonItem`, `SessionCard`) are defined within the same file
- Custom hooks live in `src/states/`; prefix with `use`
- Types and interfaces live in `src/types/index.ts`; no inline anonymous object types for shared shapes
- Avoid `any`; use `unknown` and narrow when necessary
- Keep components small; extract sub-components rather than growing a single file
- Use `crypto.randomUUID()` for generating IDs

## Styling

- Dark theme by default, with a light theme toggled from the switch in the Rooms page header (`ThemeToggle`, `useTheme`); colors are CSS custom properties in `src/index.css`, overridden under `:root[data-theme='light']`
- Never hardcode colors in CSS modules; text on `--color-primary` uses `--color-on-primary`
- Mobile-first: base styles target small screens, then use `@media (min-width: ...)` for larger
- Two-column layouts (leaders/followers) collapse to single column at `max-width: 480px`
- Pages use `max-width: 600–700px` centered with `margin: 0 auto`
- Use CSS custom properties (variables) defined in a global `:root` block for colors and spacing
- No global class names; all styles scoped via CSS Modules
- Role-specific colors: leaders are blue (`--color-leader`), followers are pink (`--color-follower`)

## State management

- `localStorage` is the single source of truth; three keys:
  - `dance-pairing:rooms` — full `Room[]` array (people + sessions)
  - `dance-pairing:settings` — `Settings` object (configured levels)
  - `dance-pairing:theme` — `'dark' | 'light'` (applied in `main.tsx` before the first render)
- Use the `useLocalStorage<T>` generic hook for all persistence
- Domain hooks: `useRooms` (rooms/people/sessions), `useSettings` (difficulty levels), `useTheme` (color theme)
- No external state library (no Redux, no Zustand)
- All state mutations are immutable (spread operators)

## UI patterns

- Inline editing: toggle `editingId` state; commit on Enter/blur/button; cancel on Escape
- Double-click to edit on RoomsPage (250ms timeout to distinguish from single-click navigation)
- Level badge cycling: click cycles through available levels, wraps at end
- Session history: displayed newest-first with "Show more" pagination (3 at a time)
- All add operations clear the input field after submission
- Empty/whitespace-only inputs are rejected for all create/rename operations
- Destructive actions guarded by `window.confirm`

## Pairing logic

- Lives in `src/utils/pairing.ts`
- Must be pure functions; no side effects (other than `Math.random`)
- Exported functions:
  - `generatePairs(leaders, followers, options?)` — single random round
  - `generatePairsByLevel(leaders, followers, levels, options?)` — single round, matched by skill level proximity
  - `generateRounds(leaders, followers, iterations, pairByLevel, levels, options?)` — multiple rounds
  - `options: PairingOptions` = `{ pastSessions?, danceOrder? }`; pages pass the room's earlier sessions as `pastSessions`
  - Helpers exported for tests: `solveAssignment`, `pastSessionCosts`, `spreadRepeatDancers`
- Each round is a minimum-cost assignment (Hungarian algorithm) over couple costs:
  - same-session repeat: 1000 per time; previous session: 100 per time, halving per older session (last 8 sessions)
  - level gap (level mode): 20 per level; random tie-breaker 0–5
- If leaders ≠ followers, the smaller side gets extra dance slots: minimum number, evenly spread, rotating across rounds
- Round order: by combined couple level (`danceOrder`: highest/lowest/random; sessions saved without it use highest in level mode, random otherwise); then reordered so nobody dances twice in a row when avoidable
- Session page defaults: match by level on, dance order random
- Reshuffling a session uses only the sessions before it as history

## Testing

- Unit tests for pairing algorithm (`src/utils/pairing.test.ts`) — pure function tests
- Integration tests for UI flows (`src/App.test.tsx`) — uses `@testing-library/react` with `MemoryRouter`
- Tests seed `localStorage` with test data; do not mock `localStorage`
- `Math.random` may be mocked (via `vi.spyOn`) when a test needs a deterministic shuffle order
- Mock `window.confirm` for destructive action tests
- Test environment: jsdom (configured in `vite.config.ts`)
- Coverage threshold is 95% (lines, functions, statements) and 80% (branches) — enforced by vitest; CI fails below this
