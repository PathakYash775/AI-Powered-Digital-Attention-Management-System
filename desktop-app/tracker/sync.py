"""HTTP Synchronization agent for transmitting buffered activity to the backend API."""

from __future__ import annotations

import time
import requests
from typing import Optional, Callable
from .buffer import EventBuffer

REQUEST_TIMEOUT_SECONDS = 8.0
MAX_BATCH_SIZE = 200
MAX_BATCHES_PER_CYCLE = 5


class SyncClient:
    """Handles batched HTTP ingest against the Digital Attention API."""

    def __init__(
        self,
        api_base_url: str,
        buffer: EventBuffer,
        token_getter: Optional[Callable[[], Optional[str]]] = None,
        token_clearer: Optional[Callable[[], None]] = None,
    ) -> None:
        self.api_base_url = api_base_url.rstrip("/")
        self.buffer = buffer
        self._token_getter = token_getter or self._default_get_token
        self._token_clearer = token_clearer or self._default_clear_token

        self.last_sync_time: Optional[float] = None
        self.last_error: Optional[str] = None
        self.dropped_count: int = 0

    def _default_get_token(self) -> Optional[str]:
        try:
            import keyring
            return keyring.get_password("AttentionTracker", "device_token")
        except Exception:
            return None

    def _default_clear_token(self) -> None:
        try:
            import keyring
            keyring.delete_password("AttentionTracker", "device_token")
        except Exception:
            pass

    def sync_once(self) -> dict:
        """Perform a single sync cycle. Returns status summary."""
        token = self._token_getter()
        if not token:
            return {"status": "unpaired", "synced_activities": 0, "synced_switches": 0}

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        synced_activities = 0
        synced_switches = 0

        # 1. Sync activity events
        for _ in range(MAX_BATCHES_PER_CYCLE):
            batch = self.buffer.get_pending_activities(limit=MAX_BATCH_SIZE)
            if not batch:
                break

            ids = [row[0] for row in batch]
            events = [row[1] for row in batch]

            try:
                resp = requests.post(
                    f"{self.api_base_url}/ingest/activity",
                    json={"events": events},
                    headers=headers,
                    timeout=REQUEST_TIMEOUT_SECONDS,
                )

                if resp.status_code == 200:
                    self.buffer.delete_activities(ids)
                    synced_activities += len(ids)
                    self.last_sync_time = time.time()
                    self.last_error = None
                elif resp.status_code == 400:
                    # Malformed or rejected batch: drop to prevent queue lockup
                    self.buffer.delete_activities(ids)
                    self.dropped_count += len(ids)
                    self.last_error = f"HTTP 400 Validation Error: {resp.text[:200]}"
                elif resp.status_code == 401:
                    # Token revoked or invalid
                    self._token_clearer()
                    self.last_error = "Device authentication revoked (HTTP 401)"
                    return {"status": "auth_revoked", "synced_activities": synced_activities, "synced_switches": synced_switches}
                elif resp.status_code == 429:
                    self.last_error = "Rate limited (HTTP 429)"
                    break  # Retry next cycle
                else:
                    self.last_error = f"Server returned HTTP {resp.status_code}"
                    break
            except (requests.RequestException, Exception) as exc:
                self.last_error = f"Network failure: {exc}"
                break

        # 2. Sync switch events
        for _ in range(MAX_BATCHES_PER_CYCLE):
            batch = self.buffer.get_pending_switches(limit=MAX_BATCH_SIZE)
            if not batch:
                break

            ids = [row[0] for row in batch]
            events = [row[1] for row in batch]

            try:
                resp = requests.post(
                    f"{self.api_base_url}/ingest/switches",
                    json={"events": events},
                    headers=headers,
                    timeout=REQUEST_TIMEOUT_SECONDS,
                )

                if resp.status_code == 200:
                    self.buffer.delete_switches(ids)
                    synced_switches += len(ids)
                    self.last_sync_time = time.time()
                    self.last_error = None
                elif resp.status_code == 400:
                    self.buffer.delete_switches(ids)
                    self.dropped_count += len(ids)
                    self.last_error = f"HTTP 400 Validation Error on switches: {resp.text[:200]}"
                elif resp.status_code == 401:
                    self._token_clearer()
                    return {"status": "auth_revoked", "synced_activities": synced_activities, "synced_switches": synced_switches}
                elif resp.status_code == 429:
                    break
                else:
                    break
            except (requests.RequestException, Exception) as exc:
                self.last_error = f"Network failure: {exc}"
                break

        return {
            "status": "ok" if not self.last_error else "error",
            "synced_activities": synced_activities,
            "synced_switches": synced_switches,
            "error": self.last_error,
        }
