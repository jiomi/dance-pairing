import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRooms } from '../states/useRooms';
import { useSettings } from '../states/useSettings';
import { generateRounds } from '../utils/pairing';
import type { DanceOrder, Person } from '../types';
import styles from './SessionPage.module.css';

export default function SessionPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { getRoom, addSession } = useRooms();
  const { settings } = useSettings();

  const room = roomId ? getRoom(roomId) : undefined;

  const [presentIds, setPresentIds] = useState<Set<string>>(
    () => new Set(room?.people.map((p) => p.id) ?? []),
  );
  const [pairByLevel, setPairByLevel] = useState(false);
  const [danceOrder, setDanceOrder] = useState<DanceOrder>('highest');
  const [iterations, setIterations] = useState(1);

  if (!room) {
    return (
      <div className={styles.page}>
        <p className={styles.notFound}>Room not found.</p>
        <Link to="/" className={styles.backLink}>
          ← Back to rooms
        </Link>
      </div>
    );
  }

  const presentPeople = room.people.filter((p) => presentIds.has(p.id));
  const presentLeaders = presentPeople.filter((p) => p.role === 'leader');
  const presentFollowers = presentPeople.filter((p) => p.role === 'follower');
  const canGenerate = presentLeaders.length > 0 && presentFollowers.length > 0;

  const togglePerson = (person: Person) => {
    setPresentIds((prev) => {
      const next = new Set(prev);
      if (next.has(person.id)) next.delete(person.id);
      else next.add(person.id);
      return next;
    });
  };

  const startPairing = () => {
    const rounds = generateRounds(
      presentLeaders,
      presentFollowers,
      iterations,
      pairByLevel,
      settings.levels,
      { pastSessions: room.sessions, danceOrder },
    );
    const sessionId = addSession(
      roomId!,
      rounds,
      pairByLevel,
      pairByLevel ? danceOrder : undefined,
    );
    navigate(`/rooms/${roomId}/sessions/${sessionId}`);
  };

  const roomLeaders = room.people.filter((p) => p.role === 'leader');
  const roomFollowers = room.people.filter((p) => p.role === 'follower');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to={`/rooms/${roomId}`} className={styles.backLink}>
          ← {room.name}
        </Link>
        <h1 className={styles.title}>Who's here?</h1>
      </header>

      <main className={styles.main}>
        {roomLeaders.length > 0 && (
          <div className={styles.group}>
            <h2 className={`${styles.groupTitle} ${styles.leaderGroupTitle}`}>Leaders</h2>
            {roomLeaders.map((person) => (
              <label key={person.id} className={styles.checkLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={presentIds.has(person.id)}
                  onChange={() => togglePerson(person)}
                />
                <span className={styles.checkName}>{person.name}</span>
                {person.level && <span className={styles.checkLevel}>{person.level}</span>}
              </label>
            ))}
          </div>
        )}

        {roomFollowers.length > 0 && (
          <div className={styles.group}>
            <h2 className={`${styles.groupTitle} ${styles.followerGroupTitle}`}>Followers</h2>
            {roomFollowers.map((person) => (
              <label key={person.id} className={styles.checkLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={presentIds.has(person.id)}
                  onChange={() => togglePerson(person)}
                />
                <span className={styles.checkName}>{person.name}</span>
                {person.level && <span className={styles.checkLevel}>{person.level}</span>}
              </label>
            ))}
          </div>
        )}

        <div className={styles.options}>
          <label className={styles.optionLabel}>
            <span>Match by level</span>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={pairByLevel}
              onChange={(e) => setPairByLevel(e.target.checked)}
            />
          </label>

          {pairByLevel && (
            <label className={styles.optionLabel}>
              <span>Dance order</span>
              <select
                className={styles.select}
                value={danceOrder}
                onChange={(e) => setDanceOrder(e.target.value as DanceOrder)}
              >
                <option value="highest">Highest level first</option>
                <option value="lowest">Lowest level first</option>
                <option value="random">Random</option>
              </select>
            </label>
          )}

          <label className={styles.optionLabel}>
            <span>Rounds</span>
            <input
              type="number"
              className={styles.iterationsInput}
              value={iterations}
              min={1}
              max={20}
              onChange={(e) => setIterations(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </label>
        </div>

        <p className={styles.summary}>
          {presentLeaders.length} leader{presentLeaders.length !== 1 ? 's' : ''},&nbsp;
          {presentFollowers.length} follower{presentFollowers.length !== 1 ? 's' : ''}
        </p>

        {!canGenerate && presentPeople.length > 0 && (
          <p className={styles.warning}>Need at least one leader and one follower.</p>
        )}
      </main>

      <footer className={styles.footer}>
        <button className={styles.generateBtn} onClick={startPairing} disabled={!canGenerate}>
          Generate Pairs
        </button>
      </footer>
    </div>
  );
}
