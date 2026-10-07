import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import App from './App';

const FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]} future={FUTURE_FLAGS}>
      <App />
    </MemoryRouter>,
  );
}

const ROOM_ID = 'test-room-1';

function seedRooms(
  rooms: {
    id: string;
    name: string;
    people: { id: string; name: string; role: string; level: string }[];
    sessions?: unknown[];
  }[],
) {
  localStorage.setItem('dance-pairing:rooms', JSON.stringify(rooms));
}

function seedRoom(
  people: { id: string; name: string; role: string; level: string }[] = [],
  sessions: unknown[] = [],
) {
  seedRooms([{ id: ROOM_ID, name: 'Salsa', people, sessions }]);
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

// ─── Rooms page ───────────────────────────────────────────────────────────────

describe('Rooms page', () => {
  it('renders the title', () => {
    renderApp();
    expect(screen.getByText('Dance Pairing')).toBeInTheDocument();
  });

  it('shows empty state when no rooms exist', () => {
    renderApp();
    expect(screen.getByText(/no rooms yet/i)).toBeInTheDocument();
  });

  it('creates a room', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByPlaceholderText(/new room name/i), 'Salsa');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Salsa')).toBeInTheDocument();
  });

  it('creates a room on Enter key', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByPlaceholderText(/new room name/i), 'Bachata{Enter}');
    expect(screen.getByText('Bachata')).toBeInTheDocument();
  });

  it('deletes a room', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByPlaceholderText(/new room name/i), 'Tango');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    await user.click(screen.getByRole('button', { name: /delete room/i }));
    expect(screen.queryByText('Tango')).not.toBeInTheDocument();
  });

  it('renames a room via rename button', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByPlaceholderText(/new room name/i), 'Waltz');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(screen.getByRole('button', { name: /rename room/i }));
    const input = screen.getByRole('textbox', { name: 'Room name' });
    await user.clear(input);
    await user.type(input, 'Kizomba{Enter}');
    expect(screen.getByText('Kizomba')).toBeInTheDocument();
    expect(screen.queryByText('Waltz')).not.toBeInTheDocument();
  });

  it('renames a room via double-click', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByPlaceholderText(/new room name/i), 'Foxtrot');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.dblClick(screen.getByRole('button', { name: /foxtrot/i }));
    const input = screen.getByRole('textbox', { name: 'Room name' });
    await user.clear(input);
    await user.type(input, 'Quickstep{Enter}');
    expect(screen.getByText('Quickstep')).toBeInTheDocument();
  });

  it('cancels rename via Escape key', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByPlaceholderText(/new room name/i), 'Rumba');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(screen.getByRole('button', { name: /rename room/i }));
    const input = screen.getByRole('textbox', { name: 'Room name' });
    await user.clear(input);
    await user.type(input, 'Should not appear');
    await user.keyboard('{Escape}');
    expect(screen.getByText('Rumba')).toBeInTheDocument();
    expect(screen.queryByText('Should not appear')).not.toBeInTheDocument();
  });

  it('does not rename when edit name is empty', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByPlaceholderText(/new room name/i), 'Cha-Cha');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(screen.getByRole('button', { name: /rename room/i }));
    const input = screen.getByRole('textbox', { name: 'Room name' });
    await user.clear(input);
    await user.keyboard('{Enter}');
    expect(screen.getByText('Cha-Cha')).toBeInTheDocument();
  });

  it('has a link to settings', () => {
    renderApp();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });
});

// ─── Room page ────────────────────────────────────────────────────────────────

