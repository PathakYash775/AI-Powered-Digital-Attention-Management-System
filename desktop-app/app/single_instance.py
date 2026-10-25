"""
Single instance mutex for Windows.
Prevents multiple instances of AttentionTracker from running simultaneously.
"""

import ctypes
from ctypes import wintypes
import logging

logger = logging.getLogger(__name__)

ERROR_ALREADY_EXISTS = 183


class SingleInstance:
    """Acquires a named Win32 mutex. If already held by another process, acquire() returns False."""

    def __init__(self, name: str = "AttentionTrackerSingleInstanceMutex") -> None:
        self.mutex_name = f"Local\\{name}"
        self.handle = None
        self.already_running = False

    def acquire(self) -> bool:
        """Attempt to acquire the single-instance mutex.
        
        Returns:
            bool: True if this is the only running instance, False if another is already running.
        """
        try:
            kernel32 = ctypes.windll.kernel32
            # CreateMutexW(security_attributes, initial_owner, name)
            self.handle = kernel32.CreateMutexW(None, False, self.mutex_name)
            last_error = kernel32.GetLastError()
            if last_error == ERROR_ALREADY_EXISTS:
                self.already_running = True
                logger.warning("Another instance of AttentionTracker is already running.")
                return False
            self.already_running = False
            return True
        except Exception as e:
            logger.error(f"Error checking single instance mutex: {e}")
            # If Win32 API call fails for any unexpected reason, don't block startup
            return True

    def release(self) -> None:
        """Release the mutex handle on app exit."""
        if self.handle:
            try:
                ctypes.windll.kernel32.CloseHandle(self.handle)
            except Exception as e:
                logger.debug(f"Error closing mutex handle: {e}")
            finally:
                self.handle = None
