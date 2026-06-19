export function page() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Website Watch Dashboard</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8fb;
      --panel: #ffffff;
      --ink: #17202a;
      --muted: #64748b;
      --line: #d8dee9;
      --good: #0f766e;
      --warn: #b45309;
      --bad: #b91c1c;
      --blue: #2563eb;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      background: var(--bg);
      color: var(--ink);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 24px;
      border-bottom: 1px solid var(--line);
      background: var(--panel);
      position: sticky;
      top: 0;
      z-index: 1;
    }
    h1 { margin: 0; font-size: 20px; font-weight: 650; }
    h2 { margin: 0 0 12px; font-size: 16px; font-weight: 650; }
    main {
      width: 100%;
      padding: 20px 10rem;
    }
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    button {
      border: 1px solid var(--line);
      background: #fff;
      color: var(--ink);
      border-radius: 6px;
      padding: 8px 11px;
      font: inherit;
      cursor: pointer;
    }
    button.primary { background: var(--blue); color: #fff; border-color: var(--blue); }
    button.danger { color: var(--bad); }
    button:disabled { opacity: 0.55; cursor: default; }
    input {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px 10px;
      font: inherit;
    }
    section {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
    }
    .label { color: var(--muted); font-size: 12px; }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 650;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--muted);
    }
    .dot.on { background: var(--good); }
    .dot.busy { background: var(--warn); }
    .dot.err { background: var(--bad); }
    table {
      width: 100%;
      border-collapse: collapse;
      display: table;
      font-size: 14px;
      table-layout: fixed;
    }
    thead { display: table-header-group; }
    tbody { display: table-row-group; }
    tr { display: table-row; }
    th, td {
      border-bottom: 1px solid var(--line);
      display: table-cell;
      padding: 9px 8px;
      text-align: left;
      vertical-align: top;
    }
    .cell {
      align-items: center;
      display: flex;
      justify-content: center;
      min-height: 40px;
      overflow: hidden;
      text-align: center;
      width: 100%;
    }
    th { color: var(--muted); font-weight: 600; }
    .table-wrap { overflow-x: auto; }
    .events-table { min-width: 1220px; }
    .events-table col:nth-child(1) { width: 230px; }
    .events-table col:nth-child(2) { width: 100px; }
    .events-table col:nth-child(3) { width: 80px; }
    .events-table col:nth-child(4) { width: 155px; }
    .events-table col:nth-child(5) { width: 155px; }
    .events-table col:nth-child(6) { width: 110px; }
    .events-table col:nth-child(7) { width: 390px; }
    .details-table { min-width: 760px; }
    .history-table { min-width: 680px; }
    .truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .truncate .cell { overflow: hidden; }
    .truncate .cell > * {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: #111827;
      color: #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      max-height: 220px;
      overflow: auto;
    }
    .muted { color: var(--muted); }
    .available { color: var(--good); font-weight: 700; }
    .full { color: var(--muted); }
    .actions { display: flex; gap: 7px; flex-wrap: nowrap; }
    .actions button { width: 78px; padding-left: 0; padding-right: 0; text-align: center; }
    .actions button.wide { width: 96px; }
    .compact { white-space: nowrap; }
    dialog {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 0;
      width: min(900px, calc(100vw - 32px));
      box-shadow: 0 18px 60px rgba(15, 23, 42, 0.24);
    }
    dialog.config-dialog { width: min(480px, calc(100vw - 32px)); }
    dialog::backdrop { background: rgba(15, 23, 42, 0.35); }
    .modal-body {
      display: grid;
      gap: 12px;
      padding: 18px;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding-top: 4px;
    }
    @media (max-width: 760px) {
      header { align-items: flex-start; flex-direction: column; }
      main { padding: 20px 16px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Website Watch Dashboard</h1>
    <div class="status"><span id="dot" class="dot"></span><span id="statusText">Loading</span></div>
  </header>
  <main>
    <section>
      <div class="toolbar">
        <h2>Schedule Events</h2>
        <span class="muted">Select Results for history and details. Select Config for interval and notification settings.</span>
      </div>
      <div class="table-wrap">
        <table class="events-table">
          <colgroup>
            <col><col><col><col><col><col><col>
          </colgroup>
          <thead>
            <tr>
              <th>Event</th>
              <th>Status</th>
              <th>Interval</th>
              <th>Last Run</th>
              <th>Next Run</th>
              <th>Latest Result</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="events"></tbody>
        </table>
      </div>
    </section>
  </main>
  <dialog id="resultsDialog">
    <div class="modal-body">
      <div class="toolbar">
        <h2>Results</h2>
        <button id="closeResults" type="button">Close</button>
      </div>
      <div id="resultSummary" class="muted"></div>
      <h2>Latest Result Details</h2>
      <div class="table-wrap">
        <table class="details-table">
          <thead><tr><th>Status</th><th>Date</th><th>Openings</th><th>Course</th><th>Time</th></tr></thead>
          <tbody id="items"></tbody>
        </table>
      </div>
      <h2>Last Output</h2>
      <pre id="output"></pre>
      <h2>Result History</h2>
      <div class="table-wrap">
        <table class="history-table">
          <thead><tr><th>Checked At</th><th>Total</th><th>Available</th><th>Full</th><th>New Available</th></tr></thead>
          <tbody id="history"></tbody>
        </table>
      </div>
    </div>
  </dialog>
  <dialog id="configDialog" class="config-dialog">
    <form method="dialog" class="modal-body">
      <h2>Config</h2>
      <label>
        <span class="label">Interval Seconds</span>
        <input id="configInterval" type="number" min="10" step="1" required>
      </label>
      <label>
        <span class="label">Notification Email</span>
        <input id="configEmail" type="email" autocomplete="email" required>
      </label>
      <div id="configHint" class="muted"></div>
      <div class="modal-actions">
        <button id="closeConfig" type="button">Close</button>
        <button id="saveConfig" class="primary" type="button" disabled>Save</button>
      </div>
    </form>
  </dialog>
  <script>
    const $ = (id) => document.getElementById(id);
    const fmt = (value) => value ? new Date(value).toLocaleString() : "-";
    const escapeHtml = (value) => String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
    const td = (content, className = "") =>
      "<td" + (className ? " class='" + className + "'" : "") + "><div class='cell'>" + content + "</div></td>";

    async function api(path, options = {}) {
      const response = await fetch(path, options);
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    }

    async function action(path) {
      await api(path, { method: "POST" });
      await refresh();
    }

    let latestData = null;
    let configSnapshot = null;

    async function saveConfig() {
      await api("/api/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          intervalSeconds: Number($("configInterval").value),
          email: $("configEmail").value
        })
      });
      $("configDialog").close();
      await refresh();
    }

    function renderItems(items) {
      $("items").innerHTML = (items || []).map((item) => {
        const isAvailable = Number(item.openings) > 0 && !/full/i.test(item.availability || "");
        const cls = isAvailable ? "available" : "full";
        const status = isAvailable ? "Available" : item.availability || "Not available";
        return "<tr>" +
          td(escapeHtml(status), cls) +
          td(escapeHtml(item.date)) +
          td(escapeHtml(item.openings)) +
          td(escapeHtml(item.name)) +
          td(escapeHtml(item.time)) +
        "</tr>";
      }).join("");
    }

    function eventStatus(event) {
      if (event.lastError) return "Error";
      if (event.runInProgress) return "Running";
      if (event.schedulerEnabled) return "Scheduled";
      return "Stopped";
    }

    function renderEvents(events) {
      $("events").innerHTML = (events || []).map((event) => {
        const result = event.latestResult
          ? event.latestResult.available + " available"
          : "-";
        const toggleLabel = event.schedulerEnabled ? "⏹ Stop" : "▶ Start";
        const toggleClass = event.schedulerEnabled ? "danger" : "primary";
        return "<tr>" +
          td("<strong>" + escapeHtml(event.name) + "</strong>", "truncate") +
          td(escapeHtml(eventStatus(event)), "compact") +
          td(escapeHtml(event.intervalSeconds) + " sec", "compact") +
          td(escapeHtml(fmt(event.lastRunFinishedAt)), "compact") +
          td(escapeHtml(fmt(event.nextRunAt)), "compact") +
          td(escapeHtml(result), "compact") +
          td("<div class='actions'>" +
            "<button data-action='run' " + (event.runInProgress ? "disabled" : "") + ">⚡ Run</button>" +
            "<button data-action='toggle' class='" + toggleClass + "'>" + toggleLabel + "</button>" +
            "<button data-action='results' class='wide'>📊 Results</button>" +
            "<button data-action='config'>⚙ Config</button>" +
          "</div>") +
        "</tr>";
      }).join("");
    }

    function renderHistory(history) {
      $("history").innerHTML = (history || []).map((check) => {
        return "<tr>" +
          td(escapeHtml(fmt(check.checkedAt)), "compact") +
          td(escapeHtml(check.total)) +
          td(escapeHtml(check.available), "available") +
          td(escapeHtml(check.full), "full") +
          td(escapeHtml((check.newAvailable || []).length)) +
        "</tr>";
      }).join("");
    }

    function currentEmail(data) {
      return (data.subscriptions || []).find((subscription) => subscription.type === "email")?.address || "";
    }

    function renderResultDialog(data) {
      const lastCheck = data?.lastCheck;
      $("resultSummary").textContent = lastCheck
        ? "Latest check: " + fmt(lastCheck.checkedAt) + " | " + lastCheck.total + " total | " + lastCheck.available + " available | " + lastCheck.full + " full"
        : "No checks have completed yet.";
      $("output").textContent = data.runtime.lastError ? data.runtime.lastError + "\\n\\n" + data.runtime.lastOutput : data.runtime.lastOutput || "No output yet.";
      renderItems(lastCheck?.items || []);
      renderHistory(data.resultHistory || []);
    }

    function openResultsDialog() {
      renderResultDialog(latestData);
      $("resultsDialog").showModal();
    }

    function openConfigDialog() {
      const interval = latestData?.config?.intervalSeconds || 80;
      const email = currentEmail(latestData || {});
      $("configInterval").value = interval;
      $("configEmail").value = email;
      configSnapshot = { intervalSeconds: String(interval), email };
      updateConfigSaveState();
      $("configHint").textContent = "Email only sends for a new available date-range ID. Close discards unsaved edits.";
      $("configDialog").showModal();
    }

    function updateConfigSaveState() {
      const changed = configSnapshot &&
        (String($("configInterval").value) !== configSnapshot.intervalSeconds ||
          $("configEmail").value !== configSnapshot.email);
      const valid = Number($("configInterval").value) >= 10 && $("configEmail").checkValidity();
      $("saveConfig").disabled = !changed || !valid;
    }

    async function refresh() {
      const data = await api("/api/status");
      latestData = data;
      const runtime = data.runtime;
      $("statusText").textContent = runtime.runInProgress ? "Running check" : runtime.schedulerEnabled ? "Scheduled" : "Stopped";
      $("dot").className = "dot " + (runtime.lastError ? "err" : runtime.runInProgress ? "busy" : runtime.schedulerEnabled ? "on" : "");
      renderEvents(data.scheduleEvents || []);
      if ($("resultsDialog").open) renderResultDialog(data);
    }

    $("events").addEventListener("click", (event) => {
      const actionName = event.target?.dataset?.action;
      if (actionName === "run") action("/api/run-once");
      if (actionName === "toggle") action(latestData?.runtime?.schedulerEnabled ? "/api/stop" : "/api/start");
      if (actionName === "results") openResultsDialog();
      if (actionName === "config") openConfigDialog();
    });
    $("closeResults").addEventListener("click", () => $("resultsDialog").close());
    $("closeConfig").addEventListener("click", () => $("configDialog").close());
    $("saveConfig").addEventListener("click", saveConfig);
    $("configInterval").addEventListener("input", updateConfigSaveState);
    $("configEmail").addEventListener("input", updateConfigSaveState);
    refresh();
    setInterval(refresh, 5000);
  </script>
</body>
</html>`;
}