describe('Room page', () => {
  it('shows not-found when room id is unknown', () => {
    renderApp('/rooms/nonexistent');
    expect(screen.getByText(/room not found/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to rooms/i })).toBeInTheDocument();
  });

  it('navigates to room detail and shows leaders and followers sections', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByPlaceholderText(/new room name/i), 'Salsa Class');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(screen.getByRole('button', { name: /salsa class/i }));
    await screen.findByText(/leaders \(0\)/i);
    expect(screen.getByText('Salsa Class')).toBeInTheDocument();
    expect(screen.getByText(/followers \(0\)/i)).toBeInTheDocument();
  });

  it('adds a leader and a follower', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByPlaceholderText(/new room name/i), 'Bachata');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(screen.getByRole('button', { name: /bachata/i }));
    await screen.findByPlaceholderText(/person's name/i);

    await user.type(screen.getByPlaceholderText(/person's name/i), 'Alice');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText(/leaders \(1\)/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: /role/i }), 'follower');
    await user.type(screen.getByPlaceholderText(/person's name/i), 'Bob');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText(/followers \(1\)/i)).toBeInTheDocument();
  });

  it('adds a person via Enter key', async () => {
    const user = userEvent.setup();
    seedRoom();
    renderApp(`/rooms/${ROOM_ID}`);
    await screen.findByPlaceholderText(/person's name/i);
    await user.type(screen.getByPlaceholderText(/person's name/i), 'Dana{Enter}');
    expect(screen.getByText('Dana')).toBeInTheDocument();
  });

  it('removes a person', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByPlaceholderText(/new room name/i), 'Tango');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(screen.getByRole('button', { name: /tango/i }));
    await screen.findByPlaceholderText(/person's name/i);
    await user.type(screen.getByPlaceholderText(/person's name/i), 'Carlos');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(screen.getByRole('button', { name: /remove person/i }));
    expect(screen.queryByText('Carlos')).not.toBeInTheDocument();
  });

  it('disables Start Session when room has no people', () => {
    seedRoom();
    renderApp(`/rooms/${ROOM_ID}`);
    expect(screen.getByRole('button', { name: /start session/i })).toBeDisabled();
  });

  describe('person rename', () => {
    beforeEach(async () => {
      seedRoom([{ id: 'p1', name: 'Alice', role: 'leader', level: 'Novice' }]);
    });

    it('renames a person via pencil button then Enter', async () => {
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}`);
      await user.click(screen.getByRole('button', { name: /rename person/i }));
      const input = screen.getByDisplayValue('Alice');
      await user.clear(input);
      await user.type(input, 'Alicia{Enter}');
      expect(screen.getByText('Alicia')).toBeInTheDocument();
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });

    it('renames a person via double-click on name', async () => {
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}`);
      await user.dblClick(screen.getByText('Alice'));
      const input = screen.getByDisplayValue('Alice');
      await user.clear(input);
      await user.type(input, 'Alicia{Enter}');
      expect(screen.getByText('Alicia')).toBeInTheDocument();
    });

    it('commits rename on blur', async () => {
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}`);
      await user.click(screen.getByRole('button', { name: /rename person/i }));
      const input = screen.getByDisplayValue('Alice');
      await user.clear(input);
      await user.type(input, 'Alicia');
      await user.tab();
      expect(screen.getByText('Alicia')).toBeInTheDocument();
    });

    it('cancels rename via Escape key', async () => {
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}`);
      await user.click(screen.getByRole('button', { name: /rename person/i }));
      const input = screen.getByDisplayValue('Alice');
      await user.clear(input);
      await user.type(input, 'Should not appear');
      await user.keyboard('{Escape}');
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText('Should not appear')).not.toBeInTheDocument();
    });

    it('cycles person level on level button click', async () => {
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}`);
      await user.click(screen.getByRole('button', { name: /level: novice/i }));
      expect(screen.getByRole('button', { name: /level: intermediate/i })).toBeInTheDocument();
    });
  });

  describe('session history', () => {
    const makeSession = (id: string, leaderName = 'Alice', followerName = 'Bob') => ({
      id,
      createdAt: Date.now(),
      rounds: [
        [
          {
            leader: { id: 'p1', name: leaderName, role: 'leader', level: 'Novice' },
            follower: { id: 'p2', name: followerName, role: 'follower', level: 'Novice' },
          },
        ],
      ],
    });

    it('shows recent sessions section', () => {
      seedRoom([], [makeSession('s1')]);
      renderApp(`/rooms/${ROOM_ID}`);
      expect(screen.getByText(/recent sessions/i)).toBeInTheDocument();
    });

    it('navigates to session view when clicked', async () => {
      const user = userEvent.setup();
      seedRoom([], [makeSession('s1')]);
      renderApp(`/rooms/${ROOM_ID}`);
      await user.click(screen.getByRole('link', { name: /round|pair/i }));
      expect(screen.getByText('Pairs')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('navigates back from session view to room', async () => {
      const user = userEvent.setup();
      seedRoom([], [makeSession('s1')]);
      renderApp(`/rooms/${ROOM_ID}`);
      await user.click(screen.getByRole('link', { name: /round|pair/i }));
      expect(screen.getByText('Pairs')).toBeInTheDocument();
      await user.click(screen.getByRole('link', { name: /salsa/i }));
      expect(screen.getByText(/recent sessions/i)).toBeInTheDocument();
    });

    it('shows session with multiple rounds', async () => {
      const user = userEvent.setup();
      const session = {
        id: 's1',
        createdAt: Date.now(),
        rounds: [
          [
            {
              leader: { id: 'p1', name: 'Alice', role: 'leader', level: '' },
              follower: { id: 'p2', name: 'Bob', role: 'follower', level: '' },
            },
          ],
          [
            {
              leader: { id: 'p1', name: 'Alice', role: 'leader', level: '' },
              follower: { id: 'p2', name: 'Bob', role: 'follower', level: '' },
            },
          ],
        ],
      };
      seedRoom([], [session]);
      renderApp(`/rooms/${ROOM_ID}`);
      await user.click(screen.getByRole('link', { name: /2 round/i }));
      expect(screen.getByText('Round 1')).toBeInTheDocument();
      expect(screen.getByText('Round 2')).toBeInTheDocument();
    });

    it('shows more sessions when "Show more" is clicked', async () => {
      const user = userEvent.setup();
      const sessions = Array.from({ length: 5 }, (_, i) => makeSession(`s${i}`));
      seedRoom([], sessions);
      renderApp(`/rooms/${ROOM_ID}`);
      expect(screen.getByText(/show more/i)).toBeInTheDocument();
      await user.click(screen.getByText(/show more/i));
      expect(screen.queryByText(/show more/i)).not.toBeInTheDocument();
    });
  });
});

// ─── Session page ─────────────────────────────────────────────────────────────

describe('Session page', () => {
  it('shows not-found for unknown room id', () => {
    renderApp('/rooms/nonexistent/session');
    expect(screen.getByText(/room not found/i)).toBeInTheDocument();
  });

  describe('attendance phase', () => {
    beforeEach(() => {
      seedRoom([
        { id: 'p1', name: 'Alice', role: 'leader', level: 'Novice' },
        { id: 'p2', name: 'Bob', role: 'follower', level: 'Novice' },
      ]);
    });

    it('renders attendance with leaders and followers', () => {
      renderApp(`/rooms/${ROOM_ID}/session`);
      expect(screen.getByText("Who's here?")).toBeInTheDocument();
      expect(screen.getByText('Leaders')).toBeInTheDocument();
      expect(screen.getByText('Followers')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('all people are checked by default', () => {
      renderApp(`/rooms/${ROOM_ID}/session`);
      const peopleCbs = screen
        .getAllByRole('checkbox')
        .filter((el) => !el.closest('label')?.textContent?.includes('Match'));
      peopleCbs.forEach((cb) => expect(cb).toBeChecked());
    });

    it('toggles a person off and back on', async () => {
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}/session`);
      const [aliceCb] = screen.getAllByRole('checkbox');
      await user.click(aliceCb);
      expect(aliceCb).not.toBeChecked();
      await user.click(aliceCb);
      expect(aliceCb).toBeChecked();
    });

    it('disables generate and shows warning when no followers present', async () => {
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}/session`);
      await user.click(screen.getAllByRole('checkbox')[1]); // uncheck Bob
      expect(screen.getByRole('button', { name: /generate pairs/i })).toBeDisabled();
      expect(screen.getByText(/need at least one leader and one follower/i)).toBeInTheDocument();
    });

    it('disables generate when no leaders present', async () => {
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}/session`);
      await user.click(screen.getAllByRole('checkbox')[0]); // uncheck Alice
      expect(screen.getByRole('button', { name: /generate pairs/i })).toBeDisabled();
    });

    it('toggles match-by-level option', async () => {
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}/session`);
      const matchCb = screen.getByRole('checkbox', { name: /match by level/i });
      await user.click(matchCb);
      expect(matchCb).toBeChecked();
    });

    it('changes round count via number input', async () => {
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}/session`);
      const input = screen.getByRole('spinbutton', { name: /rounds/i });
      await user.tripleClick(input);
      await user.keyboard('3');
      expect(input).toHaveValue(3);
    });
  });

  it('does not render leaders section when room has no leaders', () => {
    seedRoom([{ id: 'p1', name: 'Bob', role: 'follower', level: '' }]);
    renderApp(`/rooms/${ROOM_ID}/session`);
    expect(screen.queryByText('Leaders')).not.toBeInTheDocument();
    expect(screen.getByText('Followers')).toBeInTheDocument();
  });

  it('does not render followers section when room has no followers', () => {
    seedRoom([{ id: 'p1', name: 'Alice', role: 'leader', level: '' }]);
    renderApp(`/rooms/${ROOM_ID}/session`);
    expect(screen.queryByText('Followers')).not.toBeInTheDocument();
    expect(screen.getByText('Leaders')).toBeInTheDocument();
  });

  describe('pairs phase', () => {
    beforeEach(async () => {
      seedRoom([
        { id: 'p1', name: 'Alice', role: 'leader', level: 'Novice' },
        { id: 'p2', name: 'Bob', role: 'follower', level: 'Novice' },
      ]);
    });

    async function goToPairsPhase() {
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}/session`);
      await user.click(screen.getByRole('button', { name: /generate pairs/i }));
      return user;
    }

    it('transitions to pairs phase and shows pairs', async () => {
      await goToPairsPhase();
      expect(screen.getByText('Pairs')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('↔')).toBeInTheDocument();
    });

    it('shows person levels in pairs view', async () => {
      await goToPairsPhase();
      expect(screen.getAllByText('Novice').length).toBeGreaterThan(0);
    });

    it('reshuffles pairs', async () => {
      const user = await goToPairsPhase();
      await user.click(screen.getByRole('button', { name: /shuffle/i }));
      expect(screen.getByText('Pairs')).toBeInTheDocument();
    });

    it('saves session and navigates back to room from session view', async () => {
      const user = await goToPairsPhase();
      expect(screen.getByText('Pairs')).toBeInTheDocument();
      await user.click(screen.getByRole('link', { name: /salsa/i }));
      expect(screen.getByText('Salsa')).toBeInTheDocument();
      expect(screen.getByText(/recent sessions/i)).toBeInTheDocument();
    });

    it('shows round titles when multiple rounds are configured', async () => {
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}/session`);
      const input = screen.getByRole('spinbutton', { name: /rounds/i });
      await user.clear(input);
      await user.type(input, '2');
      await user.click(screen.getByRole('button', { name: /generate pairs/i }));
      expect(screen.getByText('Round 1')).toBeInTheDocument();
      expect(screen.getByText('Round 2')).toBeInTheDocument();
    });

    it('shows ×2 badge when follower dances more than once', async () => {
      seedRoom([
        { id: 'p1', name: 'Alice', role: 'leader', level: '' },
        { id: 'p2', name: 'Charlie', role: 'leader', level: '' },
        { id: 'p3', name: 'Bob', role: 'follower', level: '' },
      ]);
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}/session`);
      await user.click(screen.getByRole('button', { name: /generate pairs/i }));
      expect(screen.getByText('×2')).toBeInTheDocument();
    });

    it('shows ×2 badge when leader dances more than once', async () => {
      seedRoom([
        { id: 'p1', name: 'Alice', role: 'leader', level: '' },
        { id: 'p2', name: 'Bob', role: 'follower', level: '' },
        { id: 'p3', name: 'Carol', role: 'follower', level: '' },
      ]);
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}/session`);
      await user.click(screen.getByRole('button', { name: /generate pairs/i }));
      expect(screen.getByText('×2')).toBeInTheDocument();
    });

    it('generates pairs by level when match-by-level is enabled', async () => {
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}/session`);
      await user.click(screen.getByRole('checkbox', { name: /match by level/i }));
      await user.click(screen.getByRole('button', { name: /generate pairs/i }));
      expect(screen.getByText('Pairs')).toBeInTheDocument();
    });
  });

  describe('dance order and history', () => {
    const people = [
      { id: 'l1', name: 'Alice', role: 'leader', level: 'Newcomer' },
      { id: 'l2', name: 'Charlie', role: 'leader', level: 'Advanced' },
      { id: 'f1', name: 'Bob', role: 'follower', level: 'Newcomer' },
      { id: 'f2', name: 'Dana', role: 'follower', level: 'Advanced' },
    ];
    const byId = Object.fromEntries(people.map((p) => [p.id, p]));
    const pastSession = (id: string, couples: [string, string][], extra = {}) => ({
      id,
      createdAt: 0,
      rounds: [couples.map(([l, f]) => ({ leader: byId[l], follower: byId[f] }))],
      ...extra,
    });
    const storedSessions = () =>
      (
        JSON.parse(localStorage.getItem('dance-pairing:rooms')!) as {
          sessions: {
            id: string;
            danceOrder?: string;
            rounds: { leader: { id: string }; follower: { id: string } }[][];
          }[];
        }[]
      )[0].sessions;
    const couplesOf = (round: { leader: { id: string }; follower: { id: string } }[]) =>
      round.map((p) => `${p.leader.id}-${p.follower.id}`).sort();

    it('shows the dance order choice only when matching by level', async () => {
      seedRoom(people);
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}/session`);
      expect(screen.queryByRole('combobox', { name: /dance order/i })).not.toBeInTheDocument();
      await user.click(screen.getByRole('checkbox', { name: /match by level/i }));
      expect(screen.getByRole('combobox', { name: /dance order/i })).toHaveValue('highest');
    });

    it('lists the lowest-level couple first and saves the choice', async () => {
      seedRoom(people);
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}/session`);
      await user.click(screen.getByRole('checkbox', { name: /match by level/i }));
      await user.selectOptions(screen.getByRole('combobox', { name: /dance order/i }), 'lowest');
      await user.click(screen.getByRole('button', { name: /generate pairs/i }));

      const cards = screen.getAllByRole('listitem');
      expect(cards[0]).toHaveTextContent('Alice');
      expect(cards[1]).toHaveTextContent('Charlie');
      expect(storedSessions()[0].danceOrder).toBe('lowest');
    });

    it('avoids couples from the previous session', async () => {
      seedRoom(people, [
        pastSession('s1', [
          ['l1', 'f1'],
          ['l2', 'f2'],
        ]),
      ]);
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}/session`);
      await user.click(screen.getByRole('button', { name: /generate pairs/i }));
      expect(couplesOf(storedSessions()[1].rounds[0])).toEqual(['l1-f2', 'l2-f1']);
    });

    it('reshuffles using only sessions before the one being reshuffled', async () => {
      seedRoom(people, [
        pastSession('s1', [
          ['l1', 'f1'],
          ['l2', 'f2'],
        ]),
        pastSession(
          's2',
          [
            ['l1', 'f1'],
            ['l2', 'f2'],
          ],
          { pairByLevel: true, danceOrder: 'lowest' },
        ),
        pastSession('s3', [
          ['l1', 'f2'],
          ['l2', 'f1'],
        ]),
      ]);
      const user = userEvent.setup();
      renderApp(`/rooms/${ROOM_ID}/sessions/s2`);
      await user.click(screen.getByRole('button', { name: /shuffle/i }));
      // With only s1 as history: repeating its couples costs 2 × 100 = 200, crossing levels
      // costs 2 × 60 = 120 → cross. If s3 (a later session) were wrongly counted, crossing
      // would cost 320 and the level-matched couples would win.
      const s2 = storedSessions().find((s) => s.id === 's2')!;
      expect(couplesOf(s2.rounds[0])).toEqual(['l1-f2', 'l2-f1']);
      expect(s2.danceOrder).toBe('lowest');
    });
  });
});

