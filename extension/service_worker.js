const API_URL = "http://127.0.0.1:8000/api/activity";
const FALLBACK_URL = "http://127.0.0.1:3000/api/activity";

let currentVisit = null;
const iso = ms => new Date(ms).toISOString();

function getDomain(url) {
  try {
    const parsed = new URL(url);
    if (["http:", "https:"].includes(parsed.protocol)) {
      return parsed.hostname.replace(/^www\./, "").toLowerCase();
    }
    return null;
  } catch {
    return null;
  }
}

async function trackingIsEnabled() {
  const { trackingEnabled = true } = await chrome.storage.local.get("trackingEnabled");
  return trackingEnabled;
}

async function sendVisit(visit) {
  if (!visit || !visit.url || !getDomain(visit.url)) return;
  const endedAtMs = Date.now();
  const durationSeconds = Math.max(1, Math.round((endedAtMs - visit.startedAtMs) / 1000));
  const domain = getDomain(visit.url);
  if (!domain) return;

  const event = {
    source: "chrome",
    activity_type: "website_visit",
    app_name: "Google Chrome",
    title: (visit.title || domain).slice(0, 500),
    domain: domain,
    url: visit.url,
    started_at: iso(visit.startedAtMs),
    ended_at: iso(endedAtMs),
    duration_seconds: durationSeconds,
    idle: false
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event)
    });
    if (!response.ok) {
      await fetch(FALLBACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event)
      }).catch(() => {});
    }
  } catch (error) {
    try {
      await fetch(FALLBACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event)
      });
    } catch {}
  }
}

async function startVisit(tabId, windowId) {
  if (!(await trackingIsEnabled())) return;
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
  if (!(await trackingIsEnabled())) return;
  try {
    const win = await chrome.windows.get(windowId, { populate: true });
    const activeTab = (win.tabs || []).find(tab => tab.active);
    if (activeTab) await startVisit(activeTab.id, win.id);
  } catch {}
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ trackingEnabled: true });
  refreshActiveTab();
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => startVisit(tabId, windowId));

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) startVisit(tabId, tab.windowId);
});

chrome.windows.onFocusChanged.addListener(async windowId => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await sendVisit(currentVisit);
    currentVisit = null;
    return;
  }
  await refreshActiveTab(windowId);
});

chrome.tabs.onRemoved.addListener(async tabId => {
  if (currentVisit && currentVisit.tabId === tabId) {
    await sendVisit(currentVisit);
    currentVisit = null;
  }
});

chrome.alarms.create("attention-tracker-flush", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async () => {
  if (!(await trackingIsEnabled())) return;
  await sendVisit(currentVisit);
  if (currentVisit) currentVisit.startedAtMs = Date.now();
});

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "local" || !changes.trackingEnabled) return;
  if (changes.trackingEnabled.newValue === true) {
    await refreshActiveTab();
  } else {
    await sendVisit(currentVisit);
    currentVisit = null;
  }
});

// Live interval flush every 10 seconds for real-time dashboard updates
setInterval(async () => {
  if (!(await trackingIsEnabled())) return;
  if (currentVisit && currentVisit.url) {
    await sendVisit(currentVisit);
    currentVisit.startedAtMs = Date.now();
  }
}, 10000);
