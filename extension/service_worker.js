const API = "http://127.0.0.1:8000/api/v1";
const KEY = "at_state";
const ALARM = "attention-tick";
const IDLE_SEC = 60;
const STALE_MS = 150_000;
const SWITCH_GAP_MS = 300_000;
const MAX_SEG_MS = 4 * 3_600_000;
const MAX_AGE_MS = 6.5 * 86_400_000;
const MAX_QUEUE = 2000;
const BATCH = 200;
const BATCHES_PER_TICK = 5;
const LEGACY_KEYS = ["pendingEvents", "accessToken", "apiBaseUrl", "currentVisit", "windowFocused", "idleState", "enabled", "lastSyncStatus", "lastSyncAt"];
const PATHS = { activity: "/ingest/activity", switches: "/ingest/switches", notifications: "/ingest/notifications" };
const TIME_FIELD = { activity: "startedAt", switches: "switchedAt", notifications: "receivedAt" };
const BADGE = /^\((\d{1,3})\+?\)/;
const HOST = /^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?$/;

const fresh = () => ({
  enabled: false,
  deviceToken: "",
  deviceName: "",
  queue: { activity: [], switches: [], notifications: [] },
  current: null,
  lastVisit: null,
  focused: true,
  idle: "active",
  dropped: 0,
  syncStatus: "Not connected"
});

async function load() {
  const { [KEY]: saved } = await chrome.storage.local.get(KEY);
  return { ...fresh(), ...saved, queue: { ...fresh().queue, ...saved?.queue } };
}
const save = s => chrome.storage.local.set({ [KEY]: s });

// Every handler runs one at a time, so read-modify-write on storage never interleaves.
// `at` is captured when the browser event fires, not when the handler gets its turn.
let chain = Promise.resolve();
const handle = fn => (...args) => {
  const at = Date.now();
  const run = chain.then(() => fn(at, ...args));
  chain = run.catch(() => {});
  return run;
};
const listen = fn => {
  const h = handle(fn);
  return (...args) => { h(...args).catch(e => console.error(e?.message)); };
};

const iso = ms => new Date(ms).toISOString();
const id = () => crypto.randomUUID();
const cap = list => (list.length > MAX_QUEUE ? list.slice(-MAX_QUEUE) : list);
const pendingCount = s => s.queue.activity.length + s.queue.switches.length + s.queue.notifications.length;
const status = s => ({
  ok: true,
  enabled: s.enabled,
  paired: Boolean(s.deviceToken),
  deviceName: s.deviceName,
  pending: pendingCount(s),
  dropped: s.dropped,
  sync: s.syncStatus
});

function domainOf(tab) {
  if (!tab?.url || tab.incognito) return null;
  try {
    const u = new URL(tab.url);
    const host = u.hostname.toLowerCase();
    return /^https?:$/.test(u.protocol) && HOST.test(host) ? host : null;
  } catch {
    return null;
  }
}

function pushActivity(s, domain, start, end, idle) {
  for (let from = start; end - from >= 1000; from += MAX_SEG_MS) {
    s.queue.activity.push({
      clientEventId: id(),
      domain,
      startedAt: iso(from),
      endedAt: iso(Math.min(end, from + MAX_SEG_MS)),
      idle
    });
  }
  s.queue.activity = cap(s.queue.activity);
}

function closeCurrent(s, endAt) {
  const c = s.current;
  if (!c) return;
  const end = Math.max(endAt - c.lastTickAt > STALE_MS ? c.lastTickAt : endAt, c.startedAt);
  pushActivity(s, c.domain, c.startedAt, end, c.idle);
  if (!c.idle) s.lastVisit = { domain: c.domain, endedAt: end };
  s.current = null;
}

