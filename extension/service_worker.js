/**
 * Digital Attention Tracker — Manifest V3 Background Service Worker
 * Handles tab tracking, authenticated activity synchronization, 
 * periodic heartbeats, offline queueing with retries, and device pairing lifecycle.
 */

const API_BASE = "http://127.0.0.1:8000/api/v1";
const FALLBACK_BASE = "http://localhost:8000/api/v1";

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;

let currentVisit = null;
let isFlushing = false;

// Network fetch wrapper with fallback
async function apiFetch(endpoint, options = {}) {
  try {
    return await fetch(`${API_BASE}${endpoint}`, options);
  } catch (err) {
    return await fetch(`${FALLBACK_BASE}${endpoint}`, options);
  }
}

// Retrieve current auth and pairing state from storage
async function getAuthState() {
  const data = await chrome.storage.local.get([
    "paired",
    "deviceId",
    "deviceToken",
    "deviceName",
    "trackingEnabled",
    "lastHeartbeat",
    "syncedTodayCount",
    "lastSyncDate",
    "offlineQueue"
  ]);

  return {
    paired: Boolean(data.paired && data.deviceToken),
    deviceId: data.deviceId || null,
    deviceToken: data.deviceToken || null,
    deviceName: data.deviceName || "Chrome Extension",
    trackingEnabled: data.trackingEnabled ?? true,
    lastHeartbeat: data.lastHeartbeat || null,
    syncedTodayCount: typeof data.syncedTodayCount === "number" ? data.syncedTodayCount : 0,
    lastSyncDate: data.lastSyncDate || new Date().toISOString().slice(0, 10),
    offlineQueue: Array.isArray(data.offlineQueue) ? data.offlineQueue : []
  };
}

