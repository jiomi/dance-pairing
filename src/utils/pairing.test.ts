import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  generatePairs,
  generatePairsByLevel,
  generateRounds,
  pastSessionCosts,
  solveAssignment,
  spreadRepeatDancers,
  MAX_PAST_SESSIONS,
} from './pairing';
import type { Pair, Person, Session } from '../types';

const leader = (id: string, level = 'Newcomer'): Person => ({
  id,
  name: `Leader ${id}`,
  role: 'leader',
  level,
});
const follower = (id: string, level = 'Newcomer'): Person => ({
  id,
  name: `Follower ${id}`,
  role: 'follower',
  level,
});

describe('generatePairs', () => {
  it('returns empty when leaders is empty', () => {
    expect(generatePairs([], [follower('a')])).toEqual([]);
  });

  it('returns empty when followers is empty', () => {
    expect(generatePairs([leader('a')], [])).toEqual([]);
  });

  it('pairs equal counts', () => {
    const pairs = generatePairs([leader('a'), leader('b')], [follower('x'), follower('y')]);
    expect(pairs).toHaveLength(2);
  });

  it('handles more leaders than followers', () => {
    const pairs = generatePairs(
      [leader('a'), leader('b'), leader('c')],
      [follower('x'), follower('y')],
    );
    expect(pairs).toHaveLength(3);
  });

  it('handles more followers than leaders', () => {
    const pairs = generatePairs(
      [leader('a'), leader('b')],
      [follower('x'), follower('y'), follower('z')],
    );
    expect(pairs).toHaveLength(3);
  });

  it('every leader and follower appears at least once', () => {
    const leaders = [leader('a'), leader('b'), leader('c')];
    const followers = [follower('x'), follower('y')];
    const pairs = generatePairs(leaders, followers);
    const usedLeaderIds = new Set(pairs.map((p) => p.leader.id));
    const usedFollowerIds = new Set(pairs.map((p) => p.follower.id));
    leaders.forEach((l) => expect(usedLeaderIds.has(l.id)).toBe(true));
    followers.forEach((f) => expect(usedFollowerIds.has(f.id)).toBe(true));
  });
});

