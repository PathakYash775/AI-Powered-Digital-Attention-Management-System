"""
Desktop App Shell for AttentionTracker.
Integrates PyWebView (WebView2), pystray (System Tray), and the background TrackerEngine.
"""

import os
import sys
import time
import socket
import logging
import threading
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional

from tracker.config import TrackerConfig, load_config
from tracker.engine import TrackerEngine
from app.single_instance import (
    SingleInstance,
    signal_existing_instance,
    SHOW_EVENT_NAME,
)
from app.autostart import set_autostart, is_autostart_enabled
from app.pairing import (
    get_stored_device_token,
    store_device_token,
    pair_device,
    USER_DATA_DIR,
)

logger = logging.getLogger("AttentionTracker.Shell")


def is_service_reachable(url: str, timeout: float = 2.0) -> bool:
    """Test if a URL endpoint is reachable."""
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=timeout):
            return True
    except (urllib.error.HTTPError, urllib.error.URLError, socket.timeout, ConnectionError):
        # Some dev servers return 404/405 to HEAD, try GET
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=timeout):
                return True
        except urllib.error.HTTPError:
            # Server responded with an HTTP status code, so it is reachable!
            return True
        except Exception:
            return False
    except Exception:
        return False


class DesktopAppJsApi:
    """JavaScript API bridge exposed to the WebView window."""

    def __init__(self, shell: "AttentionDesktopApp") -> None:
        self._shell = shell

    def pair(self, code: str) -> dict:
        """Called by pair.html when user submits an 8-character pairing code."""
        success, token_or_err = pair_device(self._shell.config.api_base_url, code)
        if success:
            self._shell.on_device_paired(token_or_err)
            return {"success": True, "dashboardUrl": self._shell.dashboard_url}
        else:
            return {"success": False, "error": token_or_err}

    def check_health(self) -> dict:
        """Check status of backend and frontend."""
        base = self._shell.config.api_base_url.rstrip("/")
        if base.endswith("/api/v1"):
            base = base[:-7]
        backend_ok = is_service_reachable(f"{base}/healthz")
        frontend_ok = is_service_reachable(self._shell.dashboard_url)
        return {
            "frontendReachable": frontend_ok,
            "backendReachable": backend_ok,
            "trackingActive": self._shell.engine is not None and not self._shell.engine.is_paused,
        }

    def unpair(self) -> dict:
        """Clear device token from memory and disk, pause tracking."""
        self._shell.config.device_token = None
        from app.pairing import TOKEN_FILE
        try:
            if TOKEN_FILE.exists():
                TOKEN_FILE.unlink()
            import keyring
            keyring.delete_password("AttentionTracker", "device_token")
        except Exception:
            pass
        if self._shell.engine:
            self._shell.engine.pause()
        return {"success": True}


