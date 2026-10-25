from pathlib import Path
from tracker.config import TrackerConfig
from tracker.buffer import EventBuffer
from tracker.sync import SyncClient
from tracker.engine import TrackingEngine


def test_engine_lifecycle_and_pause_resume(tmp_path: Path):
    db_file = tmp_path / "engine.db"
    buf = EventBuffer(db_file)
    cfg = TrackerConfig(poll_seconds=1, idle_seconds=60)

    clock = [1000.0]
    fg_state = [(100, "code")]
    idle_state = [0.0]

    sync_mock = SyncClient(
        api_base_url="http://127.0.0.1:8000/api/v1",
        buffer=buf,
        token_getter=lambda: "dummy_token",
    )

    engine = TrackingEngine(
        config=cfg,
        buffer=buf,
        sync_client=sync_mock,
        get_fg_app_fn=lambda: fg_state[0],
        get_idle_sec_fn=lambda: idle_state[0],
        time_fn=lambda: clock[0],
    )

    status = engine.status()
    assert status["running"] is False
    assert status["paused"] is False
    assert status["paired"] is True

    engine.start()
    assert engine.status()["running"] is True

    engine.pause()
    assert engine.status()["paused"] is True

    engine.resume()
    assert engine.status()["paused"] is False

    engine.stop()
    assert engine.status()["running"] is False


def test_crash_recovery(tmp_path: Path):
    db_file = tmp_path / "engine.db"
    buf = EventBuffer(db_file)
    cfg = TrackerConfig()

    # Simulate crashed previous session
    buf.set_state("in_progress_app", "code")
    buf.set_state("in_progress_start", "1000.0")
    buf.set_state("last_tick", "1050.0")

    engine = TrackingEngine(
        config=cfg,
        buffer=buf,
    )

    # State should have been recovered into an activity event
    act_count, _ = buf.get_counts()
    assert act_count == 1
    pending = buf.get_pending_activities()
    assert pending[0][1]["app"] == "code"
    assert pending[0][1]["source"] == "desktop"
