# AttentionTracker Windows Desktop App Build Script
param(
    [switch]$SkipShortcuts
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktopAppDir = Split-Path -Parent $scriptDir
$rootDir = Split-Path -Parent $desktopAppDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  AttentionTracker Windows Desktop App Builder" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Locate Python executable
$venvPython = Join-Path $desktopAppDir ".venv\Scripts\python.exe"
if (Test-Path $venvPython) {
    $pythonExe = $venvPython
    Write-Host "[OK] Using virtual environment Python: $pythonExe" -ForegroundColor Green
} else {
    $candidate = "C:\Users\Yash Pathak\AppData\Local\Python\pythoncore-3.13-64\python.exe"
    if (Test-Path $candidate) {
        $pythonExe = $candidate
        Write-Host "[OK] Found system Python 3.13: $pythonExe" -ForegroundColor Green
    } else {
        $pythonExe = "python.exe"
        Write-Host "[OK] Fallback to default python: $pythonExe" -ForegroundColor Yellow
    }
}

# 2. Generate Icon if needed
$iconPath = Join-Path $desktopAppDir "assets\app.ico"
if (-not (Test-Path $iconPath)) {
    Write-Host "[*] Generating application icon..." -ForegroundColor Yellow
    $makeIconScript = Join-Path $desktopAppDir "assets\make_icon.py"
    & $pythonExe $makeIconScript
    if (Test-Path $iconPath) {
        Write-Host "[OK] Created $iconPath" -ForegroundColor Green
    } else {
        Write-Warning "Could not create app.ico. Continuing with default icon."
    }
} else {
    Write-Host "[OK] Application icon exists: $iconPath" -ForegroundColor Green
}

# 3. Build Standalone Folder via PyInstaller
Write-Host "[*] Compiling application using PyInstaller..." -ForegroundColor Yellow
$specFile = Join-Path $desktopAppDir "AttentionTracker.spec"
$distDir = Join-Path $desktopAppDir "dist"
$workDir = Join-Path $desktopAppDir "build"

# Ensure any previous running instance is stopped
Stop-Process -Name AttentionTracker -Force -ErrorAction SilentlyContinue

# Clean previous distribution directory if present
$targetDist = Join-Path $distDir "AttentionTracker"
if (Test-Path $targetDist) {
    Remove-Item -Path $targetDist -Recurse -Force -ErrorAction SilentlyContinue
}

& $pythonExe -m PyInstaller $specFile --distpath $distDir --workpath $workDir --noconfirm

$exePath = Join-Path $distDir "AttentionTracker\AttentionTracker.exe"
if (-not (Test-Path $exePath)) {
    Write-Error "Build failed: $exePath was not created."
}
Write-Host "[OK] Successfully built standalone executable:" -ForegroundColor Green
Write-Host "     $exePath" -ForegroundColor White

# 4. Create Desktop & Start Menu Shortcuts
if (-not $SkipShortcuts) {
    Write-Host "[*] Creating Windows shortcuts..." -ForegroundColor Yellow
    $wsh = New-Object -ComObject WScript.Shell

    $desktopFolder = [Environment]::GetFolderPath('Desktop')
    $desktopLnkPath = Join-Path $desktopFolder "Attention Tracker.lnk"
    $shortcut = $wsh.CreateShortcut($desktopLnkPath)
    $shortcut.TargetPath = $exePath
    $shortcut.WorkingDirectory = (Split-Path -Parent $exePath)
    $builtIcon = Join-Path (Split-Path -Parent $exePath) "_internal\assets\app.ico"
    if (-not (Test-Path $builtIcon)) {
        $builtIcon = $iconPath
    }
    if (Test-Path $builtIcon) {
        $shortcut.IconLocation = "$builtIcon, 0"
    }
    $shortcut.Description = "Attention Management System Desktop Dashboard and Tracker"
    $shortcut.Save()
    Write-Host "[OK] Desktop shortcut created: $desktopLnkPath" -ForegroundColor Green

    $startMenuFolder = [Environment]::GetFolderPath('Programs')
    $startMenuLnkPath = Join-Path $startMenuFolder "Attention Tracker.lnk"
    $startShortcut = $wsh.CreateShortcut($startMenuLnkPath)
    $startShortcut.TargetPath = $exePath
    $startShortcut.WorkingDirectory = (Split-Path -Parent $exePath)
    if (Test-Path $builtIcon) {
        $startShortcut.IconLocation = "$builtIcon, 0"
    }
    $startShortcut.Description = "Attention Management System Desktop Dashboard and Tracker"
    $startShortcut.Save()
    Write-Host "[OK] Start Menu shortcut created: $startMenuLnkPath" -ForegroundColor Green
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  BUILD COMPLETE! Standalone app ready at:" -ForegroundColor Green
Write-Host "  $exePath" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
