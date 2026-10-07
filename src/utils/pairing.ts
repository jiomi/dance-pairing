import type { DanceOrder, Pair, PairingOptions, Person, Session } from '../types';

/** Cost of a couple that already danced together earlier in the same session. */
export const SAME_SESSION_REPEAT_COST = 1000;
/** Cost of a couple that danced together in the previous session; halves for each older session. */
export const LAST_SESSION_REPEAT_COST = 100;
/** Cost per level of difference between partners (level mode only). */
export const LEVEL_GAP_COST = 20;
/** Number of past sessions taken into account (older ones weigh < 1 point anyway). */
export const MAX_PAST_SESSIONS = 8;
/** Random tie-breaker added to every couple, so equally good plans vary. */
const NOISE = 5;
/** Cost of each extra dance slot; dwarfs every other cost so extra dances are kept to the minimum. */
const EXTRA_SLOT_COST = 100_000;
/** Extra cost per extra dance a person already had this session, so extra dances rotate. */
const EXTRA_FAIRNESS_COST = 5_000;

type CostMap = Map<string, number>;

interface RoundContext {
  levels: string[];
  pairByLevel: boolean;
  pastCosts: CostMap;
  sessionCosts: CostMap;
  extraDances: Map<string, number>;
}

function fisherYates<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getLevelIdx(person: Person, levels: string[]): number {
  const idx = levels.indexOf(person.level);
  return idx === -1 ? levels.length : idx;
}

const coupleKey = (leaderId: string, followerId: string) => `${leaderId}|${followerId}`;

function addCost(costs: CostMap, pair: Pair, amount: number): void {
  const key = coupleKey(pair.leader.id, pair.follower.id);
  costs.set(key, (costs.get(key) ?? 0) + amount);
}

/**
 * Repeat costs from earlier sessions: 100 for each time a couple danced in the
 * most recent session, 50 for the one before, then 25, 12.5…
 */
export function pastSessionCosts(pastSessions: Session[]): CostMap {
  const costs: CostMap = new Map();
  const recentFirst = pastSessions.slice(-MAX_PAST_SESSIONS).reverse();
  recentFirst.forEach((session, age) => {
    const weight = LAST_SESSION_REPEAT_COST / 2 ** age;
    for (const round of session.rounds) {
      for (const pair of round) addCost(costs, pair, weight);
    }
  });
  return costs;
}

/**
 * Minimum-cost assignment (Hungarian algorithm, O(n²·m)).
 * Assigns every row to a distinct column; requires rows ≤ columns.
 * Returns the chosen column index for each row.
 */
