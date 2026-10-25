r"""
Windows autostart manager via HKCU\Software\Microsoft\Windows\CurrentVersion\Run.
"""

import sys
import winreg
import logging

logger = logging.getLogger(__name__)

RUN_KEY_PATH = r"Software\Microsoft\Windows\CurrentVersion\Run"


def set_autostart(app_name: str = "AttentionTracker", exe_path: str = None, enable: bool = True) -> bool:
    """Enable or disable autostart in Windows Registry (HKCU)."""
    try:
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            RUN_KEY_PATH,
            0,
            winreg.KEY_SET_VALUE | winreg.KEY_QUERY_VALUE
        )
    except OSError as e:
        logger.error(f"Failed to open registry run key: {e}")
        return False

    try:
        if enable:
            if not exe_path:
                exe_path = sys.executable
            # Ensure path is quoted if it contains spaces
            formatted_path = f'"{exe_path}"' if not exe_path.startswith('"') else exe_path
            winreg.SetValueEx(key, app_name, 0, winreg.REG_SZ, formatted_path)
            logger.info(f"Autostart enabled for {app_name}: {formatted_path}")
            return True
        else:
            try:
                winreg.DeleteValue(key, app_name)
                logger.info(f"Autostart disabled for {app_name}")
                return True
            except FileNotFoundError:
                # Value was not present, already disabled
                return True
    except OSError as e:
        logger.error(f"Failed to modify autostart registry value: {e}")
        return False
    finally:
        winreg.CloseKey(key)


def is_autostart_enabled(app_name: str = "AttentionTracker") -> bool:
    """Check if autostart is currently registered in HKCU."""
    try:
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            RUN_KEY_PATH,
            0,
            winreg.KEY_READ
        )
        try:
            val, _ = winreg.QueryValueEx(key, app_name)
            return bool(val)
        except FileNotFoundError:
            return False
        finally:
            winreg.CloseKey(key)
    except OSError:
        return False