describe('generatePairsByLevel', () => {
  const levels = ['Newcomer', 'Intermediate', 'Advanced'];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty when leaders is empty', () => {
    expect(generatePairsByLevel([], [follower('a')], levels)).toEqual([]);
  });

  it('returns empty when followers is empty', () => {
    expect(generatePairsByLevel([leader('a')], [], levels)).toEqual([]);
  });

  it('pairs dancers of the same level together', () => {
    const leaders = [leader('a', 'Newcomer'), leader('b', 'Advanced')];
    const followers = [follower('x', 'Newcomer'), follower('y', 'Advanced')];
    const pairs = generatePairsByLevel(leaders, followers, levels);

    expect(pairs).toHaveLength(2);
    const newcomerPair = pairs.find((p) => p.leader.id === 'a');
    expect(newcomerPair?.follower.id).toBe('x');
    const advancedPair = pairs.find((p) => p.leader.id === 'b');
    expect(advancedPair?.follower.id).toBe('y');
  });

  it('falls back to closest-level pairing when no exact match', () => {
    const leaders = [leader('a', 'Newcomer')];
    const followers = [follower('x', 'Advanced')];
    const pairs = generatePairsByLevel(leaders, followers, levels);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].leader.id).toBe('a');
    expect(pairs[0].follower.id).toBe('x');
  });

  it('picks closest level when exact match unavailable', () => {
    // 1 leader (Intermediate), 2 followers (Newcomer, Advanced) — leader dances twice
    const leaders = [leader('a', 'Intermediate')];
    const followers = [follower('x', 'Newcomer'), follower('y', 'Advanced')];
    const pairs = generatePairsByLevel(leaders, followers, levels);
    expect(pairs).toHaveLength(2);
    expect(pairs.every((p) => p.leader.id === 'a')).toBe(true);
    const usedFollowerIds = new Set(pairs.map((p) => p.follower.id));
    expect(usedFollowerIds.has('x')).toBe(true);
    expect(usedFollowerIds.has('y')).toBe(true);
  });

  it('leaves extra dancers from uneven levels and pairs them', () => {
    const leaders = [leader('a', 'Newcomer'), leader('b', 'Newcomer')];
    const followers = [follower('x', 'Newcomer'), follower('y', 'Advanced')];
    const pairs = generatePairsByLevel(leaders, followers, levels);

    expect(pairs).toHaveLength(2);
    const allLeaderIds = new Set(pairs.map((p) => p.leader.id));
    const allFollowerIds = new Set(pairs.map((p) => p.follower.id));
    expect(allLeaderIds.has('a') || allLeaderIds.has('b')).toBe(true);
    expect(allFollowerIds.has('x')).toBe(true);
    expect(allFollowerIds.has('y')).toBe(true);
  });

  it('generates max pairs when followers outnumber leaders (all same level)', () => {
    const ls = ['a', 'b', 'c', 'd'].map((id) => leader(id, 'Newcomer'));
    const fs = ['v', 'w', 'x', 'y', 'z'].map((id) => follower(id, 'Newcomer'));
    const pairs = generatePairsByLevel(ls, fs, levels);

    expect(pairs).toHaveLength(5);
    const usedFollowerIds = new Set(pairs.map((p) => p.follower.id));
    fs.forEach((f) => expect(usedFollowerIds.has(f.id)).toBe(true));
  });

  it('handles a dancer whose level is not in the levels array', () => {
    // getLevelIdx returns levels.length as a sentinel for unknown levels
    const leaders = [leader('a', 'Unknown')];
    const followers = [follower('x', 'Newcomer')];
    const pairs = generatePairsByLevel(leaders, followers, levels);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].leader.id).toBe('a');
    expect(pairs[0].follower.id).toBe('x');
  });

  it('avoids repeating round-1 couples in round 2', () => {
    const rounds = generateRounds(
      [leader('a', 'Newcomer'), leader('b', 'Newcomer')],
      [follower('x', 'Newcomer'), follower('y', 'Newcomer')],
      2,
      true,
      ['Newcomer'],
    );

    expect(rounds).toHaveLength(2);
    const round1Set = new Set(rounds[0].map((p) => `${p.leader.id}-${p.follower.id}`));
    const repeats = rounds[1].filter((p) => round1Set.has(`${p.leader.id}-${p.follower.id}`));
    expect(repeats).toHaveLength(0);
  });

  it('generates max pairs when leaders outnumber followers (all same level)', () => {
    const ls = ['a', 'b', 'c', 'd', 'e'].map((id) => leader(id, 'Newcomer'));
    const fs = ['x', 'y', 'z'].map((id) => follower(id, 'Newcomer'));
    const pairs = generatePairsByLevel(ls, fs, levels);

    expect(pairs).toHaveLength(5);
    const usedLeaderIds = new Set(pairs.map((p) => p.leader.id));
    ls.forEach((l) => expect(usedLeaderIds.has(l.id)).toBe(true));
  });
});

describe('generateRounds', () => {
  it('generates the correct number of rounds', () => {
    const rounds = generateRounds(
      [leader('a'), leader('b')],
      [follower('x'), follower('y')],
      3,
      false,
      [],
    );
    expect(rounds).toHaveLength(3);
  });

  it('avoids repeating pairs across rounds when possible', () => {
    const leaders = [leader('a'), leader('b')];
    const followers = [follower('x'), follower('y')];
    const rounds = generateRounds(leaders, followers, 2, false, []);

    const round1Pairings = new Set(rounds[0].map((p) => `${p.leader.id}-${p.follower.id}`));
    const round2Pairings = rounds[1].map((p) => `${p.leader.id}-${p.follower.id}`);
    const repeats = round2Pairings.filter((p) => round1Pairings.has(p)).length;
    expect(repeats).toBe(0);
  });

  it('generates correct number of pairs per round in pairByLevel mode', () => {
    const rounds = generateRounds([leader('a', 'Newcomer')], [follower('x', 'Newcomer')], 2, true, [
      'Newcomer',
    ]);
    expect(rounds).toHaveLength(2);
    expect(rounds[0]).toHaveLength(1);
    // Round 2 forces a repeat (only one possible pair), exercising the repeat penalty
    expect(rounds[1]).toHaveLength(1);
    expect(rounds[1][0].leader.id).toBe('a');
    expect(rounds[1][0].follower.id).toBe('x');
  });

  it('generates correct number of pairs per round with equal counts', () => {
    const rounds = generateRounds(
      [leader('a'), leader('b')],
      [follower('x'), follower('y')],
      2,
      false,
      [],
    );
    expect(rounds[0]).toHaveLength(2);
    expect(rounds[1]).toHaveLength(2);
  });
});

