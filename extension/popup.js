const statusEl = document.getElementById("status-text");
const statusDot = document.getElementById("status-dot");
const toggleButton = document.getElementById("toggle");
const apiStatusEl = document.getElementById("api-status");

async function checkApi() {
  try {
    const res = await fetch("http://127.0.0.1:8000/healthz", { method: "GET" });
    if (res.ok) {
      apiStatusEl.textContent = "● API Online: 127.0.0.1:8000";
      apiStatusEl.style.color = "#15803d";
      apiStatusEl.style.borderColor = "#bbf7d0";
      apiStatusEl.style.background = "#f0fdf4";
      return;
    }
  } catch {}
  apiStatusEl.textContent = "○ API: http://127.0.0.1:8000/api/activity";
}

async function render() {
  const { trackingEnabled = true } = await chrome.storage.local.get("trackingEnabled");
  statusEl.textContent = trackingEnabled ? "Tracking is Active (ON)" : "Tracking is Paused (OFF)";
  statusDot.classList.toggle("on", trackingEnabled);
  toggleButton.textContent = trackingEnabled ? "Pause tracking" : "Start tracking";
  toggleButton.classList.toggle("stop", trackingEnabled);
  checkApi();
}

toggleButton.addEventListener("click", async () => {
  const { trackingEnabled = true } = await chrome.storage.local.get("trackingEnabled");
  await chrome.storage.local.set({ trackingEnabled: !trackingEnabled });
  await render();
});

render();
