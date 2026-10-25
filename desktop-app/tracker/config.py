"""Configuration loader and validator for AttentionTracker."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse
import tomllib
import platformdirs

DEFAULT_API_URL = "http://127.0.0.1:8000/api/v1"
DEFAULT_DASHBOARD_URL = "http://localhost:5173"
DEFAULT_EXCLUDED_APPS = ["chrome", "msedge", "brave"]
DEFAULT_POLL_SECONDS = 2
DEFAULT_IDLE_SECONDS = 60


class ConfigError(ValueError):
    """Raised when configuration values fail validation."""
    pass


def validate_url(url: str, field_name: str) -> str:
    """Ensure URL is well-formed and restricts unencrypted HTTP to loopback addresses."""
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https"):
        raise ConfigError(f"{field_name} must have http or https scheme, got: '{parsed.scheme}'")
    if not parsed.netloc:
        raise ConfigError(f"{field_name} is missing a host: '{url}'")

    hostname = (parsed.hostname or "").lower()
    if parsed.scheme == "http" and hostname not in ("localhost", "127.0.0.1", "::1"):
        raise ConfigError(
            f"{field_name} uses plain http on non-loopback host '{hostname}'. Only https is allowed for remote endpoints."
        )
    return url.strip().rstrip("/")


@dataclass
class TrackerConfig:
    api_base_url: str = DEFAULT_API_URL
    dashboard_url: str = DEFAULT_DASHBOARD_URL
    excluded_apps: list[str] = field(default_factory=lambda: list(DEFAULT_EXCLUDED_APPS))
    poll_seconds: int = DEFAULT_POLL_SECONDS
    idle_seconds: int = DEFAULT_IDLE_SECONDS
    device_token: str | None = None

    @classmethod
    def load(cls, config_path: Path | str | None = None) -> TrackerConfig:
        """Load and validate configuration from specified path, default directory, or fallbacks."""
        return load_config(config_path)

    def __post_init__(self) -> None:
        self.api_base_url = validate_url(self.api_base_url, "api_base_url")
        self.dashboard_url = validate_url(self.dashboard_url, "dashboard_url")

        # Normalize excluded apps: lowercase, strip .exe and whitespace
        normalized = []
        for app in self.excluded_apps:
            clean = app.strip().lower()
            if clean.endswith(".exe"):
                clean = clean[:-4]
            if clean and clean not in normalized:
                normalized.append(clean)
        self.excluded_apps = normalized

        if not (1 <= self.poll_seconds <= 30):
            raise ConfigError(f"poll_seconds must be between 1 and 30, got: {self.poll_seconds}")
        if not (10 <= self.idle_seconds <= 600):
            raise ConfigError(f"idle_seconds must be between 10 and 600, got: {self.idle_seconds}")


def get_default_config_path() -> Path:
    """Return path to config.toml in user config directory."""
    config_dir = Path(platformdirs.user_config_dir("AttentionTracker", roaming=True))
    return config_dir / "config.toml"


def load_config(config_path: Path | str | None = None) -> TrackerConfig:
    """Load and validate configuration from specified path, default directory, or fallbacks."""
    target_path: Path
    if config_path:
        target_path = Path(config_path)
    else:
        # Check current working directory or next to script
        local_cfg = Path(__file__).resolve().parent.parent / "config.toml"
        if local_cfg.is_file():
            target_path = local_cfg
        else:
            target_path = get_default_config_path()

    if not target_path.is_file():
        # Return default config if file not found
        return TrackerConfig()

    try:
        with open(target_path, "rb") as f:
            data = tomllib.load(f)
    except Exception as e:
        raise ConfigError(f"Failed to parse TOML configuration at '{target_path}': {e}") from e

    return TrackerConfig(
        api_base_url=str(data.get("api_base_url", DEFAULT_API_URL)),
        dashboard_url=str(data.get("dashboard_url", DEFAULT_DASHBOARD_URL)),
        excluded_apps=list(data.get("excluded_apps", DEFAULT_EXCLUDED_APPS)),
        poll_seconds=int(data.get("poll_seconds", DEFAULT_POLL_SECONDS)),
        idle_seconds=int(data.get("idle_seconds", DEFAULT_IDLE_SECONDS)),
        device_token=str(data["device_token"]) if data.get("device_token") else None,
    )