// ─── Helpers for history tests ────────────────────────────────────────────────

const LEVELS = ['Newcomer', 'Novice', 'Intermediate', 'Advanced'];

function session(id: string, ...rounds: [Person, Person][][]): Session {
  return {
    id,
    createdAt: 0,
    rounds: rounds.map((round) => round.map(([l, f]) => ({ leader: l, follower: f }))),
  };
}

const couples = (round: Pair[]) => round.map((p) => `${p.leader.id}-${p.follower.id}`).sort();

function bruteForceMin(cost: number[][]): number {
  const n = cost.length;
  const m = cost[0].length;
  let best = Infinity;
  const used = new Array<boolean>(m).fill(false);
  const walk = (row: number, total: number) => {
    if (row === n) {
      best = Math.min(best, total);
      return;
    }
    for (let c = 0; c < m; c++) {
      if (used[c]) continue;
      used[c] = true;
      walk(row + 1, total + cost[row][c]);
      used[c] = false;
    }
  };
  walk(0, 0);
  return best;
}

describe('solveAssignment', () => {
  it('returns empty for an empty matrix', () => {
    expect(solveAssignment([])).toEqual([]);
  });

  it('finds the minimum total on square and rectangular matrices', () => {
    for (let trial = 0; trial < 50; trial++) {
      const n = 1 + (trial % 5);
      const m = n + (trial % 3);
      const cost = Array.from({ length: n }, () =>
        Array.from({ length: m }, () => Math.floor(Math.random() * 100)),
      );
      const result = solveAssignment(cost);
      expect(new Set(result).size).toBe(n);
      const total = result.reduce((sum, c, r) => sum + cost[r][c], 0);
      expect(total).toBe(bruteForceMin(cost));
    }
  });
});

describe('pastSessionCosts', () => {
  const a = leader('a');
  const x = follower('x');

  it('weighs the last session 100 and halves for each older one, cumulatively', () => {
    const costs = pastSessionCosts([
      session('s1', [[a, x]]),
      session('s2', [[a, x]]),
      session('s3', [[a, x]]),
    ]);
    expect(costs.get('a|x')).toBe(100 + 50 + 25);
  });

  it('counts each round a couple danced together', () => {
    const costs = pastSessionCosts([session('s1', [[a, x]], [[a, x]])]);
    expect(costs.get('a|x')).toBe(200);
  });

  it(`ignores sessions older than the last ${MAX_PAST_SESSIONS}`, () => {
    const old = session('old', [[a, x]]);
    const recent = Array.from({ length: MAX_PAST_SESSIONS }, (_, i) => session(`s${i}`));
    expect(pastSessionCosts([old, ...recent]).has('a|x')).toBe(false);
  });
});

