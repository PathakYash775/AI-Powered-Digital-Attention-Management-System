"""Activity segment aggregation and context switch detection engine."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Tuple, Dict, Any, Optional

MAX_CHUNK_SECONDS = 14400  # 4 hours
MAX_SWITCH_GAP_SECONDS = 300  # 5 minutes
SLEEP_GAP_THRESHOLD_SECONDS = 30.0  # System sleep / suspend gap


def format_iso(ts: float) -> str:
    """Format Unix timestamp as ISO-8601 UTC string with 'Z' suffix."""
    dt = datetime.fromtimestamp(ts, tz=timezone.utc)
    # Millisecond precision matching backend
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


class SegmentTracker:
    """State machine aggregating foreground polls into discrete activity segments and task switches."""

    def __init__(
        self,
        excluded_apps: Optional[List[str]] = None,
        idle_threshold: float = 60.0,
        own_pid: Optional[int] = None,
    ) -> None:
        self.excluded_apps = set(excluded_apps or ["chrome", "msedge", "brave"])
        self.idle_threshold = idle_threshold
        self.own_pid = own_pid

        # Active state
        self.is_idle: bool = False
        self.current_app: Optional[str] = None
        self.current_start: Optional[float] = None
        self.last_tick_time: Optional[float] = None

        # Previous session info for context switch linking
        self.last_active_app: Optional[str] = None
        self.last_active_end: Optional[float] = None

    def tick(
        self,
        now: float,
        fg_pid: Optional[int],
        fg_app: Optional[str],
        idle_sec: float,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Process a single poll tick. Returns (new_activity_events, new_switch_events)."""
        activities: List[Dict[str, Any]] = []
        switches: List[Dict[str, Any]] = []

        # If own PID is focused, treat as transparent (do not interrupt current tracking or track own window)
        if fg_pid is not None and self.own_pid is not None and fg_pid == self.own_pid:
            self.last_tick_time = now
            return activities, switches

        # 1. Check idle transition
        if idle_sec >= self.idle_threshold:
            if not self.is_idle:
                self.is_idle = True
                if self.current_app is not None and self.current_start is not None:
                    # Backdate segment end to when user actually went idle
                    backdated_end = max(self.current_start, now - idle_sec)
                    closed = self._close_segment(backdated_end)
                    if closed:
                        activities.append(closed)
            self.last_tick_time = now
            return activities, switches

        # User is active
        if self.is_idle:
            self.is_idle = False

        normalized_app = fg_app.strip().lower() if fg_app else None
        if normalized_app and normalized_app.endswith(".exe"):
            normalized_app = normalized_app[:-4]

        # 2. Check 4-hour max chunking (if continuing in same app)
        if (
            self.current_app is not None
            and normalized_app == self.current_app
            and self.current_start is not None
            and (now - self.current_start) >= MAX_CHUNK_SECONDS
        ):
            chunk_end = self.current_start + MAX_CHUNK_SECONDS
            closed = self._close_segment(chunk_end)
            if closed:
                activities.append(closed)
            self.current_app = normalized_app
            self.current_start = chunk_end
            self.last_active_app = normalized_app
            self.last_active_end = now
            self.last_tick_time = now
            return activities, switches

        # 3. Detect sleep / suspension gap
        if self.last_tick_time is not None and (now - self.last_tick_time) > SLEEP_GAP_THRESHOLD_SECONDS:
            if self.current_app is not None and self.current_start is not None:
                closed = self._close_segment(self.last_tick_time)
                if closed:
                    activities.append(closed)

        self.last_tick_time = now

        # 4. Check application change
        if normalized_app != self.current_app:
            # Close existing segment if any
            if self.current_app is not None and self.current_start is not None:
                closed = self._close_segment(now)
                if closed:
                    activities.append(closed)

            # Record task switch if transitioning between two valid apps within allowed gap
            if (
                normalized_app
                and self.last_active_app
                and normalized_app != self.last_active_app
                and self.last_active_end is not None
                and (now - self.last_active_end) <= MAX_SWITCH_GAP_SECONDS
            ):
                switches.append({
                    "clientEventId": f"sw_{uuid.uuid4().hex[:12]}",
                    "fromApp": self.last_active_app,
                    "toApp": normalized_app,
                    "switchedAt": format_iso(now),
                })

            # Start new segment if app is not excluded
            if normalized_app and normalized_app not in self.excluded_apps:
                self.current_app = normalized_app
                self.current_start = now
            else:
                self.current_app = None
                self.current_start = None

            if normalized_app:
                self.last_active_app = normalized_app
                self.last_active_end = now

        return activities, switches

    def flush(self, now: float) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Flush currently open segment on pause or shutdown."""
        activities: List[Dict[str, Any]] = []
        if self.current_app is not None and self.current_start is not None:
            closed = self._close_segment(now)
            if closed:
                activities.append(closed)
        return activities, []

    def _close_segment(self, end_time: float) -> Optional[Dict[str, Any]]:
        """Close current segment. Discards if duration < 1s."""
        if self.current_app is None or self.current_start is None:
            return None

        start = self.current_start
        app = self.current_app

        self.current_app = None
        self.current_start = None

        duration = max(0.0, end_time - start)
        if duration < 1.0:
            return None

        self.last_active_app = app
        self.last_active_end = end_time

        return {
            "clientEventId": f"dsk_{uuid.uuid4().hex[:12]}",
            "source": "desktop",
            "app": app,
            "startedAt": format_iso(start),
            "endedAt": format_iso(end_time),
            "idle": False,
        }