function openCurrent(s, want, at) {
  const prev = s.lastVisit;
  if (!want.idle && prev && prev.domain !== want.domain && at - prev.endedAt <= SWITCH_GAP_MS) {
    s.queue.switches = cap([
      ...s.queue.switches,
      { clientEventId: id(), fromApp: prev.domain, toApp: want.domain, switchedAt: iso(at) }
    ]);
  }
  s.current = { ...want, startedAt: at, lastTickAt: at };
}

async function wanted(s) {
  if (!s.enabled || !s.focused) return null;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const domain = domainOf(tab);
  return domain ? { domain, idle: s.idle !== "active" } : null;
}

async function reconcile(s, at, boundary = at) {
  if (s.current && at - s.current.lastTickAt > STALE_MS) closeCurrent(s, at);
  const want = await wanted(s);
  const c = s.current;
  if (c && want && c.domain === want.domain && c.idle === want.idle) {
    c.lastTickAt = at;
    return;
  }
  closeCurrent(s, boundary);
  if (want) openCurrent(s, want, boundary);
}

async function noteBadge(s, at, tabId, title, tab) {
  const domain = domainOf(tab);
  if (!domain) return false;
  const count = Number(BADGE.exec(title)?.[1] ?? 0);
  const { badges = {} } = await chrome.storage.session.get("badges");
  const prev = badges[tabId] ?? 0;
  badges[tabId] = count;
  await chrome.storage.session.set({ badges });
  if (count <= prev) return false;
  s.queue.notifications = cap([
    ...s.queue.notifications,
    { clientEventId: id(), sourceApp: domain, receivedAt: iso(at) }
  ]);
  return true;
}

let activeApi = "http://127.0.0.1:3000/api/v1";

async function post(path, token, body) {
  const candidates = [
    activeApi,
    activeApi.includes("3000") ? "http://127.0.0.1:8000/api/v1" : "http://127.0.0.1:3000/api/v1",
    "http://localhost:3000/api/v1",
    "http://localhost:8000/api/v1"
  ];
  for (const base of candidates) {
    try {
      const res = await fetch(base + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(6000)
      });
      activeApi = base;
      return res;
    } catch (err) {
      console.warn(`[Attention Tracker] Fetch to ${base}${path} failed:`, err?.message || err);
    }
  }
  return null;
}

async function flush(s, at) {
  if (!s.deviceToken) return;
  for (const kind of Object.keys(PATHS)) {
    const kept = s.queue[kind].filter(e => at - Date.parse(e[TIME_FIELD[kind]]) < MAX_AGE_MS);
    s.dropped += s.queue[kind].length - kept.length;
    s.queue[kind] = kept;

    for (let i = 0; i < BATCHES_PER_TICK && s.queue[kind].length; i++) {
      const batch = s.queue[kind].slice(0, BATCH);
      const res = await post(PATHS[kind], s.deviceToken, { events: batch });
      if (!res) { s.syncStatus = "Backend unreachable; events queued locally"; return; }
      if (res.ok) {
        s.queue[kind].splice(0, batch.length);
        s.syncStatus = "Connected";
      } else if (res.status === 400) {
        s.queue[kind].splice(0, batch.length);
        s.dropped += batch.length;
        s.syncStatus = "Server rejected some events (dropped)";
      } else if (res.status === 401) {
        s.deviceToken = "";
        s.enabled = false;
        s.syncStatus = "Device not authorized. Pair again.";
        return;
      } else {
        s.syncStatus = res.status === 429 ? "Rate limited; will retry" : `HTTP ${res.status}; will retry`;
        return;
      }
    }
  }
}

