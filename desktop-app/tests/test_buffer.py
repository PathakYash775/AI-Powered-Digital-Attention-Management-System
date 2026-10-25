from pathlib import Path
from tracker.buffer import EventBuffer, MAX_PENDING_ROWS


def test_buffer_activities_crud(tmp_path: Path):
    db_file = tmp_path / "test.db"
    buf = EventBuffer(db_file)

    events = [
        {"clientEventId": "evt_1", "app": "code", "startedAt": "2026-10-24T10:00:00Z", "endedAt": "2026-10-24T10:01:00Z", "idle": False},
        {"clientEventId": "evt_2", "app": "slack", "startedAt": "2026-10-24T10:01:00Z", "endedAt": "2026-10-24T10:02:00Z", "idle": False},
    ]

    inserted = buf.save_activities(events)
    assert inserted == 2

    # Duplicate insertion should be ignored
    dup_inserted = buf.save_activities(events)
    assert dup_inserted == 2  # attempted
    act_count, _ = buf.get_counts()
    assert act_count == 2  # actual rows unchanged

    pending = buf.get_pending_activities(limit=10)
    assert len(pending) == 2
    assert pending[0][1]["clientEventId"] == "evt_1"
    assert pending[1][1]["clientEventId"] == "evt_2"

    # Delete first item
    buf.delete_activities([pending[0][0]])
    act_count, _ = buf.get_counts()
    assert act_count == 1

    remaining = buf.get_pending_activities(limit=10)
    assert len(remaining) == 1
    assert remaining[0][1]["clientEventId"] == "evt_2"


def test_buffer_switches_crud(tmp_path: Path):
    db_file = tmp_path / "test.db"
    buf = EventBuffer(db_file)

    switches = [
        {"clientEventId": "sw_1", "fromApp": "code", "toApp": "slack", "switchedAt": "2026-10-24T10:00:00Z"},
    ]

    buf.save_switches(switches)
    _, sw_count = buf.get_counts()
    assert sw_count == 1

    pending = buf.get_pending_switches()
    assert len(pending) == 1
    assert pending[0][1]["fromApp"] == "code"

    buf.delete_switches([pending[0][0]])
    _, sw_count = buf.get_counts()
    assert sw_count == 0


def test_buffer_fifo_limit(tmp_path: Path):
    db_file = tmp_path / "test.db"
    buf = EventBuffer(db_file)

    # Insert 2100 items in batches
    batch = [
        {"clientEventId": f"evt_{i}", "app": "code", "startedAt": "2026-10-24T10:00:00Z", "endedAt": "2026-10-24T10:01:00Z", "idle": False}
        for i in range(MAX_PENDING_ROWS + 50)
    ]
    buf.save_activities(batch)

    act_count, _ = buf.get_counts()
    assert act_count == MAX_PENDING_ROWS


def test_buffer_state_persistence(tmp_path: Path):
    db_file = tmp_path / "test.db"
    buf = EventBuffer(db_file)

    buf.set_state("in_progress_app", "code")
    assert buf.get_state("in_progress_app") == "code"

    buf.set_state("in_progress_app", "slack")
    assert buf.get_state("in_progress_app") == "slack"

    assert buf.get_state("non_existent") is None