export function solveAssignment(cost: number[][]): number[] {
  const n = cost.length;
  if (n === 0) return [];
  const m = cost[0].length;
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(m + 1).fill(0);
  const rowOfColumn = new Array<number>(m + 1).fill(0); // 1-based row, 0 = free
  const way = new Array<number>(m + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    rowOfColumn[0] = i;
    let j0 = 0;
    const minv = new Array<number>(m + 1).fill(Infinity);
    const used = new Array<boolean>(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = rowOfColumn[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[rowOfColumn[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (rowOfColumn[j0] !== 0);
    do {
      const j1 = way[j0];
      rowOfColumn[j0] = rowOfColumn[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const result = new Array<number>(n).fill(-1);
  for (let j = 1; j <= m; j++) {
    if (rowOfColumn[j] !== 0) result[rowOfColumn[j] - 1] = j - 1;
  }
  return result;
}

function coupleCost(leader: Person, follower: Person, ctx: RoundContext): number {
  const key = coupleKey(leader.id, follower.id);
  let cost = (ctx.pastCosts.get(key) ?? 0) + (ctx.sessionCosts.get(key) ?? 0);
  if (ctx.pairByLevel) {
    const gap = Math.abs(getLevelIdx(leader, ctx.levels) - getLevelIdx(follower, ctx.levels));
    cost += LEVEL_GAP_COST * gap;
  }
  return cost + Math.random() * NOISE;
}

/**
 * Build one round with the lowest total cost.
 * Everyone on the larger side dances once; people on the smaller side get
 * extra dances ("slots") so nobody sits out, and those extras rotate.
 */
function generateRound(leaders: Person[], followers: Person[], ctx: RoundContext): Pair[] {
  if (leaders.length === 0 || followers.length === 0) return [];

  const leadersAreBig = leaders.length >= followers.length;
  const big = leadersAreBig ? leaders : followers;
  const small = leadersAreBig ? followers : leaders;
  const toPair = (b: Person, s: Person): Pair =>
    leadersAreBig ? { leader: b, follower: s } : { leader: s, follower: b };

  const slots = Math.ceil(big.length / small.length);
  const base = big.map((b) =>
    small.map((s) => {
      const { leader, follower } = toPair(b, s);
      return coupleCost(leader, follower, ctx);
    }),
  );
  // Column c is slot ⌊c / small.length⌋ of small[c % small.length].
  const cost = base.map((row) =>
    Array.from({ length: small.length * slots }, (_, c) => {
      const si = c % small.length;
      const slot = Math.floor(c / small.length);
      const slotCost =
        slot === 0
          ? 0
          : slot * EXTRA_SLOT_COST + EXTRA_FAIRNESS_COST * (ctx.extraDances.get(small[si].id) ?? 0);
      return row[si] + slotCost;
    }),
  );

  const assignment = solveAssignment(cost);
  const pairs = assignment.map((c, bi) => toPair(big[bi], small[c % small.length]));

  const uses = new Map<string, number>();
  for (const c of assignment) {
    const id = small[c % small.length].id;
    uses.set(id, (uses.get(id) ?? 0) + 1);
  }
  for (const [id, count] of uses) {
    if (count > 1) ctx.extraDances.set(id, (ctx.extraDances.get(id) ?? 0) + count - 1);
  }

  return pairs;
}

/**
 * Reorder so nobody dances twice in a row when it can be avoided, keeping
 * the order otherwise as close as possible to the input.
 *
 * With uneven numbers only the smaller side repeats, so each pair is keyed by
 * its smaller-side dancer. At each step we take the earliest remaining couple
 * that differs from the previous dancer and still leaves an arrangeable rest:
 * in L remaining slots, the dancer just placed fits at most ⌊L/2⌋ more times,
 * anyone else at most ⌈L/2⌉.
 */
export function spreadRepeatDancers(pairs: Pair[]): Pair[] {
  const leadersRepeat = new Set(pairs.map((p) => p.leader.id)).size < pairs.length;
  const key = (p: Pair) => (leadersRepeat ? p.leader.id : p.follower.id);

  const remaining = [...pairs];
  const counts = new Map<string, number>();
  for (const p of remaining) counts.set(key(p), (counts.get(key(p)) ?? 0) + 1);

  const result: Pair[] = [];
  let last: string | undefined;
  while (remaining.length > 0) {
    const rest = remaining.length - 1;
    const fits = (p: Pair) => {
      const k = key(p);
      if (k === last) return false;
      for (const [q, count] of counts) {
        const left = q === k ? count - 1 : count;
        const limit = q === k ? Math.floor(rest / 2) : Math.ceil(rest / 2);
        if (left > limit) return false;
      }
      return true;
    };
    let idx = remaining.findIndex(fits);
    if (idx === -1) idx = remaining.findIndex((p) => key(p) !== last); // can't fully avoid
    if (idx === -1) idx = 0;
    const [pair] = remaining.splice(idx, 1);
    counts.set(key(pair), counts.get(key(pair))! - 1);
    last = key(pair);
    result.push(pair);
  }
  return result;
}

/** Order the couples of a round: by combined couple level (ties random) or fully random. */
function orderRound(pairs: Pair[], order: DanceOrder, levels: string[]): Pair[] {
  const shuffled = fisherYates(pairs);
  if (order !== 'random') {
    const level = (p: Pair) => getLevelIdx(p.leader, levels) + getLevelIdx(p.follower, levels);
    const sign = order === 'highest' ? -1 : 1;
    shuffled.sort((a, b) => sign * (level(a) - level(b)));
  }
  return spreadRepeatDancers(shuffled);
}

export function generateRounds(
  leaders: Person[],
  followers: Person[],
  iterations: number,
  pairByLevel: boolean,
  levels: string[],
  options: PairingOptions = {},
): Pair[][] {
  const ctx: RoundContext = {
    levels,
    pairByLevel,
    pastCosts: pastSessionCosts(options.pastSessions ?? []),
    sessionCosts: new Map(),
    extraDances: new Map(),
  };
  const order: DanceOrder = options.danceOrder ?? (pairByLevel ? 'highest' : 'random');
  const rounds: Pair[][] = [];

  for (let i = 0; i < iterations; i++) {
    const round = generateRound(leaders, followers, ctx);
    for (const pair of round) addCost(ctx.sessionCosts, pair, SAME_SESSION_REPEAT_COST);
    rounds.push(orderRound(round, order, levels));
  }

  return rounds;
}

export function generatePairs(
  leaders: Person[],
  followers: Person[],
  options: PairingOptions = {},
): Pair[] {
  return generateRounds(leaders, followers, 1, false, [], options)[0];
}

export function generatePairsByLevel(
  leaders: Person[],
  followers: Person[],
  levels: string[],
  options: PairingOptions = {},
): Pair[] {
  return generateRounds(leaders, followers, 1, true, levels, options)[0];
}