// ─── Settings page ────────────────────────────────────────────────────────────

describe('Settings page', () => {
  function renderSettings() {
    return renderApp('/settings');
  }

  it('renders with default levels', () => {
    renderSettings();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Dance Levels')).toBeInTheDocument();
    expect(screen.getByText('Newcomer')).toBeInTheDocument();
    expect(screen.getByText('Novice')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('has a back link to rooms page', () => {
    renderSettings();
    expect(screen.getByRole('link', { name: /← back/i })).toBeInTheDocument();
  });

  it('adds a new level via Add button', async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.type(screen.getByPlaceholderText(/new level/i), 'Expert');
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    expect(screen.getByText('Expert')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/new level/i)).toHaveValue('');
  });

  it('adds a new level via Enter key', async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.type(screen.getByPlaceholderText(/new level/i), 'Pro{Enter}');
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('does not add an empty level', async () => {
    const user = userEvent.setup();
    renderSettings();
    const countBefore = screen.getAllByRole('listitem').length;
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    expect(screen.getAllByRole('listitem').length).toBe(countBefore);
  });

  it('deletes a level', async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getAllByRole('button', { name: /delete level/i })[0]);
    expect(screen.queryByText('Newcomer')).not.toBeInTheDocument();
  });

  it('move up button is disabled for the first item', () => {
    renderSettings();
    expect(screen.getAllByRole('button', { name: /move up/i })[0]).toBeDisabled();
  });

  it('move down button is disabled for the last item', () => {
    renderSettings();
    const btns = screen.getAllByRole('button', { name: /move down/i });
    expect(btns[btns.length - 1]).toBeDisabled();
  });

  it('moves a level up', async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getAllByRole('button', { name: /move up/i })[1]);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Novice');
    expect(items[1]).toHaveTextContent('Newcomer');
  });

  it('moves a level down', async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getAllByRole('button', { name: /move down/i })[0]);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Novice');
    expect(items[1]).toHaveTextContent('Newcomer');
  });

  describe('rename level', () => {
    it('renames via pencil button then Enter', async () => {
      const user = userEvent.setup();
      renderSettings();
      await user.click(screen.getAllByRole('button', { name: /rename level/i })[0]);
      const input = screen.getByRole('textbox', { name: 'Level name' });
      await user.clear(input);
      await user.type(input, 'Beginner{Enter}');
      expect(screen.getByText('Beginner')).toBeInTheDocument();
      expect(screen.queryByText('Newcomer')).not.toBeInTheDocument();
    });

    it('commits rename on blur', async () => {
      const user = userEvent.setup();
      renderSettings();
      await user.click(screen.getAllByRole('button', { name: /rename level/i })[0]);
      const input = screen.getByRole('textbox', { name: 'Level name' });
      await user.clear(input);
      await user.type(input, 'Beginner');
      await user.tab();
      expect(screen.getByText('Beginner')).toBeInTheDocument();
    });

    it('cancels rename on Escape', async () => {
      const user = userEvent.setup();
      renderSettings();
      await user.click(screen.getAllByRole('button', { name: /rename level/i })[0]);
      const input = screen.getByRole('textbox', { name: 'Level name' });
      await user.clear(input);
      await user.type(input, 'Should not appear');
      await user.keyboard('{Escape}');
      expect(screen.getByText('Newcomer')).toBeInTheDocument();
      expect(screen.queryByText('Should not appear')).not.toBeInTheDocument();
    });

    it('does not rename when input is cleared', async () => {
      const user = userEvent.setup();
      renderSettings();
      await user.click(screen.getAllByRole('button', { name: /rename level/i })[0]);
      const input = screen.getByRole('textbox', { name: 'Level name' });
      await user.clear(input);
      await user.keyboard('{Enter}');
      expect(screen.getByText('Newcomer')).toBeInTheDocument();
    });
  });

  describe('reset to defaults', () => {
    it('calls confirm dialog', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderSettings();
      await user.click(screen.getByRole('button', { name: /reset to defaults/i }));
      expect(confirmSpy).toHaveBeenCalledWith('Reset levels to defaults?');
    });

    it('clears editing state when clicked', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderSettings();
      await user.click(screen.getAllByRole('button', { name: /rename level/i })[0]);
      expect(screen.getByRole('textbox', { name: 'Level name' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /reset to defaults/i }));
      expect(screen.queryByRole('textbox', { name: 'Level name' })).not.toBeInTheDocument();
    });
  });
});

// ─── useLocalStorage error handling ──────────────────────────────────────────

describe('useLocalStorage', () => {
  it('falls back to initial value when stored data is invalid JSON', () => {
    localStorage.setItem('dance-pairing:rooms', 'not-valid-json');
    renderApp();
    expect(screen.getByText(/no rooms yet/i)).toBeInTheDocument();
  });
});
