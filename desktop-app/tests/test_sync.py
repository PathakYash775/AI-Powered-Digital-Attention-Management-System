from pathlib import Path
from unittest.mock import MagicMock, patch
import requests
from tracker.buffer import EventBuffer
from tracker.sync import SyncClient


def test_sync_without_token(tmp_path: Path):
    buf = EventBuffer(tmp_path / "sync.db")
    client = SyncClient(
        api_base_url="http://127.0.0.1:8000/api/v1",
        buffer=buf,
        token_getter=lambda: None,
    )

    result = client.sync_once()
    assert result["status"] == "unpaired"


def test_sync_success_clears_buffer(tmp_path: Path):
    buf = EventBuffer(tmp_path / "sync.db")
    buf.save_activities([
        {"clientEventId": "evt_1", "app": "code", "startedAt": "2026-10-24T10:00:00Z", "endedAt": "2026-10-24T10:01:00Z", "idle": False}
    ])
    buf.save_switches([
        {"clientEventId": "sw_1", "fromApp": "code", "toApp": "slack", "switchedAt": "2026-10-24T10:01:00Z"}
    ])

    client = SyncClient(
        api_base_url="http://127.0.0.1:8000/api/v1",
        buffer=buf,
        token_getter=lambda: "test_token",
    )

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"received": 1, "inserted": 1}

    with patch("requests.post", return_value=mock_resp):
        res = client.sync_once()

    assert res["status"] == "ok"
    assert res["synced_activities"] == 1
    assert res["synced_switches"] == 1

    act_count, sw_count = buf.get_counts()
    assert act_count == 0
    assert sw_count == 0


def test_sync_bad_request_drops_batch(tmp_path: Path):
    buf = EventBuffer(tmp_path / "sync.db")
    buf.save_activities([
        {"clientEventId": "bad_evt", "app": "invalid", "startedAt": "2026-10-24T10:00:00Z", "endedAt": "2026-10-24T10:01:00Z", "idle": False}
    ])

    client = SyncClient(
        api_base_url="http://127.0.0.1:8000/api/v1",
        buffer=buf,
        token_getter=lambda: "test_token",
    )

    mock_resp = MagicMock()
    mock_resp.status_code = 400
    mock_resp.text = '{"error": {"code": "VALIDATION_ERROR"}}'

    with patch("requests.post", return_value=mock_resp):
        res = client.sync_once()

    # Batch was dropped to avoid permanent queue blockage
    act_count, _ = buf.get_counts()
    assert act_count == 0
    assert client.dropped_count == 1


def test_sync_auth_revoked_clears_token(tmp_path: Path):
    buf = EventBuffer(tmp_path / "sync.db")
    buf.save_activities([
        {"clientEventId": "evt_1", "app": "code", "startedAt": "2026-10-24T10:00:00Z", "endedAt": "2026-10-24T10:01:00Z", "idle": False}
    ])

    token_cleared = []

    client = SyncClient(
        api_base_url="http://127.0.0.1:8000/api/v1",
        buffer=buf,
        token_getter=lambda: "revoked_token",
        token_clearer=lambda: token_cleared.append(True),
    )

    mock_resp = MagicMock()
    mock_resp.status_code = 401

    with patch("requests.post", return_value=mock_resp):
        res = client.sync_once()

    assert res["status"] == "auth_revoked"
    assert len(token_cleared) == 1
    # Events retained in buffer so user can re-pair without losing data
    act_count, _ = buf.get_counts()
    assert act_count == 1


def test_sync_server_error_retains_events(tmp_path: Path):
    buf = EventBuffer(tmp_path / "sync.db")
    buf.save_activities([
        {"clientEventId": "evt_1", "app": "code", "startedAt": "2026-10-24T10:00:00Z", "endedAt": "2026-10-24T10:01:00Z", "idle": False}
    ])

    client = SyncClient(
        api_base_url="http://127.0.0.1:8000/api/v1",
        buffer=buf,
        token_getter=lambda: "test_token",
    )

    with patch("requests.post", side_effect=requests.ConnectionError("Connection refused")):
        res = client.sync_once()

    assert res["status"] == "error"
    act_count, _ = buf.get_counts()
    assert act_count == 1
