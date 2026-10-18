const $ = id => document.getElementById(id);
const messageEl = $("message");

function render(s) {
  $("pairing").hidden = s.paired;
  $("controls").hidden = !s.paired;
  $("state").textContent = !s.paired ? "Not connected" : s.enabled ? "Tracking is ON" : "Tracking is OFF";
  $("toggle").textContent = s.enabled ? "Stop tracking" : "Start tracking";
  $("device").textContent = s.deviceName;
  $("pending").textContent = String(s.pending);
  $("sync").textContent = s.sync;
  $("droppedRow").hidden = s.dropped === 0;
  $("dropped").textContent = String(s.dropped);
}

async function call(msg) {
  const reply = await chrome.runtime.sendMessage(msg);
  messageEl.textContent = reply?.ok ? "" : reply?.error ?? "Something went wrong.";
  render(reply?.ok ? reply : await chrome.runtime.sendMessage({ type: "GET_STATUS" }));
  return reply?.ok;
}

$("pairing").addEventListener("submit", async event => {
  event.preventDefault();
  if (await call({ type: "PAIR", code: $("code").value, deviceName: $("name").value })) $("code").value = "";
});

$("toggle").addEventListener("click", async () => {
  const s = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
  await call({ type: "SET_ENABLED", enabled: !s.enabled });
});

$("syncNow").addEventListener("click", () => call({ type: "FLUSH_NOW" }));
$("disconnect").addEventListener("click", () => call({ type: "UNPAIR" }));

call({ type: "GET_STATUS" });
