# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path

block_cipher = None
desktop_app_dir = Path(SPECPATH)

datas = [
    (str(desktop_app_dir / "assets" / "app.ico"), "assets"),
    (str(desktop_app_dir / "app" / "offline.html"), "app"),
    (str(desktop_app_dir / "app" / "pair.html"), "app"),
    (str(desktop_app_dir / "config.example.toml"), "."),
]

hiddenimports = [
    "tracker",
    "tracker.winapi",
    "tracker.segments",
    "tracker.buffer",
    "tracker.sync",
    "tracker.engine",
    "app",
    "app.single_instance",
    "app.autostart",
    "app.pairing",
    "app.shell",
    "pystray._win32",
    "webview.platforms.winforms",
    "webview.platforms.edgechromium",
    "clr",
    "pythonnet",
]

a = Analysis(
    [str(desktop_app_dir / "app" / "__main__.py")],
    pathex=[str(desktop_app_dir)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="AttentionTracker",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(desktop_app_dir / "assets" / "app.ico"),
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="AttentionTracker",
)
