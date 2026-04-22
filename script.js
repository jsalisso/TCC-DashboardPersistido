const apiBase = CONFIG.API_BASE_URL.replace(/\/+$/, "");

const sensorSelect = document.getElementById("sensorSelect");
const startDateInput = document.getElementById("startDateInput");
const startTimeInput = document.getElementById("startTimeInput");
const endDateInput = document.getElementById("endDateInput");
const endTimeInput = document.getElementById("endTimeInput");
const applyBtn = document.getElementById("applyBtn");
const pageStatus = document.getElementById("pageStatus");

const currentState = document.getElementById("currentState");
const metaGrid = document.getElementById("metaGrid");
const kpiGrid = document.getElementById("kpiGrid");
const statsGrid = document.getElementById("statsGrid");
const eventsTableBody = document.getElementById("eventsTableBody");

let historyChart = null;

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

async function loadEvents(sensorId) {
  return fetchJson(`${apiBase}/api/events/${sensorId}?limit=20`);
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

function renderHistoryChart(historyResponse) {
  const items = [...(historyResponse.items || [])].reverse();

  const labels = items.map(item => formatDate(item.received_at));
  const coValues = items.map(item => Number(item?.leitura?.co_ppm ?? 0));
  const gasValues = items.map(item => Number(item?.leitura?.metano_ppm ?? 0));

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
    const [latest, history, stats, events] = await Promise.all([
      loadLatest(sensorId),
      loadHistory(sensorId, start, end),
      loadStatsRange(sensorId, start, end),
      loadEvents(sensorId)
    ]);

    renderCurrentState(latest);
    renderHistoryChart(history);
    renderStats(stats);
    renderEvents(events);

    pageStatus.textContent = "Dashboard carregado com sucesso.";
  } catch (err) {
    console.error(err);
    pageStatus.textContent = "Erro ao carregar dashboard.";
  }
}

applyBtn.addEventListener("click", loadDashboard);

document.addEventListener("DOMContentLoaded", async () => {
  setDefaultDateTime();
  await loadSensors();
  await loadDashboard();
});