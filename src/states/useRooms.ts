import { useLocalStorage } from './useLocalStorage';
import type { Room, Person, Role, Session, Pair, DanceOrder } from '../types';

const STORAGE_KEY = 'dance-pairing:rooms';

function generateId(): string {
  return crypto.randomUUID();
}

export function useRooms() {
  const [rooms, setRooms] = useLocalStorage<Room[]>(STORAGE_KEY, []);

  const addRoom = (name: string) => {
    const newRoom: Room = { id: generateId(), name: name.trim(), people: [], sessions: [] };
    setRooms((prev) => [...prev, newRoom]);
  };

  const deleteRoom = (roomId: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  };

  const renameRoom = (roomId: string, name: string) => {
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, name: name.trim() } : r)));
  };

  const addPerson = (roomId: string, name: string, role: Role, level: string) => {
    const person: Person = { id: generateId(), name: name.trim(), role, level };
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, people: [...r.people, person] } : r)),
    );
  };

  const removePerson = (roomId: string, personId: string) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId ? { ...r, people: r.people.filter((p) => p.id !== personId) } : r,
      ),
    );
  };

  const renamePerson = (roomId: string, personId: string, name: string) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              people: r.people.map((p) => (p.id === personId ? { ...p, name: name.trim() } : p)),
            }
          : r,
      ),
    );
  };

  const changePersonLevel = (roomId: string, personId: string, level: string) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? { ...r, people: r.people.map((p) => (p.id === personId ? { ...p, level } : p)) }
          : r,
      ),
    );
  };

  const addSession = (
    roomId: string,
    rounds: Pair[][],
    pairByLevel: boolean,
    danceOrder?: DanceOrder,
  ): string => {
    const id = generateId();
    const session: Session = { id, createdAt: Date.now(), rounds, pairByLevel, danceOrder };
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, sessions: [...(r.sessions ?? []), session] } : r)),
    );
    return id;
  };

  const updateSessionRounds = (roomId: string, sessionId: string, rounds: Pair[][]): void => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              sessions: r.sessions.map((s) => (s.id === sessionId ? { ...s, rounds } : s)),
            }
          : r,
      ),
    );
  };

  const getRoom = (roomId: string): Room | undefined => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return undefined;
    return { ...room, sessions: room.sessions ?? [] };
  };

  return {
    rooms,
    addRoom,
    deleteRoom,
    renameRoom,
    addPerson,
    removePerson,
    renamePerson,
    changePersonLevel,
    addSession,
    updateSessionRounds,
    getRoom,
  };
}
