import pytest
from pathlib import Path
from tracker.config import TrackerConfig, ConfigError, validate_url, load_config


def test_default_config():
    cfg = TrackerConfig()
    assert cfg.api_base_url == "http://127.0.0.1:8000/api/v1"
    assert cfg.dashboard_url == "http://localhost:5173"
    assert "chrome" in cfg.excluded_apps
    assert "msedge" in cfg.excluded_apps
    assert cfg.poll_seconds == 2
    assert cfg.idle_seconds == 60


def test_url_validation_http_security():
    # Valid loopback http
    assert validate_url("http://127.0.0.1:8000/api/v1/", "test") == "http://127.0.0.1:8000/api/v1"
    assert validate_url("http://localhost:5173", "test") == "http://localhost:5173"
    assert validate_url("http://[::1]:8000", "test") == "http://[::1]:8000"

    # Valid remote https
    assert validate_url("https://api.attentiontracker.com/v1", "test") == "https://api.attentiontracker.com/v1"

    # Invalid: plain http on remote host
    with pytest.raises(ConfigError, match="plain http on non-loopback host"):
        validate_url("http://api.attentiontracker.com/v1", "test")

    # Invalid: ftp or invalid scheme
    with pytest.raises(ConfigError, match="http or https scheme"):
        validate_url("ftp://127.0.0.1:8000", "test")


def test_excluded_apps_normalization():
    cfg = TrackerConfig(excluded_apps=["Chrome.exe", "  MSEDGE  ", "brave.EXE", "chrome"])
    assert cfg.excluded_apps == ["chrome", "msedge", "brave"]


def test_bounds_validation():
    with pytest.raises(ConfigError, match="poll_seconds"):
        TrackerConfig(poll_seconds=0)

    with pytest.raises(ConfigError, match="poll_seconds"):
        TrackerConfig(poll_seconds=31)

    with pytest.raises(ConfigError, match="idle_seconds"):
        TrackerConfig(idle_seconds=5)

    with pytest.raises(ConfigError, match="idle_seconds"):
        TrackerConfig(idle_seconds=601)


def test_load_config_from_toml(tmp_path: Path):
    cfg_file = tmp_path / "config.toml"
    cfg_file.write_text("""
api_base_url = "http://127.0.0.1:9000/api/v1"
dashboard_url = "http://localhost:3000"
excluded_apps = ["notepad.exe", "calc"]
poll_seconds = 5
idle_seconds = 120
""")

    loaded = load_config(cfg_file)
    assert loaded.api_base_url == "http://127.0.0.1:9000/api/v1"
    assert loaded.dashboard_url == "http://localhost:3000"
    assert loaded.excluded_apps == ["notepad", "calc"]
    assert loaded.poll_seconds == 5
    assert loaded.idle_seconds == 120
    assert loaded.device_token is None


def test_tracker_config_classmethod_load(tmp_path: Path):
    cfg_file = tmp_path / "config.toml"
    cfg_file.write_text("""
api_base_url = "http://127.0.0.1:8000/api/v1"
device_token = "tok_test_12345"
""")
    loaded = TrackerConfig.load(cfg_file)
    assert loaded.api_base_url == "http://127.0.0.1:8000/api/v1"
    assert loaded.device_token == "tok_test_12345"

