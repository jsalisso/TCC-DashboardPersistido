const apiBase = CONFIG.API_BASE_URL.replace(/\/+$/, "");

const sensorSelect = document.getElementById("sensorSelect");
const startDateInput = document.getElementById("startDateInput");
const startTimeInput = document.getElementById("startTimeInput");
const endDateInput = document.getElementById("endDateInput");
const endTimeInput = document.getElementById("endTimeInput");
const applyBtn = document.getElementById("applyBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const pageStatus = document.getElementById("pageStatus");

const currentState = document.getElementById("currentState");
const metaGrid = document.getElementById("metaGrid");
const kpiGrid = document.getElementById("kpiGrid");
const statsGrid = document.getElementById("statsGrid");
const latencyGrid = document.getElementById("latencyGrid");
const analysisGrid = document.getElementById("analysisGrid");
const eventsTableBody = document.getElementById("eventsTableBody");

let historyChart = null;
let lastHistoryItems = [];

function formatNumber(value, decimals = 2) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(decimals) : "--";
}

function formatDate(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(new Date(value));
}

function safe(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildDateTime(dateValue, timeValue) {
  if (!dateValue) return null;
  const time = timeValue || "00:00";
  return `${dateValue}T${time}:00`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro ${res.status} ao acessar ${url}`);
  return res.json();
}

function setDefaultDateTime() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const today = `${yyyy}-${mm}-${dd}`;

  startDateInput.value = today;
  endDateInput.value = today;
  startTimeInput.value = "00:00";
  endTimeInput.value = "23:59";
}

async function loadSensors() {
  const data = await fetchJson(`${apiBase}/api/sensors`);
  const items = data.items || [];

  sensorSelect.innerHTML = items.map(item => {
    const selected = item.sensor_id === CONFIG.DEFAULT_SENSOR_ID ? "selected" : "";
    return `<option value="${safe(item.sensor_id)}" ${selected}>${safe(item.sensor_id)} - ${safe(item.ambiente)}</option>`;
  }).join("");
}

async function loadLatest(sensorId) {
  return fetchJson(`${apiBase}/api/latest/${sensorId}`);
}

async function loadHistory(sensorId, start, end) {
  const url = new URL(`${apiBase}/api/history/${sensorId}`);
  url.searchParams.set("limit", "500");
  if (start) url.searchParams.set("start", start);
  if (end) url.searchParams.set("end", end);
  return fetchJson(url.toString());
}

async function loadStatsRange(sensorId, start, end) {
  const url = new URL(`${apiBase}/api/stats-range/${sensorId}`);
  if (start) url.searchParams.set("start", start);
  if (end) url.searchParams.set("end", end);
  return fetchJson(url.toString());
}

async function loadEvents(sensorId, start, end) {
  const url = new URL(`${apiBase}/api/events/${sensorId}`);
  url.searchParams.set("limit", "50");
  if (start) url.searchParams.set("start", start);
  if (end) url.searchParams.set("end", end);
  return fetchJson(url.toString());
}

async function loadLatency(sensorId, start, end) {
  const url = new URL(`${apiBase}/api/latency/${sensorId}`);
  if (start) url.searchParams.set("start", start);
  if (end) url.searchParams.set("end", end);
  return fetchJson(url.toString());
}

function renderCurrentState(doc) {
  const status = String(doc.status || "LIMPO").toUpperCase();

  currentState.textContent = status;
  currentState.className =
    "hero-card " +
    (status === "PERIGO"
      ? "hero-perigo"
      : status === "ALERTA"
      ? "hero-alerta"
      : "hero-limpo");

  metaGrid.innerHTML = `
    <div class="cardish"><div class="label">Sensor</div><div class="value">${safe(doc.sensor_id)}</div></div>
    <div class="cardish"><div class="label">Cliente</div><div class="value">${safe(doc.cliente)}</div></div>
    <div class="cardish"><div class="label">Unidade</div><div class="value">${safe(doc.unidade)}</div></div>
    <div class="cardish"><div class="label">Ambiente</div><div class="value">${safe(doc.ambiente)}</div></div>
    <div class="cardish"><div class="label">Perfil</div><div class="value">${safe(doc.profile)}</div></div>
    <div class="cardish"><div class="label">Última atualização</div><div class="value">${formatDate(doc.received_at)}</div></div>
  `;

  kpiGrid.innerHTML = `
    <div class="cardish"><div class="label">CO atual</div><div class="value">${formatNumber(doc?.leitura?.co_ppm, 2)}</div></div>
    <div class="cardish"><div class="label">Gás atual</div><div class="value">${formatNumber(doc?.leitura?.metano_ppm, 2)}</div></div>
    <div class="cardish"><div class="label">Temperatura</div><div class="value">${formatNumber(doc.temp_c, 1)} °C</div></div>
    <div class="cardish"><div class="label">Umidade</div><div class="value">${formatNumber(doc.umid_pct, 1)} %</div></div>
    <div class="cardish"><div class="label">Presença</div><div class="value">${doc.presenca ? "SIM" : "NÃO"}</div></div>
    <div class="cardish"><div class="label">Buzzer</div><div class="value">${doc.buzzer ? "ON" : "OFF"}</div></div>
  `;
}

function renderStats(statsResponse) {
  const s = statsResponse.stats;

  if (!s) {
    statsGrid.innerHTML = `<div class="cardish"><div class="value">Sem estatísticas para o período.</div></div>`;
    return;
  }

  statsGrid.innerHTML = `
    <div class="cardish"><div class="label">Total de leituras</div><div class="value">${s.total}</div></div>
    <div class="cardish"><div class="label">CO médio</div><div class="value">${formatNumber(s.avg_co_ppm, 2)}</div></div>
    <div class="cardish"><div class="label">CO mínimo</div><div class="value">${formatNumber(s.min_co_ppm, 2)}</div></div>
    <div class="cardish"><div class="label">CO máximo</div><div class="value">${formatNumber(s.max_co_ppm, 2)}</div></div>
    <div class="cardish"><div class="label">Gás médio</div><div class="value">${formatNumber(s.avg_gas_ppm, 2)}</div></div>
    <div class="cardish"><div class="label">Gás mínimo</div><div class="value">${formatNumber(s.min_gas_ppm, 2)}</div></div>
    <div class="cardish"><div class="label">Gás máximo</div><div class="value">${formatNumber(s.max_gas_ppm, 2)}</div></div>
    <div class="cardish"><div class="label">Temperatura média</div><div class="value">${formatNumber(s.avg_temp_c, 1)} °C</div></div>
    <div class="cardish"><div class="label">Umidade média</div><div class="value">${formatNumber(s.avg_umid_pct, 1)} %</div></div>
    <div class="cardish"><div class="label">Primeira leitura</div><div class="value">${formatDate(s.first_seen)}</div></div>
    <div class="cardish"><div class="label">Última leitura</div><div class="value">${formatDate(s.last_seen)}</div></div>
    <div class="cardish"><div class="label">Último status</div><div class="value">${safe(s.last_status)}</div></div>
  `;
}

function renderLatency(latencyResponse) {
  const s = latencyResponse.summary;

  if (!s) {
    latencyGrid.innerHTML = `<div class="cardish"><div class="value">Sem dados de latência para o período.</div></div>`;
    return;
  }

  latencyGrid.innerHTML = `
    <div class="cardish"><div class="label">Total de amostras</div><div class="value">${s.total}</div></div>
    <div class="cardish"><div class="label">Latência média</div><div class="value">${formatNumber(s.avg_latency_ms, 0)} ms</div></div>
    <div class="cardish"><div class="label">Latência mínima</div><div class="value">${formatNumber(s.min_latency_ms, 0)} ms</div></div>
    <div class="cardish"><div class="label">Latência máxima</div><div class="value">${formatNumber(s.max_latency_ms, 0)} ms</div></div>
    <div class="cardish"><div class="label">Primeira amostra</div><div class="value">${formatDate(s.first_seen)}</div></div>
    <div class="cardish"><div class="label">Última amostra</div><div class="value">${formatDate(s.last_seen)}</div></div>
  `;
}

function renderAnalysis(latest, statsResponse, eventsResponse, latencyResponse) {
  const s = statsResponse.stats;
  const latency = latencyResponse.summary;
  const eventCount = (eventsResponse.items || []).length;

  let edgeSummary = "O processamento local (edge) no ESP32 permite resposta imediata do sistema com ativação do buzzer e mudança de status no dispositivo.";
  let cloudSummary = "A camada em nuvem consolida histórico, eventos e estatísticas, permitindo análise temporal e acompanhamento remoto.";
  let viabilitySummary = "A solução demonstra viabilidade para pequenos negócios ao combinar baixo custo, telemetria remota e lógica local de alerta.";
  let behaviorSummary = "Sem dados suficientes para interpretação do comportamento no período.";
  let latencySummary = "Sem dados de latência disponíveis para o período selecionado.";

  if (s) {
    behaviorSummary = `No período selecionado, foram registradas ${s.total} leituras. O CO variou de ${formatNumber(s.min_co_ppm, 2)} a ${formatNumber(s.max_co_ppm, 2)} ppm, enquanto o gás variou de ${formatNumber(s.min_gas_ppm, 2)} a ${formatNumber(s.max_gas_ppm, 2)} ppm.`;
  }

  if (latency) {
    latencySummary = `A latência média observada entre o ESP32 e o backend em nuvem foi de ${formatNumber(latency.avg_latency_ms, 0)} ms, com mínimo de ${formatNumber(latency.min_latency_ms, 0)} ms e máximo de ${formatNumber(latency.max_latency_ms, 0)} ms.`;
    cloudSummary = `${cloudSummary} No período analisado, a persistência/recepção em nuvem apresentou latência média de ${formatNumber(latency.avg_latency_ms, 0)} ms.`;
  }

  analysisGrid.innerHTML = `
    <div class="cardish">
      <div class="label">Edge</div>
      <div class="value small">${safe(edgeSummary)}</div>
    </div>
    <div class="cardish">
      <div class="label">Cloud</div>
      <div class="value small">${safe(cloudSummary)}</div>
    </div>
    <div class="cardish">
      <div class="label">Latência</div>
      <div class="value small">${safe(latencySummary)}</div>
    </div>
    <div class="cardish">
      <div class="label">Comportamento observado</div>
      <div class="value small">${safe(behaviorSummary)}</div>
    </div>
    <div class="cardish">
      <div class="label">Eventos do período</div>
      <div class="value small">Foram identificados ${eventCount} evento(s) no período filtrado.</div>
    </div>
    <div class="cardish">
      <div class="label">Viabilidade</div>
      <div class="value small">${safe(viabilitySummary)}</div>
    </div>
    <div class="cardish">
      <div class="label">Status atual</div>
      <div class="value small">O estado atual do sistema é ${safe(latest.status)}, com buzzer ${latest.buzzer ? "habilitado" : "desabilitado"}.</div>
    </div>
  `;
}

function renderEvents(eventsResponse) {
  const items = eventsResponse.items || [];

  if (!items.length) {
    eventsTableBody.innerHTML = `<tr><td colspan="4">Nenhum evento encontrado.</td></tr>`;
    return;
  }

  eventsTableBody.innerHTML = items.map(item => `
    <tr>
      <td>${formatDate(item.created_at)}</td>
      <td>${safe(item.tipo)}</td>
      <td>${safe(item.de)}</td>
      <td>${safe(item.para)}</td>
    </tr>
  `).join("");
}

function renderHistoryChart(historyResponse, latestDoc) {
  const items = [...(historyResponse.items || [])].reverse();
  lastHistoryItems = items;

  const labels = items.map(item => formatDate(item.received_at));
  const coValues = items.map(item => Number(item?.leitura?.co_ppm ?? 0));
  const gasValues = items.map(item => Number(item?.leitura?.metano_ppm ?? 0));

  const coAlerta = items.map(() => Number(latestDoc?.thresholds?.co_alerta ?? 0));
  const coPerigo = items.map(() => Number(latestDoc?.thresholds?.co_perigo ?? 0));
  const gasAlerta = items.map(() => Number(latestDoc?.thresholds?.gas_alerta ?? 0));
  const gasPerigo = items.map(() => Number(latestDoc?.thresholds?.gas_perigo ?? 0));

  const ctx = document.getElementById("historyChart").getContext("2d");

  if (historyChart) {
    historyChart.destroy();
  }

  historyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "CO (ppm)",
          data: coValues,
          borderWidth: 2,
          tension: 0.25
        },
        {
          label: "Gás (ppm)",
          data: gasValues,
          borderWidth: 2,
          tension: 0.25
        },
        {
          label: "CO alerta",
          data: coAlerta,
          borderDash: [6, 6],
          borderWidth: 1.5,
          pointRadius: 0
        },
        {
          label: "CO perigo",
          data: coPerigo,
          borderDash: [6, 6],
          borderWidth: 1.5,
          pointRadius: 0
        },
        {
          label: "Gás alerta",
          data: gasAlerta,
          borderDash: [4, 6],
          borderWidth: 1.5,
          pointRadius: 0
        },
        {
          label: "Gás perigo",
          data: gasPerigo,
          borderDash: [4, 6],
          borderWidth: 1.5,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false
    }
  });
}

function exportHistoryToCsv() {
  if (!lastHistoryItems.length) {
    alert("Não há histórico carregado para exportação.");
    return;
  }

  const headers = [
    "timestamp",
    "status",
    "co_ppm",
    "metano_ppm",
    "temp_c",
    "umid_pct",
    "presenca"
  ];

  const rows = lastHistoryItems.map(item => [
    item.received_at || "",
    item.status || "",
    item?.leitura?.co_ppm ?? "",
    item?.leitura?.metano_ppm ?? "",
    item.temp_c ?? "",
    item.umid_pct ?? "",
    item.presenca ? "SIM" : "NAO"
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row =>
      row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")
    )
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `airguard-tcc-${sensorSelect.value}.csv`;
  a.click();

  URL.revokeObjectURL(url);
}

async function loadDashboard() {
  const sensorId = sensorSelect.value;
  const start = buildDateTime(startDateInput.value, startTimeInput.value);
  const end = buildDateTime(endDateInput.value, endTimeInput.value);

  if (!sensorId) {
    pageStatus.textContent = "Selecione um sensor.";
    return;
  }

  pageStatus.textContent = "Carregando dashboard...";

  try {
    const [latest, history, stats, events, latency] = await Promise.all([
      loadLatest(sensorId),
      loadHistory(sensorId, start, end),
      loadStatsRange(sensorId, start, end),
      loadEvents(sensorId, start, end),
      loadLatency(sensorId, start, end)
    ]);

    renderCurrentState(latest);
    renderHistoryChart(history, latest);
    renderStats(stats);
    renderLatency(latency);
    renderEvents(events);
    renderAnalysis(latest, stats, events, latency);

    pageStatus.textContent = "Dashboard carregado com sucesso.";
  } catch (err) {
    console.error(err);
    pageStatus.textContent = "Erro ao carregar dashboard.";
  }
}

applyBtn.addEventListener("click", loadDashboard);
exportCsvBtn.addEventListener("click", exportHistoryToCsv);

document.addEventListener("DOMContentLoaded", async () => {
  setDefaultDateTime();
  await loadSensors();
  await loadDashboard();
});