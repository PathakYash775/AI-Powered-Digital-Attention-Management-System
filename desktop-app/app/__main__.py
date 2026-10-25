"""
Main entry point for AttentionTracker Desktop App.
Run with: python -m app
"""

import sys
import logging
from pathlib import Path

# Ensure desktop-app root is on sys.path
desktop_app_dir = Path(__file__).resolve().parent.parent
if str(desktop_app_dir) not in sys.path:
    sys.path.insert(0, str(desktop_app_dir))

from app.shell import AttentionDesktopApp

def main():
    debug = "--debug" in sys.argv
    level = logging.DEBUG if debug else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    app = AttentionDesktopApp()
    app.run()

if __name__ == "__main__":
    main()