describe('cross-session history', () => {
  it('never repeats last session’s couples when an alternative exists', () => {
    const ls = ['a', 'b', 'c', 'd'].map((id) => leader(id, 'Novice'));
    const fs = ['w', 'x', 'y', 'z'].map((id) => follower(id, 'Novice'));
    const past = [
      session(
        's1',
        ls.map((l, i) => [l, fs[i]] as [Person, Person]),
      ),
    ];
    for (let trial = 0; trial < 20; trial++) {
      const pairs = generatePairsByLevel(ls, fs, LEVELS, { pastSessions: past });
      const last = new Set(couples(past[0].rounds[0]));
      expect(couples(pairs).filter((c) => last.has(c))).toEqual([]);
    }
  });

  it('rotates through everyone over consecutive weeks of the same class', () => {
    const ls = ['a', 'b', 'c'].map((id) => leader(id, 'Novice'));
    const fs = ['x', 'y', 'z'].map((id) => follower(id, 'Novice'));
    const sessions: Session[] = [];
    for (let week = 0; week < 3; week++) {
      const rounds = generateRounds(ls, fs, 1, true, LEVELS, { pastSessions: sessions });
      sessions.push({ id: `w${week}`, createdAt: week, rounds });
    }
    const all = sessions.flatMap((s) => couples(s.rounds[0]));
    expect(new Set(all).size).toBe(9); // 3 weeks × 3 couples, all different
  });

  it('beats greedy matching: avoids a repeat by accepting two small level gaps', () => {
    // Greedy (leader A first) would take A–X (gap 0) and leave B with Y, last week's partner.
    const A = leader('A', 'Advanced');
    const B = leader('B', 'Intermediate');
    const X = follower('X', 'Advanced');
    const Y = follower('Y', 'Intermediate');
    const pastSessions = [session('s1', [[B, Y]])];
    for (let trial = 0; trial < 20; trial++) {
      const pairs = generatePairsByLevel([A, B], [X, Y], LEVELS, { pastSessions });
      expect(couples(pairs)).toEqual(['A-Y', 'B-X']);
    }
  });

  it('prefers a partner one level apart over last session’s partner', () => {
    const a = leader('a', 'Novice');
    const x = follower('x', 'Novice');
    const y = follower('y', 'Intermediate');
    const pastSessions = [session('s1', [[a, x]])];
    const pairs = generatePairsByLevel([a], [x, y], LEVELS, { pastSessions });
    // a dances twice (2 followers, 1 leader): no choice. Use two leaders instead:
    expect(pairs).toHaveLength(2);
    const b = leader('b', 'Intermediate');
    for (let trial = 0; trial < 20; trial++) {
      const two = generatePairsByLevel([a, b], [x, y], LEVELS, { pastSessions });
      expect(couples(two)).toEqual(['a-y', 'b-x']);
    }
  });

  it('keeps level matching when the only repeat is 3 sessions old and the gap is 2 levels', () => {
    const a = leader('a', 'Newcomer');
    const b = leader('b', 'Intermediate');
    const x = follower('x', 'Newcomer');
    const y = follower('y', 'Intermediate');
    // a–x danced 3 sessions ago (cost 25) < swapping (2 × 40)
    const pastSessions = [session('s1', [[a, x]]), session('s2'), session('s3')];
    for (let trial = 0; trial < 20; trial++) {
      const pairs = generatePairsByLevel([a, b], [x, y], LEVELS, { pastSessions });
      expect(couples(pairs)).toEqual(['a-x', 'b-y']);
    }
  });

  it('also uses history in random mode', () => {
    const a = leader('a');
    const b = leader('b');
    const x = follower('x');
    const y = follower('y');
    const pastSessions = [session('s1', [[a, x]])];
    for (let trial = 0; trial < 20; trial++) {
      expect(couples(generatePairs([a, b], [x, y], { pastSessions }))).toEqual(['a-y', 'b-x']);
    }
  });
});

describe('extra dances with uneven numbers', () => {
  it('rotates who dances twice across rounds', () => {
    const ls = ['a', 'b', 'c'].map((id) => leader(id));
    const fs = ['x', 'y'].map((id) => follower(id));
    const rounds = generateRounds(ls, fs, 2, false, []);
    const twice = rounds.map((round) => {
      const counts = new Map<string, number>();
      round.forEach((p) => counts.set(p.follower.id, (counts.get(p.follower.id) ?? 0) + 1));
      return [...counts].find(([, n]) => n === 2)![0];
    });
    expect(twice[0]).not.toBe(twice[1]);
  });

  it('spreads extra dances evenly when one side is much larger', () => {
    const ls = ['a', 'b', 'c', 'd', 'e'].map((id) => leader(id));
    const fs = ['x', 'y'].map((id) => follower(id));
    const [round] = generateRounds(ls, fs, 1, false, []);
    const counts = fs.map((f) => round.filter((p) => p.follower.id === f.id).length).sort();
    expect(counts).toEqual([2, 3]);
  });
});

