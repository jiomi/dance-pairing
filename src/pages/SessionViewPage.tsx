import { useParams, Link } from 'react-router-dom';
import { useRooms } from '../states/useRooms';
import { useSettings } from '../states/useSettings';
import { generateRounds } from '../utils/pairing';
import { formatSessionDate } from '../utils/date';
import type { Person } from '../types';
import styles from './SessionViewPage.module.css';

export default function SessionViewPage() {
  const { roomId, sessionId } = useParams<{ roomId: string; sessionId: string }>();
  const { getRoom, updateSessionRounds, togglePairDone } = useRooms();
  const { settings } = useSettings();

  const room = roomId ? getRoom(roomId) : undefined;
  const session = room?.sessions.find((s) => s.id === sessionId);

  if (!room || !session) {
    return (
      <div className={styles.page}>
        <p className={styles.notFound}>Session not found.</p>
        <Link to={roomId ? `/rooms/${roomId}` : '/'} className={styles.backLink}>
          ← Back
        </Link>
      </div>
    );
  }

  // Derive participants from stored rounds (deduplicated by id)
  const leaderMap = new Map<string, Person>();
  const followerMap = new Map<string, Person>();
  for (const round of session.rounds) {
    for (const pair of round) {
      leaderMap.set(pair.leader.id, pair.leader);
      followerMap.set(pair.follower.id, pair.follower);
    }
  }
  const sessionLeaders = [...leaderMap.values()];
  const sessionFollowers = [...followerMap.values()];
  const iterations = session.rounds.length;
  const pairByLevel = session.pairByLevel ?? false;

  const donePairs = new Set(session.donePairs ?? []);

  const reshuffle = () => {
    if (
      donePairs.size > 0 &&
      !window.confirm(
        `Shuffling clears the ${donePairs.size} couple${donePairs.size !== 1 ? 's' : ''} marked as done. Continue?`,
      )
    ) {
      return;
    }
    // Only sessions before this one count as history when reshuffling it.
    const pastSessions = room.sessions.slice(
      0,
      room.sessions.findIndex((s) => s.id === sessionId),
    );
    const newRounds = generateRounds(
      sessionLeaders,
      sessionFollowers,
      iterations,
      pairByLevel,
      settings.levels,
      { pastSessions, danceOrder: session.danceOrder },
    );
    updateSessionRounds(roomId!, sessionId!, newRounds);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to={`/rooms/${roomId}`} className={styles.backLink}>
          ← {room.name}
        </Link>
        <h1 className={styles.title}>{formatSessionDate(session.createdAt)}</h1>
        <button className={styles.shuffleBtn} onClick={reshuffle}>
          Shuffle
        </button>
      </header>

      <main className={styles.main}>
        {session.rounds.map((round, ri) => {
          const leaderSeq = new Map<string, number>();
          const followerSeq = new Map<string, number>();
          const annotated = round.map((pair) => {
            const lo = (leaderSeq.get(pair.leader.id) ?? 0) + 1;
            leaderSeq.set(pair.leader.id, lo);
            const fo = (followerSeq.get(pair.follower.id) ?? 0) + 1;
            followerSeq.set(pair.follower.id, fo);
            return { pair, leaderOrdinal: lo, followerOrdinal: fo };
          });
          return (
            <div key={ri}>
              {session.rounds.length > 1 && <h2 className={styles.roundTitle}>Round {ri + 1}</h2>}
              <ul className={styles.pairsList}>
                {annotated.map(({ pair, leaderOrdinal, followerOrdinal }, pi) => {
                  const key = `${ri}:${pi}`;
                  const done = donePairs.has(key);
                  return (
                    <li key={pi}>
                      <button
                        type="button"
                        className={`${styles.pairCard} ${done ? styles.pairCardDone : ''}`}
                        aria-pressed={done}
                        aria-label={`${pair.leader.name} and ${pair.follower.name}${done ? ', done' : ''}`}
                        onClick={() => togglePairDone(roomId!, sessionId!, key)}
                      >
                        <div className={styles.pairSide}>
                          <div className={styles.personInfo}>
                            <span className={styles.leaderName}>{pair.leader.name}</span>
                            {pair.leader.level && (
                              <span className={styles.pairLevel}>{pair.leader.level}</span>
                            )}
                          </div>
                          {leaderOrdinal > 1 && (
                            <span className={styles.badge} title={`Dance #${leaderOrdinal}`}>
                              ×{leaderOrdinal}
                            </span>
                          )}
                        </div>
                        {done ? (
                          <span className={styles.doneTag}>✓ Done</span>
                        ) : (
                          <span className={styles.divider}>↔</span>
                        )}
                        <div className={`${styles.pairSide} ${styles.pairSideRight}`}>
                          {followerOrdinal > 1 && (
                            <span className={styles.badge} title={`Dance #${followerOrdinal}`}>
                              ×{followerOrdinal}
                            </span>
                          )}
                          <div className={`${styles.personInfo} ${styles.personInfoRight}`}>
                            {pair.follower.level && (
                              <span className={styles.pairLevel}>{pair.follower.level}</span>
                            )}
                            <span className={styles.followerName}>{pair.follower.name}</span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </main>
    </div>
  );
}