// Safe domain extraction matching backend regex requirements
function getDomain(url) {
  try {
    const parsed = new URL(url);
    if (["http:", "https:"].includes(parsed.protocol)) {
      const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
      if (DOMAIN_REGEX.test(hostname)) {
        return hostname;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Pair device with backend using 8-character code
async function pairDevice(rawCode) {
  const code = (rawCode || "").trim().toUpperCase();
  if (code.length !== 8) {
    return { success: false, error: "Pairing code must be 8 characters." };
  }

  const payload = {
    code,
    deviceName: "Chrome Extension (" + (navigator.userAgentData?.platform || navigator.platform || "Desktop") + ")",
    platform: "chrome"
  };

  try {
    const res = await apiFetch("/devices/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.error?.message || data?.message || "Invalid or expired pairing code.";
      return { success: false, error: msg };
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    await chrome.storage.local.set({
      paired: true,
      deviceId: data.deviceId,
      deviceToken: data.deviceToken,
      deviceName: data.deviceName || payload.deviceName,
      pairedAt: data.registeredAt || new Date().toISOString(),
      trackingEnabled: true,
      lastHeartbeat: new Date().toISOString(),
      syncedTodayCount: 0,
      lastSyncDate: todayStr,
      offlineQueue: []
    });

    // Send immediate heartbeat to confirm connection
    await sendHeartbeat();
    await refreshActiveTab();

    return {
      success: true,
      deviceId: data.deviceId,
      deviceName: data.deviceName || payload.deviceName
    };
  } catch (err) {
    return { success: false, error: "Unable to reach backend API at 127.0.0.1:8000." };
  }
}

// Disconnect device and optionally revoke on backend
async function disconnectDevice() {
  const auth = await getAuthState();
  if (auth.deviceToken) {
    try {
      await apiFetch("/devices/disconnect", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${auth.deviceToken}`,
          "Content-Type": "application/json"
        }
      });
    } catch {
      // Offline disconnect is still permitted
    }
  }

  currentVisit = null;
  await chrome.storage.local.remove([
    "paired",
    "deviceId",
    "deviceToken",
    "deviceName",
    "pairedAt",
    "lastHeartbeat",
    "syncedTodayCount",
    "lastSyncDate",
    "offlineQueue"
  ]);
  await chrome.storage.local.set({ trackingEnabled: false });

  return { success: true };
}

// Handle token expiration / server revocation
async function handleRevocation() {
  currentVisit = null;
  await chrome.storage.local.remove([
    "paired",
    "deviceId",
    "deviceToken",
    "deviceName",
    "pairedAt",
    "lastHeartbeat",
    "offlineQueue"
  ]);
  await chrome.storage.local.set({ trackingEnabled: false });
}

// Authenticated heartbeat
async function sendHeartbeat() {
  const auth = await getAuthState();
  if (!auth.paired || !auth.deviceToken) return false;

  try {
    const res = await apiFetch("/devices/heartbeat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${auth.deviceToken}`,
        "Content-Type": "application/json"
      }
    });

    if (res.status === 401) {
      await handleRevocation();
      return false;
    }

    if (res.ok) {
      const nowIso = new Date().toISOString();
      await chrome.storage.local.set({ lastHeartbeat: nowIso });
      await flushOfflineQueue();
      return true;
    }
  } catch {
    // Network offline; ignore
  }
  return false;
}

// Enqueue event to offline persistent queue
async function enqueueOffline(events) {
  if (!events || events.length === 0) return;
  const { offlineQueue = [] } = await chrome.storage.local.get("offlineQueue");
  const existingIds = new Set(offlineQueue.map((e) => e.clientEventId));

  const newEvents = events.filter((e) => !existingIds.has(e.clientEventId));
  if (newEvents.length === 0) return;

  // Maximum 300 offline records
  const updated = [...offlineQueue, ...newEvents].slice(-300);
  await chrome.storage.local.set({ offlineQueue: updated });
}

// Increment today's synchronized count
async function incrementSyncCount(count = 1) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const data = await chrome.storage.local.get(["syncedTodayCount", "lastSyncDate"]);
  let current = data.syncedTodayCount || 0;
  if (data.lastSyncDate !== todayStr) {
    current = 0;
  }
  await chrome.storage.local.set({
    syncedTodayCount: current + count,
    lastSyncDate: todayStr
  });
}

// Flush offline queue to backend
async function flushOfflineQueue() {
  if (isFlushing) return;
  const auth = await getAuthState();
  if (!auth.paired || !auth.deviceToken || auth.offlineQueue.length === 0) return;

  isFlushing = true;
  try {
    const batch = auth.offlineQueue.slice(0, 50);
    const res = await apiFetch("/ingest/activity", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${auth.deviceToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ events: batch })
    });

    if (res.status === 401) {
      await handleRevocation();
      return;
    }

    if (res.ok) {
      const sentIds = new Set(batch.map((e) => e.clientEventId));
      const remaining = auth.offlineQueue.filter((e) => !sentIds.has(e.clientEventId));
      await chrome.storage.local.set({ offlineQueue: remaining });
      await incrementSyncCount(batch.length);

      if (remaining.length > 0) {
        setTimeout(flushOfflineQueue, 1000);
      }
    }
  } catch {
    // Retain in queue for next heartbeat
  } finally {
    isFlushing = false;
  }
}

// Activity transmission
async function sendVisit(visit) {
  if (!visit || !visit.url) return;
  const domain = getDomain(visit.url);
  if (!domain) return;

  const auth = await getAuthState();
  if (!auth.paired || !auth.trackingEnabled || !auth.deviceToken) return;

  const endedAtMs = Date.now();
  const startedAtMs = Math.min(visit.startedAtMs, endedAtMs - 1000);
  const startedAt = new Date(startedAtMs).toISOString();
  const endedAt = new Date(endedAtMs).toISOString();

  const event = {
    clientEventId: "ext_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9),
    source: "browser",
    domain,
    startedAt,
    endedAt,
    idle: false
  };

  try {
    const res = await apiFetch("/ingest/activity", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${auth.deviceToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ events: [event] })
    });

    if (res.status === 401) {
      await handleRevocation();
      return;
    }

    if (res.ok) {
      await incrementSyncCount(1);
      return;
    }

    if (res.status >= 500 || res.status === 429) {
      await enqueueOffline([event]);
    }
  } catch {
    await enqueueOffline([event]);
  }
}

