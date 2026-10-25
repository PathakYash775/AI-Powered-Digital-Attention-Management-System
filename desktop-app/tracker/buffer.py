"""SQLite-backed persistent buffer for activity logs and task switches."""

from __future__ import annotations

import json
import sqlite3
import threading
import time
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
import platformdirs

MAX_PENDING_ROWS = 2000
MAX_AGE_SECONDS = 6.5 * 86400  # 6.5 days TTL (server rejects > 7 days)


class EventBuffer:
    """Thread-safe SQLite persistent queue for activity and context switch events."""

    def __init__(self, db_path: Optional[Path | str] = None) -> None:
        if db_path:
            self.db_path = Path(db_path)
        else:
            data_dir = Path(platformdirs.user_data_dir("AttentionTracker", roaming=True))
            data_dir.mkdir(parents=True, exist_ok=True)
            self.db_path = data_dir / "events.db"

        self._lock = threading.Lock()
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=10.0)
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        return conn

    def _init_db(self) -> None:
        with self._lock:
            with self._get_connection() as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS activity_events (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        client_event_id TEXT UNIQUE,
                        payload TEXT NOT NULL,
                        created_at REAL NOT NULL
                    )
                """)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS switch_events (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        client_event_id TEXT UNIQUE,
                        payload TEXT NOT NULL,
                        created_at REAL NOT NULL
                    )
                """)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS tracker_state (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL
                    )
                """)
                conn.commit()

    def save_activities(self, events: List[Dict[str, Any]]) -> int:
        """Insert activity events into SQLite, ignoring duplicate clientEventIds."""
        if not events:
            return 0
        now = time.time()
        inserted = 0
        with self._lock:
            with self._get_connection() as conn:
                for evt in events:
                    try:
                        conn.execute(
                            "INSERT OR IGNORE INTO activity_events (client_event_id, payload, created_at) VALUES (?, ?, ?)",
                            (evt["clientEventId"], json.dumps(evt), now),
                        )
                        inserted += 1
                    except Exception:
                        pass
                conn.commit()
            self._enforce_limits()
        return inserted

    def save_switches(self, events: List[Dict[str, Any]]) -> int:
        """Insert switch events into SQLite, ignoring duplicate clientEventIds."""
        if not events:
            return 0
        now = time.time()
        inserted = 0
        with self._lock:
            with self._get_connection() as conn:
                for evt in events:
                    try:
                        conn.execute(
                            "INSERT OR IGNORE INTO switch_events (client_event_id, payload, created_at) VALUES (?, ?, ?)",
                            (evt["clientEventId"], json.dumps(evt), now),
                        )
                        inserted += 1
                    except Exception:
                        pass
                conn.commit()
            self._enforce_limits()
        return inserted

    def get_pending_activities(self, limit: int = 200) -> List[Tuple[int, Dict[str, Any]]]:
        """Fetch up to `limit` activity events sorted by id ASC."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.execute(
                    "SELECT id, payload FROM activity_events ORDER BY id ASC LIMIT ?",
                    (limit,),
                )
                results = []
                for row_id, payload_str in cursor.fetchall():
                    try:
                        results.append((row_id, json.loads(payload_str)))
                    except Exception:
                        # Malformed JSON row: drop it
                        conn.execute("DELETE FROM activity_events WHERE id = ?", (row_id,))
                return results

    def delete_activities(self, ids: List[int]) -> None:
        """Remove successfully synced activity records."""
        if not ids:
            return
        with self._lock:
            with self._get_connection() as conn:
                placeholders = ",".join("?" for _ in ids)
                conn.execute(f"DELETE FROM activity_events WHERE id IN ({placeholders})", ids)
                conn.commit()

    def get_pending_switches(self, limit: int = 200) -> List[Tuple[int, Dict[str, Any]]]:
        """Fetch up to `limit` switch events sorted by id ASC."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.execute(
                    "SELECT id, payload FROM switch_events ORDER BY id ASC LIMIT ?",
                    (limit,),
                )
                results = []
                for row_id, payload_str in cursor.fetchall():
                    try:
                        results.append((row_id, json.loads(payload_str)))
                    except Exception:
                        conn.execute("DELETE FROM switch_events WHERE id = ?", (row_id,))
                return results

    def delete_switches(self, ids: List[int]) -> None:
        """Remove successfully synced switch records."""
        if not ids:
            return
        with self._lock:
            with self._get_connection() as conn:
                placeholders = ",".join("?" for _ in ids)
                conn.execute(f"DELETE FROM switch_events WHERE id IN ({placeholders})", ids)
                conn.commit()

    def get_counts(self) -> Tuple[int, int]:
        """Return (activity_count, switch_count) in the buffer."""
        with self._lock:
            with self._get_connection() as conn:
                act_count = conn.execute("SELECT COUNT(*) FROM activity_events").fetchone()[0]
                sw_count = conn.execute("SELECT COUNT(*) FROM switch_events").fetchone()[0]
                return int(act_count), int(sw_count)

    def set_state(self, key: str, value: str) -> None:
        with self._lock:
            with self._get_connection() as conn:
                conn.execute(
                    "INSERT INTO tracker_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                    (key, value),
                )
                conn.commit()

    def get_state(self, key: str) -> Optional[str]:
        with self._lock:
            with self._get_connection() as conn:
                row = conn.execute("SELECT value FROM tracker_state WHERE key = ?", (key,)).fetchone()
                return str(row[0]) if row else None

    def _enforce_limits(self) -> None:
        """Purge rows exceeding 2000 limit (FIFO) and older than 6.5 days."""
        cutoff = time.time() - MAX_AGE_SECONDS
        with self._get_connection() as conn:
            # TTL purge
            conn.execute("DELETE FROM activity_events WHERE created_at < ?", (cutoff,))
            conn.execute("DELETE FROM switch_events WHERE created_at < ?", (cutoff,))

            # FIFO limit on activity_events
            count = conn.execute("SELECT COUNT(*) FROM activity_events").fetchone()[0]
            if count > MAX_PENDING_ROWS:
                overflow = count - MAX_PENDING_ROWS
                conn.execute(
                    "DELETE FROM activity_events WHERE id IN (SELECT id FROM activity_events ORDER BY id ASC LIMIT ?)",
                    (overflow,),
                )

            # FIFO limit on switch_events
            count_sw = conn.execute("SELECT COUNT(*) FROM switch_events").fetchone()[0]
            if count_sw > MAX_PENDING_ROWS:
                overflow = count_sw - MAX_PENDING_ROWS
                conn.execute(
                    "DELETE FROM switch_events WHERE id IN (SELECT id FROM switch_events ORDER BY id ASC LIMIT ?)",
                    (overflow,),
                )
            conn.commit()
