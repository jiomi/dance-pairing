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

/** Order in which couples dance within a round, by combined couple level. */
export type DanceOrder = 'highest' | 'lowest' | 'random';

export type Theme = 'dark' | 'light';

export interface Session {
  id: string;
  createdAt: number;
  rounds: Pair[][];
  pairByLevel?: boolean;
  danceOrder?: DanceOrder;
  /** Couples marked as danced, as "roundIndex:pairIndex" keys. Cleared on reshuffle. */
  donePairs?: string[];
}

export interface PairingOptions {
  /** Earlier sessions of the room, oldest first (same order as `Room.sessions`). */
  pastSessions?: Session[];
  /**
   * Dance order within each round. When omitted (sessions saved before this
   * option existed): 'highest' in level mode, 'random' otherwise.
   */
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
