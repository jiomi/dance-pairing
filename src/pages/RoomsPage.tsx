import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRooms } from '../states/useRooms';
import ThemeToggle from '../components/ThemeToggle';
import type { Room } from '../types';
import styles from './RoomsPage.module.css';

export default function RoomsPage() {
  const navigate = useNavigate();
  const { rooms, addRoom, deleteRoom, renameRoom } = useRooms();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const clickTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addRoom(trimmed);
    setNewName('');
  };

  const startEdit = (room: Room) => {
    setEditingId(room.id);
    setEditingName(room.name);
  };

  const commitEdit = () => {
    if (editingId && editingName.trim()) {
      renameRoom(editingId, editingName.trim());
    }
    setEditingId(null);
  };

  const handleRoomClick = (room: Room) => {
    const existing = clickTimers.current.get(room.id);
    if (existing) {
      clearTimeout(existing);
      clickTimers.current.delete(room.id);
      startEdit(room);
    } else {
      const timer = setTimeout(() => {
        clickTimers.current.delete(room.id);
        navigate(`/rooms/${room.id}`);
      }, 250);
      clickTimers.current.set(room.id, timer);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dance Pairing</h1>
        <ThemeToggle />
        <Link to="/settings" className={styles.settingsLink} aria-label="Settings">
          ⚙
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.addRow}>
          <input
            className={styles.input}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="New room name…"
            aria-label="New room name"
          />
          <button className={styles.addBtn} onClick={handleAdd}>
            Add
          </button>
        </div>

        {rooms.length === 0 && <p className={styles.empty}>No rooms yet. Create one above.</p>}

        <ul className={styles.list}>
          {rooms.map((room) => (
            <li key={room.id} className={styles.item}>
              {editingId === room.id ? (
                <input
                  className={styles.inlineInput}
                  value={editingName}
                  autoFocus
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  aria-label="Room name"
                />
              ) : (
                <button className={styles.roomLink} onClick={() => handleRoomClick(room)}>
                  <span className={styles.roomName}>{room.name}</span>
                  <span className={styles.roomCount}>
                    {room.people.length} {room.people.length === 1 ? 'person' : 'people'}
                  </span>
                </button>
              )}
              <div className={styles.actions}>
                <button
                  className={styles.iconBtn}
                  onClick={() => startEdit(room)}
                  aria-label="Rename room"
                >
                  <span className={styles.pencil}>✏</span>
                </button>
                <button
                  className={`${styles.iconBtn} ${styles.deleteBtn}`}
                  onClick={() => {
                    if (window.confirm(`Delete room "${room.name}"?`)) {
                      deleteRoom(room.id);
                    }
                  }}
                  aria-label="Delete room"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
