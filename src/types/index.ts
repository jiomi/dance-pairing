export type Role = 'leader' | 'follower';

export interface Person {
  id: string;
  name: string;
  role: Role;
  level: string;
}

export interface Pair {
  leader: Person;
  follower: Person;
}

/** Order in which matched couples dance within a round (level mode only). */
export type DanceOrder = 'highest' | 'lowest' | 'random';

export interface Session {
  id: string;
  createdAt: number;
  rounds: Pair[][];
  pairByLevel?: boolean;
  danceOrder?: DanceOrder;
}

export interface PairingOptions {
  /** Earlier sessions of the room, oldest first (same order as `Room.sessions`). */
  pastSessions?: Session[];
  /** Dance order within each round when pairing by level. Defaults to 'highest'. */
  danceOrder?: DanceOrder;
}

export interface Room {
  id: string;
  name: string;
  people: Person[];
  sessions: Session[];
}

export interface Settings {
  levels: string[];
}

export const DEFAULT_LEVELS = ['Newcomer', 'Novice', 'Intermediate', 'Advanced'];
