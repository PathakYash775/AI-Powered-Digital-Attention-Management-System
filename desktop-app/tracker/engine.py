"""Background tracking engine coordinating polling, state, buffering, and synchronization."""

from __future__ import annotations

import os
import threading
import time
from typing import Optional, Callable
from .config import TrackerConfig
from .segments import SegmentTracker
from .buffer import EventBuffer
from .sync import SyncClient
from . import winapi


class TrackingEngine:
    """Core daemon managing periodic foreground polling and synchronization."""

    @property
    def is_paused(self) -> bool:
        return self._paused

    def __init__(
        self,
        config: TrackerConfig,
        buffer: Optional[EventBuffer] = None,
        sync_client: Optional[SyncClient] = None,
        get_fg_app_fn: Optional[Callable[[], tuple[Optional[int], Optional[str]]]] = None,
        get_idle_sec_fn: Optional[Callable[[], float]] = None,
        time_fn: Optional[Callable[[], float]] = None,
    ) -> None:
        self.config = config
        self.buffer = buffer or EventBuffer()
        self.sync_client = sync_client or SyncClient(self.config.api_base_url, self.buffer)

        self._get_fg_app = get_fg_app_fn or winapi.get_foreground_app
        self._get_idle_sec = get_idle_sec_fn or winapi.get_idle_seconds
        self._time = time_fn or time.time

        self.segment_tracker = SegmentTracker(
            excluded_apps=self.config.excluded_apps,
            idle_threshold=float(self.config.idle_seconds),
            own_pid=os.getpid(),
        )

        self._running = False
        self._paused = False
        self._stop_event = threading.Event()
        self._poll_thread: Optional[threading.Thread] = None
        self._sync_thread: Optional[threading.Thread] = None

        self._recover_crash_state()

    def _recover_crash_state(self) -> None:
        """Recover in-flight segment from SQLite if previous process terminated abruptly."""
        try:
            in_prog_app = self.buffer.get_state("in_progress_app")
            in_prog_start = self.buffer.get_state("in_progress_start")
            last_tick = self.buffer.get_state("last_tick")

            if in_prog_app and in_prog_start and last_tick:
                start_f = float(in_prog_start)
                end_f = float(last_tick)
                if end_f > start_f and (end_f - start_f) >= 1.0:
                    from .segments import format_iso
                    import uuid
                    recovered_evt = {
                        "clientEventId": f"dsk_{uuid.uuid4().hex[:12]}",
                        "source": "desktop",
                        "app": in_prog_app,
                        "startedAt": format_iso(start_f),
                        "endedAt": format_iso(end_f),
                        "idle": False,
                    }
                    self.buffer.save_activities([recovered_evt])

            # Clear state keys
            self.buffer.set_state("in_progress_app", "")
            self.buffer.set_state("in_progress_start", "")
            self.buffer.set_state("last_tick", "")
        except Exception:
            pass

    def start(self) -> None:
        """Start polling and synchronization worker threads."""
        if self._running:
            return

        self._running = True
        self._paused = False
        self._stop_event.clear()

        self._poll_thread = threading.Thread(target=self._poll_loop, name="AttentionPollThread", daemon=True)
        self._sync_thread = threading.Thread(target=self._sync_loop, name="AttentionSyncThread", daemon=True)

        self._poll_thread.start()
        self._sync_thread.start()

    def pause(self) -> None:
        """Pause activity tracking and sync."""
        self._paused = True
        now = self._time()
        acts, _ = self.segment_tracker.flush(now)
        if acts:
            self.buffer.save_activities(acts)
        self.buffer.set_state("in_progress_app", "")

    def resume(self) -> None:
        """Resume tracking after pause."""
        self._paused = False

    def stop(self) -> None:
        """Cleanly flush and stop tracking."""
        if not self._running:
            return

        self._running = False
        self._stop_event.set()

        # Flush open segment
        now = self._time()
        acts, _ = self.segment_tracker.flush(now)
        if acts:
            self.buffer.save_activities(acts)

        self.buffer.set_state("in_progress_app", "")
        self.buffer.set_state("in_progress_start", "")
        self.buffer.set_state("last_tick", "")

        # Immediate sync attempt before shutdown
        try:
            self.sync_client.sync_once()
        except Exception:
            pass

        if self._poll_thread and self._poll_thread.is_alive():
            self._poll_thread.join(timeout=1.0)
        if self._sync_thread and self._sync_thread.is_alive():
            self._sync_thread.join(timeout=1.0)

    def _poll_loop(self) -> None:
        """Main polling loop running every poll_seconds."""
        poll_interval = max(1, self.config.poll_seconds)
        state_save_counter = 0

        while not self._stop_event.is_set():
            if not self._paused:
                try:
                    now = self._time()
                    fg_pid, fg_app = self._get_fg_app()
                    idle_sec = self._get_idle_sec()

                    acts, switches = self.segment_tracker.tick(now, fg_pid, fg_app, idle_sec)
                    if acts:
                        self.buffer.save_activities(acts)
                    if switches:
                        self.buffer.save_switches(switches)

                    # Persist crash-recovery checkpoint every ~10s
                    state_save_counter += 1
                    if state_save_counter >= max(1, int(10 / poll_interval)):
                        state_save_counter = 0
                        if self.segment_tracker.current_app and self.segment_tracker.current_start:
                            self.buffer.set_state("in_progress_app", self.segment_tracker.current_app)
                            self.buffer.set_state("in_progress_start", str(self.segment_tracker.current_start))
                            self.buffer.set_state("last_tick", str(now))
                        else:
                            self.buffer.set_state("in_progress_app", "")
                except Exception:
                    pass

            self._stop_event.wait(timeout=poll_interval)

    def _sync_loop(self) -> None:
        """Background synchronization loop running every 60s."""
        while not self._stop_event.is_set():
            if not self._paused:
                try:
                    self.sync_client.sync_once()
                except Exception:
                    pass
            self._stop_event.wait(timeout=60.0)

    def status(self) -> dict:
        """Return real-time tracker operational telemetry."""
        pending_act, pending_sw = self.buffer.get_counts()
        token = self.sync_client._token_getter()

        return {
            "running": self._running,
            "paused": self._paused,
            "paired": bool(token),
            "current_app": self.segment_tracker.current_app,
            "is_idle": self.segment_tracker.is_idle,
            "pending_activities": pending_act,
            "pending_switches": pending_sw,
            "last_sync_time": self.sync_client.last_sync_time,
            "last_error": self.sync_client.last_error,
        }


# Convenient alias
TrackerEngine = TrackingEngine
