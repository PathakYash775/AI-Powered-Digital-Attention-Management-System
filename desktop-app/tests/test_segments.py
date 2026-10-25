from tracker.segments import SegmentTracker, MAX_CHUNK_SECONDS


def test_basic_segment_creation():
    tracker = SegmentTracker(idle_threshold=60.0)
    t = 1000.0

    # Poll 1: start in code
    acts, sws = tracker.tick(t, fg_pid=100, fg_app="code", idle_sec=0.0)
    assert len(acts) == 0
    assert len(sws) == 0

    # Poll 2: still in code after 10 seconds
    t += 10.0
    acts, sws = tracker.tick(t, fg_pid=100, fg_app="code", idle_sec=0.0)
    assert len(acts) == 0

    # Flush on shutdown
    acts, sws = tracker.flush(t)
    assert len(acts) == 1
    assert acts[0]["app"] == "code"
    assert acts[0]["source"] == "desktop"
    assert acts[0]["idle"] is False


def test_app_switching_and_switch_events():
    tracker = SegmentTracker(idle_threshold=60.0)
    t = 1000.0

    # In code for 20s
    tracker.tick(t, fg_pid=100, fg_app="code", idle_sec=0.0)
    t += 20.0

    # Switch to slack
    acts, sws = tracker.tick(t, fg_pid=200, fg_app="slack", idle_sec=0.0)
    assert len(acts) == 1
    assert acts[0]["app"] == "code"
    assert len(sws) == 1
    assert sws[0]["fromApp"] == "code"
    assert sws[0]["toApp"] == "slack"

    # Stay in slack for 30s
    t += 30.0
    acts, _ = tracker.flush(t)
    assert len(acts) == 1
    assert acts[0]["app"] == "slack"


def test_idle_backdating():
    tracker = SegmentTracker(idle_threshold=60.0)
    t = 1000.0

    # Active in code from t=1000 to t=1040 (40 seconds active, polled regularly)
    for _ in range(20):
        tracker.tick(t, fg_pid=100, fg_app="code", idle_sec=0.0)
        t += 2.0
    tracker.tick(t, fg_pid=100, fg_app="code", idle_sec=0.0)

    # User steps away for 60 seconds (idle_sec = 60 at t=1100)
    t += 60.0
    acts, _ = tracker.tick(t, fg_pid=100, fg_app="code", idle_sec=60.0)

    # Segment should be closed and backdated to t=1040 (duration 40s)
    assert len(acts) == 1
    assert acts[0]["app"] == "code"
    # endedAt should correspond to t=1040 (1100 - 60)
    assert "Z" in acts[0]["endedAt"]
    assert acts[0]["startedAt"] != acts[0]["endedAt"]


def test_sleep_gap_detection():
    tracker = SegmentTracker(idle_threshold=60.0)
    t = 1000.0

    # In code at t=1000
    tracker.tick(t, fg_pid=100, fg_app="code", idle_sec=0.0)

    # Laptop sleeps for 500 seconds, next tick at t=1500
    t += 500.0
    acts, _ = tracker.tick(t, fg_pid=100, fg_app="code", idle_sec=0.0)

    # Since last_tick was 1000 and duration was 0, sub-second segment from t=1000 to t=1000 is discarded
    # Now let's test sleep after active duration:
    tracker2 = SegmentTracker(idle_threshold=60.0)
    t2 = 1000.0
    tracker2.tick(t2, fg_pid=100, fg_app="code", idle_sec=0.0)
    t2 += 20.0
    tracker2.tick(t2, fg_pid=100, fg_app="code", idle_sec=0.0)  # 20s accumulated

    # Now sleep for 300s
    t2 += 300.0
    acts2, _ = tracker2.tick(t2, fg_pid=100, fg_app="code", idle_sec=0.0)
    # The 20s active segment is closed at the sleep boundary
    assert len(acts2) == 1
    assert acts2[0]["app"] == "code"


def test_sub_second_discard():
    tracker = SegmentTracker(idle_threshold=60.0)
    t = 1000.0

    # In code for only 0.5 seconds
    tracker.tick(t, fg_pid=100, fg_app="code", idle_sec=0.0)
    t += 0.5
    acts, _ = tracker.tick(t, fg_pid=200, fg_app="slack", idle_sec=0.0)

    # Discarded because duration < 1s
    assert len(acts) == 0


def test_excluded_apps_produce_no_activity_but_produce_switches():
    tracker = SegmentTracker(excluded_apps=["chrome"], idle_threshold=60.0)
    t = 1000.0

    # Active in code for 20s
    tracker.tick(t, fg_pid=100, fg_app="code", idle_sec=0.0)
    t += 20.0

    # Switch to chrome (excluded)
    acts, sws = tracker.tick(t, fg_pid=200, fg_app="chrome", idle_sec=0.0)
    assert len(acts) == 1
    assert acts[0]["app"] == "code"
    assert len(sws) == 1
    assert sws[0]["fromApp"] == "code"
    assert sws[0]["toApp"] == "chrome"

    # User stays in chrome for 60s
    t += 60.0
    acts, sws = tracker.tick(t, fg_pid=200, fg_app="chrome", idle_sec=0.0)
    assert len(acts) == 0

    # User switches back to code
    acts, sws = tracker.tick(t, fg_pid=100, fg_app="code", idle_sec=0.0)
    assert len(acts) == 0  # no chrome segment
    assert len(sws) == 1
    assert sws[0]["fromApp"] == "chrome"
    assert sws[0]["toApp"] == "code"


def test_own_pid_ignored():
    tracker = SegmentTracker(own_pid=999, idle_threshold=60.0)
    t = 1000.0

    # In code
    tracker.tick(t, fg_pid=100, fg_app="code", idle_sec=0.0)
    t += 10.0

    # Own app window brought to foreground
    acts, sws = tracker.tick(t, fg_pid=999, fg_app="attentiontracker", idle_sec=0.0)
    assert len(acts) == 0
    assert len(sws) == 0
    assert tracker.current_app == "code"  # Code is still current app!


def test_four_hour_chunking():
    tracker = SegmentTracker(idle_threshold=60.0)
    t = 1000.0

    tracker.tick(t, fg_pid=100, fg_app="code", idle_sec=0.0)
    t += MAX_CHUNK_SECONDS + 10.0

    acts, _ = tracker.tick(t, fg_pid=100, fg_app="code", idle_sec=0.0)
    assert len(acts) == 1
    assert acts[0]["app"] == "code"
    # Still tracking code in next chunk
    assert tracker.current_app == "code"