class AttentionDesktopApp:
    """Main desktop application coordinator."""

    def __init__(self, config: Optional[TrackerConfig] = None) -> None:
        self.config = config or load_config()
        self.engine: Optional[TrackerEngine] = None
        self.window = None
        self.tray_icon = None
        self.single_instance = SingleInstance()
        self.dashboard_url = os.environ.get("ATTENTION_DASHBOARD_URL", self.config.dashboard_url)
        
        if getattr(sys, "frozen", False):
            base_dir = Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
            if not (base_dir / "app").exists() and (Path(sys.executable).parent / "_internal").exists():
                base_dir = Path(sys.executable).parent / "_internal"
        else:
            base_dir = Path(__file__).resolve().parent.parent

        self.app_dir = base_dir / "app"
        self.assets_dir = base_dir / "assets"
        self._is_terminating = False
        self.show_event = None

        # Load stored token if not in config
        if not self.config.device_token:
            stored_token = get_stored_device_token()
            if stored_token:
                self.config.device_token = stored_token
                logger.info("Loaded device token from secure storage.")

    def initialize_tracker(self) -> None:
        """Initialize and start background tracking engine if token is available."""
        if self.config.device_token:
            try:
                self.engine = TrackerEngine(self.config)
                self.engine.start()
                logger.info("Background tracking engine started.")
            except Exception as e:
                logger.error(f"Failed to start tracker engine: {e}")
        else:
            logger.warning("No device token configured. Tracker is paused until device is paired.")

    def on_device_paired(self, token: str) -> None:
        """Callback invoked when pairing succeeds."""
        self.config.device_token = token
        store_device_token(token)
        if not self.engine:
            self.initialize_tracker()
        elif self.engine.is_paused:
            self.engine.resume()
        logger.info("Device paired and tracker active.")

    def toggle_tracking(self) -> None:
        """Toggle engine between paused and running."""
        if not self.engine:
            if self.config.device_token:
                self.initialize_tracker()
            return

        if self.engine.is_paused:
            self.engine.resume()
            logger.info("Tracking resumed from system tray.")
        else:
            self.engine.pause()
            logger.info("Tracking paused from system tray.")

    def create_tray_icon(self):
        """Create and start the system tray icon."""
        try:
            import pystray
            from PIL import Image
        except ImportError:
            logger.warning("pystray or PIL not available. Running without system tray icon.")
            return

        icon_path = self.assets_dir / "app.ico"
        if icon_path.exists():
            image = Image.open(str(icon_path))
        else:
            # Fallback 16x16 solid blue icon
            image = Image.new("RGBA", (16, 16), (59, 130, 246, 255))

        def on_show_dashboard(icon, item):
            if self.window:
                self.window.restore()
                self.window.show()

        def on_toggle_pause(icon, item):
            self.toggle_tracking()

        def on_open_settings(icon, item):
            if self.window:
                self.window.load_url(f"{self.dashboard_url.rstrip('/')}/settings")
                self.window.restore()
                self.window.show()

        def on_toggle_autostart(icon, item):
            current = is_autostart_enabled()
            set_autostart(enable=not current)

        def on_quit(icon, item):
            self.quit()

        def get_pause_label(item):
            if not self.engine:
                return "Tracker: Not Paired"
            return "Resume Tracking" if self.engine.is_paused else "Pause Tracking"

        def is_autostart_checked(item):
            return is_autostart_enabled()

        def on_open_pair(icon, item):
            if self.window:
                self.window.load_url((self.app_dir / "pair.html").as_uri())
                self.window.restore()
                self.window.show()

        def on_refresh_screen(icon, item):
            if self.window:
                try:
                    self.window.restore()
                    self.window.show()
                    self.window.evaluate_js("window.location.reload();")
                except Exception as e:
                    logger.debug(f"Error reloading window via tray: {e}")

        menu = pystray.Menu(
            pystray.MenuItem("Show Dashboard", on_show_dashboard, default=True),
            pystray.MenuItem("Refresh Screen", on_refresh_screen),
            pystray.MenuItem("Pair / Connect Device...", on_open_pair),
            pystray.MenuItem(get_pause_label, on_toggle_pause),
            pystray.MenuItem("Settings", on_open_settings),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Start with Windows", on_toggle_autostart, checked=is_autostart_checked),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Quit", on_quit)
        )

        self.tray_icon = pystray.Icon("AttentionTracker", image, "Attention Tracker", menu)
        threading.Thread(target=self.tray_icon.run, daemon=True).start()
        logger.info("System tray icon started.")

    def get_initial_url(self) -> str:
        """Determine initial URL based on reachability and pairing state."""
        if "--pair" in sys.argv:
            return (self.app_dir / "pair.html").as_uri()

        # 1. Check if frontend dashboard is reachable
        dashboard_reachable = is_service_reachable(self.dashboard_url)
        if not dashboard_reachable:
            offline_path = (self.app_dir / "offline.html").as_uri()
            return f"{offline_path}?target={self.dashboard_url}"

        # 2. Check if paired
        if not self.config.device_token:
            return (self.app_dir / "pair.html").as_uri()

        # 3. Everything normal, open dashboard
        return self.dashboard_url

    def on_window_closing(self) -> bool:
        """Minimize to tray when user closes window instead of quitting."""
        if self._is_terminating:
            return True  # Allow close

        if self.window:
            self.window.hide()
            logger.info("Window hidden to system tray.")
            return False  # Prevent window destroy
        return True

    def quit(self) -> None:
        """Clean shutdown of all components."""
        self._is_terminating = True
        logger.info("Shutting down Attention Desktop App...")

        if self.engine:
            try:
                self.engine.stop()
            except Exception as e:
                logger.error(f"Error stopping engine: {e}")

        if self.show_event:
            try:
                import ctypes
                ctypes.windll.kernel32.CloseHandle(self.show_event)
            except Exception:
                pass
            self.show_event = None

        if self.tray_icon:
            try:
                self.tray_icon.stop()
            except Exception as e:
                logger.debug(f"Error stopping tray icon: {e}")

        self.single_instance.release()

        if self.window:
            try:
                self.window.destroy()
            except Exception:
                pass

        sys.exit(0)

    def _listen_for_show_event(self) -> None:
        """Background thread waiting for signal from a secondary instance to restore window."""
        if not self.show_event:
            return
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            while not self._is_terminating:
                res = kernel32.WaitForSingleObject(self.show_event, 500)
                if res == 0:  # WAIT_OBJECT_0
                    logger.info("Received show window signal from secondary instance.")
                    if self.window:
                        try:
                            self.window.restore()
                            self.window.show()
                        except Exception as e:
                            logger.debug(f"Error restoring window via show event: {e}")
        except Exception as e:
            logger.debug(f"Exception in _listen_for_show_event: {e}")

    def run(self) -> None:
        """Main application entry point."""
        # 1. Single instance check
        if not self.single_instance.acquire():
            print("Another instance of AttentionTracker is already running. Restoring existing window...")
            signal_existing_instance()
            sys.exit(0)

        # 2. Start listener for show signals from secondary instances
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            self.show_event = kernel32.CreateEventW(None, False, False, SHOW_EVENT_NAME)
            threading.Thread(target=self._listen_for_show_event, daemon=True).start()
        except Exception as e:
            logger.debug(f"Failed to create show event: {e}")

        # 3. Start tracker engine
        self.initialize_tracker()

        # 4. Start tray icon
        self.create_tray_icon()

        # 5. Start PyWebView
        initial_url = self.get_initial_url()
        js_api = DesktopAppJsApi(self)

        try:
            import webview

            # Configure WebView2 storage profile for persistent logins
            profile_dir = USER_DATA_DIR / "WebViewProfile"
            profile_dir.mkdir(parents=True, exist_ok=True)
            webview.settings['ALLOW_DOWNLOADS'] = True

            self.window = webview.create_window(
                title="Attention Management System",
                url=initial_url,
                js_api=js_api,
                width=1280,
                height=840,
                min_size=(800, 600),
                text_select=True,
            )

            # Hook close event to minimize to tray
            self.window.events.closing += self.on_window_closing

            logger.info(f"Opening app window with URL: {initial_url}")
            webview.start(storage_path=str(profile_dir), debug=True)

        except Exception as e:
            logger.error(f"Failed to run webview: {e}")
            # If pywebview fails (e.g. headless or missing webview2), keep thread alive for tray & tracker
            if self.engine:
                try:
                    while not self._is_terminating:
                        time.sleep(1)
                except KeyboardInterrupt:
                    self.quit()
        finally:
            self.quit()