async function pair(s, { code, deviceName }) {
  const body = {
    code: String(code ?? "").trim().toUpperCase(),
    deviceName: String(deviceName ?? "").trim().slice(0, 60) || "Chrome"
  };
  if (!/^[A-HJ-KM-NP-Z2-9]{8}$/.test(body.code)) {
    return { ok: false, error: "Enter the 8-character code from the web app." };
  }
  const res = await post("/devices/pair", "", body);
  if (!res) return { ok: false, error: "Cannot reach backend. Make sure your local server is running." };
  if (res.status === 429) return { ok: false, error: "Too many attempts. Try again in a minute." };
  if (res.status === 400) return { ok: false, error: "Invalid or expired code." };
  if (!res.ok) return { ok: false, error: `Backend error (HTTP ${res.status}).` };
  const data = await res.json().catch(() => null);
  if (typeof data?.deviceToken !== "string" || !data.deviceToken.startsWith("atn_")) {
    return { ok: false, error: "Unexpected response from the backend." };
  }
  s.deviceToken = data.deviceToken;
  s.deviceName = body.deviceName;
  s.syncStatus = "Connected";
  await save(s);
  return status(s);
}

async function onMessage(at, msg) {
  const s = await load();
  switch (msg?.type) {
    case "GET_STATUS":
      return status(s);
    case "PAIR":
      return s.deviceToken ? status(s) : pair(s, msg);
    case "SET_ENABLED":
      if (msg.enabled && !s.deviceToken) return { ok: false, error: "Pair this browser first." };
      s.enabled = Boolean(msg.enabled);
      s.focused = true;
      s.idle = "active";
      await reconcile(s, at);
      await flush(s, at);
      break;
    case "FLUSH_NOW":
      await flush(s, at);
      break;
    case "UNPAIR":
      s.enabled = false;
      await reconcile(s, at);
      await flush(s, at);
      Object.assign(s, fresh(), { syncStatus: "Not connected" });
      break;
    default:
      return { ok: false, error: "Unknown message" };
  }
  await save(s);
  return status(s);
}

const syncTab = handle(async at => {
  const s = await load();
  if (!s.enabled) return;
  await reconcile(s, at);
  await save(s);
});

chrome.tabs.onActivated.addListener(() => { syncTab().catch(() => {}); });

chrome.tabs.onUpdated.addListener(listen(async (at, tabId, change, tab) => {
  const navigated = change.url !== undefined || change.status === "complete";
  if (!navigated && change.title === undefined) return;
  const s = await load();
  if (!s.enabled) return;
  let dirty = false;
  if (change.title !== undefined) dirty = await noteBadge(s, at, tabId, change.title, tab);
  if (navigated && tab.active) {
    await reconcile(s, at);
    dirty = true;
  }
  if (dirty) await save(s);
}));

chrome.windows.onFocusChanged.addListener(listen(async (at, windowId) => {
  const s = await load();
  if (!s.enabled) return;
  s.focused = windowId !== chrome.windows.WINDOW_ID_NONE;
  await reconcile(s, at);
  await save(s);
}));

chrome.idle.onStateChanged.addListener(listen(async (at, state) => {
  const s = await load();
  if (!s.enabled) return;
  const boundary = state === "idle" && s.current ? Math.max(at - IDLE_SEC * 1000, s.current.startedAt) : at;
  s.idle = state;
  await reconcile(s, at, boundary);
  await save(s);
}));

chrome.alarms.onAlarm.addListener(listen(async (at, alarm) => {
  if (alarm.name !== ALARM) return;
  const s = await load();
  await reconcile(s, at);
  await flush(s, at);
  await save(s);
}));

chrome.runtime.onStartup.addListener(listen(async at => {
  const s = await load();
  if (s.current) closeCurrent(s, s.current.lastTickAt);
  s.focused = true;
  s.idle = "active";
  await reconcile(s, at);
  await save(s);
}));

chrome.runtime.onInstalled.addListener(listen(async (_at, details) => {
  await chrome.storage.local.remove(LEGACY_KEYS);
  if (details?.reason === "install") await save(fresh());
}));

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return false;
  handle(onMessage)(msg).then(reply, () => reply({ ok: false, error: "Operation failed" }));
  return true;
});

chrome.idle.setDetectionInterval(IDLE_SEC);
chrome.alarms.get(ALARM).then(a => {
  if (!a) chrome.alarms.create(ALARM, { periodInMinutes: 1 });
});
