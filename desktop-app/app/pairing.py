"""
Device pairing and token management for AttentionTracker Windows Desktop App.
"""

import os
import re
import socket
import logging
from pathlib import Path
from typing import Tuple, Optional
import urllib.request
import urllib.error
import json

try:
    import platformdirs
    USER_DATA_DIR = Path(platformdirs.user_data_dir("AttentionTracker", "AttentionTracker"))
except ImportError:
    # Standard Windows fallback: %APPDATA%\AttentionTracker
    appdata = os.environ.get("APPDATA", str(Path.home()))
    USER_DATA_DIR = Path(appdata) / "AttentionTracker"

USER_DATA_DIR.mkdir(parents=True, exist_ok=True)
TOKEN_FILE = USER_DATA_DIR / "device_token.txt"

logger = logging.getLogger(__name__)

# Crockford Base32 8-character regex (no I, O, 1, 0)
PAIRING_CODE_REGEX = re.compile(r"^[A-HJ-KM-NP-Z2-9]{8}$")


def validate_pairing_code(code: str) -> bool:
    """Validate 8-character Crockford Base32 pairing code format."""
    if not isinstance(code, str):
        return False
    return bool(PAIRING_CODE_REGEX.match(code.strip().upper()))


def get_stored_device_token() -> Optional[str]:
    """Retrieve stored device token from keyring or user data directory."""
    # Try keyring first if available
    try:
        import keyring
        token = keyring.get_password("AttentionTracker", "device_token")
        if token and token.strip():
            return token.strip()
    except Exception as e:
        logger.debug(f"Keyring read failed, falling back to file: {e}")

    # Fallback to local user data directory
    if TOKEN_FILE.exists():
        try:
            token = TOKEN_FILE.read_text(encoding="utf-8").strip()
            if token:
                return token
        except Exception as e:
            logger.error(f"Failed to read token file: {e}")

    return None


def store_device_token(token: str) -> None:
    """Store device token securely in keyring and user data directory."""
    token = token.strip()
    try:
        import keyring
        keyring.set_password("AttentionTracker", "device_token", token)
    except Exception as e:
        logger.debug(f"Keyring save failed: {e}")

    try:
        TOKEN_FILE.write_text(token, encoding="utf-8")
    except Exception as e:
        logger.error(f"Failed to save token to file: {e}")


def clear_device_token() -> None:
    """Clear stored device token."""
    try:
        import keyring
        keyring.delete_password("AttentionTracker", "device_token")
    except Exception:
        pass

    try:
        if TOKEN_FILE.exists():
            TOKEN_FILE.unlink()
    except Exception as e:
        logger.error(f"Failed to delete token file: {e}")


def pair_device(api_base_url: str, pairing_code: str, device_name: Optional[str] = None) -> Tuple[bool, str]:
    """
    Exchange pairing code with backend for a device token.
    Returns (success, token_or_error_message).
    """
    code = pairing_code.strip().upper()
    if not validate_pairing_code(code):
        return False, "Invalid pairing code format. Expected 8 alphanumeric characters (e.g. ABC23XYZ)."

    if not device_name:
        device_name = f"{socket.gethostname()} (Windows Desktop)"

    url = f"{api_base_url.rstrip('/')}/api/v1/devices/pair"
    payload = json.dumps({
        "code": code,
        "deviceName": device_name,
        "platform": "windows"
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            token = data.get("data", {}).get("token")
            if token:
                store_device_token(token)
                return True, token
            return False, "No token returned from server response."
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode("utf-8"))
            msg = body.get("error", {}).get("message") or body.get("message") or str(e)
            return False, f"Server rejected pairing: {msg}"
        except Exception:
            return False, f"HTTP Error {e.code}: {e.reason}"
    except urllib.error.URLError as e:
        return False, f"Connection failed: {e.reason}. Ensure backend is running."
    except Exception as e:
        return False, f"Pairing error: {str(e)}"