// Track active tab and window changes
async function startVisit(tabId, windowId) {
  const auth = await getAuthState();
  if (!auth.paired || !auth.trackingEnabled) return;

  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || !getDomain(tab.url)) return;
    if (currentVisit && currentVisit.tabId === tabId && currentVisit.url === tab.url) return;

    await sendVisit(currentVisit);
    currentVisit = {
      tabId,
      windowId,
      url: tab.url,
      title: tab.title || "",
      startedAtMs: Date.now()
    };
  } catch {}
}

async function refreshActiveTab(windowId = chrome.windows.WINDOW_ID_CURRENT) {
  const auth = await getAuthState();
  if (!auth.paired || !auth.trackingEnabled) return;

  try {
    const win = await chrome.windows.get(windowId, { populate: true });
    const activeTab = (win.tabs || []).find((tab) => tab.active);
    if (activeTab) await startVisit(activeTab.id, win.id);
  } catch {}
}

// Alarms lifecycle for Manifest V3
function setupAlarms() {
  chrome.alarms.get("heartbeat-alarm", (alarm) => {
    if (!alarm) {
      chrome.alarms.create("heartbeat-alarm", { periodInMinutes: 1.0 });
    }
  });

  chrome.alarms.get("activity-flush-alarm", (alarm) => {
    if (!alarm) {
      chrome.alarms.create("activity-flush-alarm", { periodInMinutes: 0.5 });
    }
  });
}

// Service worker event listeners
chrome.runtime.onInstalled.addListener(async () => {
  setupAlarms();
  const { trackingEnabled } = await chrome.storage.local.get("trackingEnabled");
  if (trackingEnabled === undefined) {
    await chrome.storage.local.set({ trackingEnabled: true });
  }
  await sendHeartbeat();
  await refreshActiveTab();
});

chrome.runtime.onStartup.addListener(async () => {
  setupAlarms();
  await sendHeartbeat();
  await refreshActiveTab();
});

setupAlarms();

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "heartbeat-alarm") {
    await sendHeartbeat();
  } else if (alarm.name === "activity-flush-alarm") {
    const auth = await getAuthState();
    if (auth.paired && auth.trackingEnabled) {
      if (currentVisit && currentVisit.url) {
        await sendVisit(currentVisit);
        if (currentVisit) currentVisit.startedAtMs = Date.now();
      }
      await flushOfflineQueue();
    }
  }
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => startVisit(tabId, windowId));

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) startVisit(tabId, tab.windowId);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await sendVisit(currentVisit);
    currentVisit = null;
    return;
  }
  await refreshActiveTab(windowId);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (currentVisit && currentVisit.tabId === tabId) {
    await sendVisit(currentVisit);
    currentVisit = null;
  }
});

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "local") return;
  if (changes.trackingEnabled) {
    if (changes.trackingEnabled.newValue === true) {
      await refreshActiveTab();
    } else {
      await sendVisit(currentVisit);
      currentVisit = null;
    }
  }
});

// Real-time interval flush (active during service worker wakefulness)
setInterval(async () => {
  const auth = await getAuthState();
  if (!auth.paired || !auth.trackingEnabled) return;
  if (currentVisit && currentVisit.url) {
    await sendVisit(currentVisit);
    if (currentVisit) currentVisit.startedAtMs = Date.now();
  }
}, 15000);

// Popup messaging handler
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.action) return false;

  if (message.action === "pair") {
    pairDevice(message.code).then(sendResponse);
    return true;
  }

  if (message.action === "disconnect") {
    disconnectDevice().then(sendResponse);
    return true;
  }

  if (message.action === "heartbeat") {
    sendHeartbeat().then((ok) => sendResponse({ success: ok }));
    return true;
  }

  if (message.action === "getStatus") {
    getAuthState().then(sendResponse);
    return true;
  }

  return false;
});
