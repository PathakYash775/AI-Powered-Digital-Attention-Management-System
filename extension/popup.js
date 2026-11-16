/**
 * Digital Attention Tracker — Popup UI Controller
 */

// DOM Elements
const unpairedView = document.getElementById("unpaired-view");
const pairedView = document.getElementById("paired-view");
const pairingInput = document.getElementById("pairing-code-input");
const pairBtn = document.getElementById("pair-btn");
const pairError = document.getElementById("pair-error");
const syncNotice = document.getElementById("sync-notice");

const deviceNameDisplay = document.getElementById("device-name-display");
const trackingStatusBadge = document.getElementById("tracking-status-badge");
const lastHeartbeatDisplay = document.getElementById("last-heartbeat-display");
const syncedTodayDisplay = document.getElementById("synced-today-display");
const toggleTrackingBtn = document.getElementById("toggle-tracking-btn");
const syncNowBtn = document.getElementById("sync-now-btn");
const disconnectBtn = document.getElementById("disconnect-btn");

function formatRelativeTime(isoString) {
  if (!isoString) return "Never";
  const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ago`;
}

function showNotice(el, message, duration = 4000) {
  el.textContent = message;
  el.classList.remove("hidden");
  if (duration > 0) {
    setTimeout(() => {
      el.classList.add("hidden");
    }, duration);
  }
}

function hideNotice(el) {
  el.classList.add("hidden");
}

async function render() {
  const data = await chrome.storage.local.get([
    "paired",
    "deviceId",
    "deviceToken",
    "deviceName",
    "trackingEnabled",
    "lastHeartbeat",
    "syncedTodayCount",
    "lastSyncDate"
  ]);

  const isPaired = Boolean(data.paired && data.deviceToken);
  const isTracking = data.trackingEnabled ?? true;

  if (isPaired) {
    unpairedView.classList.add("hidden");
    pairedView.classList.remove("hidden");

    deviceNameDisplay.textContent = data.deviceName || "Chrome Extension";
    trackingStatusBadge.textContent = isTracking ? "Monitoring" : "Paused";
    trackingStatusBadge.style.color = isTracking ? "var(--success)" : "#e11d48";

    lastHeartbeatDisplay.textContent = formatRelativeTime(data.lastHeartbeat);

    const todayStr = new Date().toISOString().slice(0, 10);
    const count = data.lastSyncDate === todayStr ? (data.syncedTodayCount || 0) : 0;
    syncedTodayDisplay.textContent = `${count} event${count === 1 ? "" : "s"}`;

    toggleTrackingBtn.textContent = isTracking ? "Pause tracking" : "Start tracking";
    toggleTrackingBtn.classList.toggle("stop", isTracking);
  } else {
    pairedView.classList.add("hidden");
    unpairedView.classList.remove("hidden");
    hideNotice(pairError);
  }
}

// Auto-uppercase input and limit to 8 chars
pairingInput.addEventListener("input", (e) => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
});

// Submit pairing code
pairBtn.addEventListener("click", async () => {
  const code = pairingInput.value.trim().toUpperCase();
  if (code.length !== 8) {
    showNotice(pairError, "Please enter an 8-character pairing code.");
    return;
  }

  pairBtn.disabled = true;
  pairBtn.textContent = "Connecting...";
  hideNotice(pairError);

  try {
    chrome.runtime.sendMessage({ action: "pair", code }, (res) => {
      pairBtn.disabled = false;
      pairBtn.textContent = "Connect Extension";

      if (chrome.runtime.lastError) {
        showNotice(pairError, "Extension background service worker unavailable.");
        return;
      }

      if (res && res.success) {
        pairingInput.value = "";
        render();
      } else {
        showNotice(pairError, res?.error || "Pairing failed. Please check the code and backend status.");
      }
    });
  } catch (err) {
    pairBtn.disabled = false;
    pairBtn.textContent = "Connect Extension";
    showNotice(pairError, "Connection failed: " + err.message);
  }
});

// Toggle tracking on / off
toggleTrackingBtn.addEventListener("click", async () => {
  const { trackingEnabled = true } = await chrome.storage.local.get("trackingEnabled");
  await chrome.storage.local.set({ trackingEnabled: !trackingEnabled });
  await render();
});

// Manual sync now
syncNowBtn.addEventListener("click", () => {
  syncNowBtn.disabled = true;
  syncNowBtn.textContent = "Syncing...";

  chrome.runtime.sendMessage({ action: "heartbeat" }, (res) => {
    syncNowBtn.disabled = false;
    syncNowBtn.textContent = "🔄 Sync Heartbeat Now";

    if (res && res.success) {
      showNotice(syncNotice, "✓ Heartbeat synchronized with backend");
    }
    render();
  });
});

// Disconnect extension
disconnectBtn.addEventListener("click", () => {
  const confirmed = confirm("Are you sure you want to disconnect this extension? Activity tracking will stop immediately.");
  if (!confirmed) return;

  disconnectBtn.disabled = true;
  disconnectBtn.textContent = "Disconnecting...";

  chrome.runtime.sendMessage({ action: "disconnect" }, () => {
    disconnectBtn.disabled = false;
    disconnectBtn.textContent = "Disconnect Extension";
    render();
  });
});

// Initial render
render();

// Refresh heartbeat timer display every 5 seconds
setInterval(async () => {
  const { lastHeartbeat } = await chrome.storage.local.get("lastHeartbeat");
  if (lastHeartbeat) {
    lastHeartbeatDisplay.textContent = formatRelativeTime(lastHeartbeat);
  }
}, 5000);
