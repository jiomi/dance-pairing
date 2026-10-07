# Dance Pairing

A mobile-first Progressive Web App for managing dance class pairings across multiple rounds.

## Features

- **Rooms** — Create, rename, and delete rooms (e.g. a class or group)
- **People** — Add, rename, and remove people per room; assign each a role (`leader` / `follower`) and a skill level
- **Sessions** — Start a session from a room; deselect absent people, choose the number of rounds, and optionally enable level-based matching before generating pairs
- **Random pairing** — Leaders and followers are paired randomly across rounds; when numbers are uneven, the shorter side gets extra dances (rotating across rounds) so everyone dances
- **Level-based pairing** — Pair dancers of similar skill levels (on by default)
- **Dance order** — Highest level first, lowest level first, or random (default)
- **History-aware** — Avoids repeating couples within a session and from previous sessions of the room, with older sessions weighing less
- **Settings** — Customise the list of skill levels used across all rooms
- **Light / dark theme** — Switch in the header; dark by default, remembered on the device
- **Persistent** — All data is stored in `localStorage`; no backend required

## Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) as the build tool
- [CSS Modules](https://github.com/css-modules/css-modules) for scoped styles
- Mobile-first responsive design

## Getting Started

```bash
npm install
npm run dev
```

Other useful scripts:

| Command | Description |
|---------|-------------|
| `npm test` | Run tests once |
| `npm run test:coverage` | Run tests with coverage report (fails below 95%) |
| `npm run typecheck` | TypeScript type-check without emitting |
| `npm run lint` | ESLint |
| `npm run format` | Auto-format with Prettier |

## Project Structure

```
src/
  pages/      # Route-level pages (Rooms, Room detail, Session, SessionView, Settings)
  states/     # Custom hooks for localStorage-backed state (useRooms, useSettings, useLocalStorage)
  types/      # Shared TypeScript types (Person, Room, Session, Pair, Settings)
  utils/      # Pairing algorithm (pairing.ts + pairing.test.ts)
```

## Pairing Algorithm

Each round is solved as a minimum-cost assignment (Hungarian algorithm), so the
result is the best possible pairing for the costs below, not the best of a few
random tries. Every possible leader–follower couple gets a cost:

| Cost | Value |
|------|-------|
| Already danced together earlier in this session | 1000 per time |
| Danced together in the previous session | 100 per time, halving for each older session (50, 25, …; last 8 sessions) |
| Level gap (level mode only) | 20 per level of difference |
| Random tie-breaker | 0–5 |

When one side is larger, the smaller side gets extra dance slots. Extra slots
are kept to the minimum, spread evenly, and go first to whoever had the fewest
extra dances this session.

Couples are then ordered within the round by the chosen dance order: by the
couple's combined level (highest or lowest first), or random. The order is adjusted so nobody dances twice in a row
when that can be avoided.

When reshuffling a session, only the sessions before it count as history.

## Data Model

```ts
type Role = 'leader' | 'follower';

interface Person {
  id: string;
  name: string;
  role: Role;
  level: string;   // e.g. 'Newcomer', 'Intermediate'
}

interface Pair {
  leader: Person;
  follower: Person;
}

interface Session {
  id: string;
  createdAt: number;       // ms timestamp
  rounds: Pair[][];        // rounds[roundIndex][pairIndex]
  pairByLevel?: boolean;
  danceOrder?: 'highest' | 'lowest' | 'random';
}

interface Room {
  id: string;
  name: string;
  people: Person[];
  sessions: Session[];
}

interface Settings {
  levels: string[];        // ordered list of skill levels
}
```

Data is stored under three `localStorage` keys:
- `dance-pairing:rooms` — the full `Room[]` array
- `dance-pairing:settings` — the `Settings` object
- `dance-pairing:theme` — `'dark'` or `'light'`
