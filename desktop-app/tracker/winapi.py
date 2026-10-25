"""Windows API bindings for foreground window detection and idle time tracking.

This is the only module in the project that interacts with win32 / ctypes APIs.
"""

from __future__ import annotations

import sys
import ctypes
from ctypes import wintypes
from typing import Tuple, Optional

# LastInputInfo struct definition for ctypes
class LASTINPUTINFO(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.UINT),
        ("dwTime", wintypes.DWORD),
    ]


_last_input_info = LASTINPUTINFO()
_last_input_info.cbSize = ctypes.sizeof(LASTINPUTINFO)

_is_windows = sys.platform == "win32"
_user32 = None
_kernel32 = None

if _is_windows:
    try:
        _user32 = ctypes.windll.user32
        _kernel32 = ctypes.windll.kernel32
    except Exception:
        pass


def get_idle_seconds() -> float:
    """Return the number of seconds since the last user mouse/keyboard input."""
    if not _is_windows or not _user32 or not _kernel32:
        return 0.0

    try:
        if not _user32.GetLastInputInfo(ctypes.byref(_last_input_info)):
            return 0.0

        current_tick = _kernel32.GetTickCount()
        last_input_tick = _last_input_info.dwTime

        # Handle 32-bit wrap around (~49.7 days uptime)
        elapsed_ms = (current_tick - last_input_tick) & 0xFFFFFFFF
        return elapsed_ms / 1000.0
    except Exception:
        return 0.0


def get_foreground_app() -> Tuple[Optional[int], Optional[str]]:
    """Return (pid, app_name) of the current foreground application.

    App name is normalized to lowercase with trailing '.exe' stripped.
    Returns (None, None) if no window is focused or on system lock screen.
    """
    if not _is_windows or not _user32:
        return None, None

    try:
        hwnd = _user32.GetForegroundWindow()
        if not hwnd:
            return None, None

        pid_val = wintypes.DWORD()
        _user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid_val))
        pid = int(pid_val.value)
        if pid <= 0:
            return None, None

        # Look up process name using psutil
        try:
            import psutil
            proc = psutil.Process(pid)
            raw_name = proc.name()
        except Exception:
            return pid, "unknown"

        clean = raw_name.strip().lower()
        if clean.endswith(".exe"):
            clean = clean[:-4]

        # Filter empty or system idle process
        if not clean or clean in ("system", "system idle process"):
            return None, None

        return pid, clean
    except Exception:
        return None, None