describe('dance order', () => {
  const ls = [leader('n', 'Newcomer'), leader('i', 'Intermediate'), leader('a', 'Advanced')];
  const fs = [follower('N', 'Newcomer'), follower('I', 'Intermediate'), follower('A', 'Advanced')];

  it('puts the highest-level couples first by default', () => {
    const pairs = generatePairsByLevel(ls, fs, LEVELS);
    expect(pairs.map((p) => p.leader.id)).toEqual(['a', 'i', 'n']);
  });

  it('puts the lowest-level couples first when asked', () => {
    const pairs = generatePairsByLevel(ls, fs, LEVELS, { danceOrder: 'lowest' });
    expect(pairs.map((p) => p.leader.id)).toEqual(['n', 'i', 'a']);
  });

  it('keeps level matching but shuffles the order when random', () => {
    const orders = new Set<string>();
    for (let trial = 0; trial < 40; trial++) {
      const pairs = generatePairsByLevel(ls, fs, LEVELS, { danceOrder: 'random' });
      expect(couples(pairs)).toEqual(['a-A', 'i-I', 'n-N']);
      orders.add(pairs.map((p) => p.leader.id).join());
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it('applies the chosen order in random mode too', () => {
    const pairs = generateRounds(ls, fs, 1, false, LEVELS, { danceOrder: 'lowest' })[0];
    const level = (p: Pair) => LEVELS.indexOf(p.leader.level) + LEVELS.indexOf(p.follower.level);
    const levels = pairs.map(level);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  it('defaults to random order in random mode', () => {
    const orders = new Set<string>();
    for (let trial = 0; trial < 40; trial++) {
      const [round] = generateRounds(ls, fs, 1, false, LEVELS);
      orders.add(round.map((p) => p.leader.id).join());
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it('never puts someone’s two dances back to back when avoidable', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => leader(id, 'Novice'));
    const few = ['x', 'y', 'z'].map((id) => follower(id, 'Novice'));
    for (let trial = 0; trial < 20; trial++) {
      const pairs = generatePairsByLevel(many, few, LEVELS);
      for (let i = 1; i < pairs.length; i++) {
        expect(pairs[i].follower.id).not.toBe(pairs[i - 1].follower.id);
      }
    }
  });
});

describe('spreadRepeatDancers', () => {
  const ids = (pairs: Pair[]) => pairs.map((p) => `${p.leader.id}${p.follower.id}`);

  it('moves a later couple between two dances of the same person', () => {
    const input: Pair[] = [
      { leader: leader('a'), follower: follower('x') },
      { leader: leader('b'), follower: follower('x') },
      { leader: leader('c'), follower: follower('y') },
    ];
    expect(ids(spreadRepeatDancers(input))).toEqual(['ax', 'cy', 'bx']);
  });

  it('plans ahead so the end of the round is not stuck with a back-to-back', () => {
    // Sorted order x, y, z, z: greedy-in-place would leave z, z at the end.
    const input: Pair[] = [
      { leader: leader('a'), follower: follower('x') },
      { leader: leader('b'), follower: follower('y') },
      { leader: leader('c'), follower: follower('z') },
      { leader: leader('d'), follower: follower('z') },
    ];
    expect(ids(spreadRepeatDancers(input))).toEqual(['ax', 'cz', 'by', 'dz']);
  });

  it('works when leaders are the side that repeats', () => {
    const input: Pair[] = [
      { leader: leader('a'), follower: follower('x') },
      { leader: leader('a'), follower: follower('y') },
      { leader: leader('b'), follower: follower('z') },
    ];
    expect(ids(spreadRepeatDancers(input))).toEqual(['ax', 'bz', 'ay']);
  });

  it('keeps going when back-to-back dances cannot be avoided', () => {
    const input: Pair[] = [
      { leader: leader('a'), follower: follower('x') },
      { leader: leader('b'), follower: follower('x') },
      { leader: leader('c'), follower: follower('x') },
      { leader: leader('d'), follower: follower('y') },
    ];
    const result = spreadRepeatDancers(input);
    expect(result).toHaveLength(4);
    expect(new Set(ids(result))).toEqual(new Set(ids(input)));
  });

  it('does not reorder when nobody dances twice', () => {
    const input: Pair[] = [
      { leader: leader('a'), follower: follower('x') },
      { leader: leader('b'), follower: follower('y') },
    ];
    expect(spreadRepeatDancers(input)).toEqual(input);
  });
});
