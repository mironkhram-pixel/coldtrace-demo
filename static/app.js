/* ============================================================
   ColdTrace — пульт мониторинга (Модальное окно + Смартфон)
   ============================================================ */

const REFRESH_MS = 5000;
const TEMP_MAX = 4;
const BAT_CRIT = 20;
const BAT_WARN = 50;
const CAPACITY_PALLETS = 22;

let boxes = [];
let selectedBoxId = null;
let refreshTimer = null;

// ---------- API (заглушка) ----------
async function fetchBoxes() {
  return [
    { id: "BOX-01", status: "В пути",   temp: 3.4, bat: 92, pallets: 22, driver: "Иванов А.", route: "Поле 'Южное' → Москва" },
    { id: "BOX-02", status: "В пути",   temp: 3.2, bat: 88, pallets: 22, driver: "Петров С.", route: "Поле 'Южное' → Москва" },
    { id: "BOX-03", status: "В пути",   temp: 3.8, bat: 76, pallets: 22, driver: "Сидоров В.", route: "Поле 'Северное' → Москва" },
    { id: "BOX-04", status: "На поле",  temp: 2.5, bat: 100, pallets: 22, driver: "—", route: "Поле 'Южное'" },
    { id: "BOX-05", status: "На поле",  temp: 2.8, bat: 98, pallets: 22, driver: "—", route: "Поле 'Северное'" },
    { id: "BOX-06", status: "На складе", temp: 3.6, bat: 45, pallets: 22, driver: "—", route: "Склад 'Москва-Юг'" },
  ];
}

// ---------- ХЕЛПЕРЫ ----------
const tempClass = (t) => (t > TEMP_MAX ? "text-bad" : "text-ok");
const batClass  = (b) => (b < BAT_CRIT ? "text-bad" : b < BAT_WARN ? "text-warn" : "text-ok");
const batColor  = (b) => (b < BAT_CRIT ? "var(--bad)" : "var(--accent)");
const statusColor = (s) => s === "В пути" ? "var(--accent)" : s === "На поле" ? "var(--ok)" : "var(--muted)";
const avg = (arr, key) => arr.length ? arr.reduce((s, x) => s + x[key], 0) / arr.length : 0;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ---------- РЕНДЕР СЕТКИ ----------
function renderGrid() {
  const grid = document.getElementById("boxesGrid");
  if (!boxes.length) {
    grid.innerHTML = '<p class="muted">Нет данных о боксах</p>';
    return;
  }

  grid.innerHTML = boxes.map((box) => `
    <article class="box-card ${selectedBoxId === box.id ? "selected" : ""}"
             data-id="${escapeHtml(box.id)}" tabindex="0" role="listitem">
      <div class="box-header">
        <span class="box-id">${escapeHtml(box.id)}</span>
        <span class="box-status" style="color: ${statusColor(box.status)}">${escapeHtml(box.status)}</span>
      </div>
      <div class="box-metrics">
        <div class="metric">
          <span class="muted">Температура</span>
          <b class="${tempClass(box.temp)}" style="font-size:24px">${box.temp} °C</b>
        </div>
        <div class="metric">
          <span class="muted">Заряд АКБ</span>
          <b class="${batClass(box.bat)}" style="font-size:24px">${box.bat}%</b>
          <div class="bat-bar"><div style="width:${box.bat}%; background:${batColor(box.bat)}"></div></div>
        </div>
      </div>
      <div class="box-footer">
        <span>Паллеты: ${box.pallets} / ${CAPACITY_PALLETS}</span>
        <span class="detail-link">Подробнее →</span>
      </div>
    </article>
  `).join("");
}

// ---------- РЕНДЕР СТАТИСТИКИ ----------
function renderStats() {
  const n = boxes.length;
  document.getElementById("dashSubtitle").textContent = `Сбор: 6000 кг/день · Загружено боксов: ${n}`;
  if (!n) return;
  const t = avg(boxes, "temp");
  const b = avg(boxes, "bat");
  const tEl = document.getElementById("avgTemp");
  tEl.textContent = `${t.toFixed(1)} °C`;
  tEl.className = tempClass(t);
  const bEl = document.getElementById("avgBat");
  bEl.textContent = `${Math.round(b)}%`;
  bEl.className = batClass(b);
}

// ---------- РЕНДЕР МОДАЛЬНОГО ОКНА (СМАРТФОН) ----------
function renderPhoneModal() {
  const modal = document.getElementById("phoneModal");
  const content = modal.querySelector(".modal-content");

  if (!selectedBoxId) {
    modal.classList.remove("active");
    document.body.style.overflow = ""; // Возвращаем прокрутку страницы
    setTimeout(() => { content.innerHTML = ""; }, 300); // Очищаем после анимации
    return;
  }

  const box = boxes.find((b) => b.id === selectedBoxId);
  if (!box) return;

  modal.classList.add("active");
  document.body.style.overflow = "hidden"; // Блокируем прокрутку фона

  content.innerHTML = `
    <button class="btn-back" onclick="closeDetail()">
      <span>←</span> Назад к парку
    </button>

    <div class="smart-phone-panel">
      <div class="phone-header">
        <div>
          <h3 style="margin:0; color:var(--accent);">${escapeHtml(box.id)}</h3>
          <span class="muted" style="font-size:12px;">${escapeHtml(box.route)}</span>
        </div>
        <div class="phone-status-dot" style="background:${statusColor(box.status)}"></div>
      </div>

      <div class="phone-screen">
        <div class="phone-metric-large">
          <span class="muted">Температура в кузове</span>
          <b class="${tempClass(box.temp)}">${box.temp} °C</b>
        </div>

        <div class="phone-grid">
          <div class="phone-metric">
            <span class="muted">Заряд АКБ</span>
            <b class="${batClass(box.bat)}">${box.bat}%</b>
          </div>
          <div class="phone-metric">
            <span class="muted">Напряжение</span>
            <b>${(48 + box.bat * 0.04).toFixed(1)} В</b>
          </div>
          <div class="phone-metric">
            <span class="muted">Ток</span>
            <b>4.2 А</b>
          </div>
          <div class="phone-metric">
            <span class="muted">Статус</span>
            <b style="color:${statusColor(box.status)}">${escapeHtml(box.status)}</b>
          </div>
        </div>

        <div class="phone-sensors">
          <div class="sensor-row"><span>🌡 Датчик T-1</span><b>${(box.temp + 0.1).toFixed(1)} °C</b></div>
          <div class="sensor-row"><span>🌡 Датчик T-2</span><b>${(box.temp - 0.2).toFixed(1)} °C</b></div>
          <div class="sensor-row"><span>📦 Загрузка</span><b>${box.pallets} / ${CAPACITY_PALLETS} пал.</b></div>
        </div>
      </div>
    </div>
  `;
}

function renderAll() {
  renderGrid();
  renderStats();
  renderPhoneModal();
}

// ---------- СОБЫТИЯ ----------
function selectBox(id) {
  selectedBoxId = selectedBoxId === id ? null : id;
  renderAll();
}

function closeDetail() {
  selectedBoxId = null;
  renderAll();
}

function bindGridEvents() {
  const grid = document.getElementById("boxesGrid");
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".box-card");
    if (!card) return;
    selectBox(card.dataset.id);
  });
  grid.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".box-card");
    if (!card) return;
    e.preventDefault();
    selectBox(card.dataset.id);
  });
}

// Закрытие по клику на темный фон (вне смартфона)
document.getElementById("phoneModal").addEventListener("click", (e) => {
  if (e.target.id === "phoneModal") closeDetail();
});

// ---------- АВТООБНОВЛЕНИЕ ----------
function tickTelemetry() {
  boxes.forEach((b) => {
    b.temp = +(b.temp + (Math.random() - 0.5) * 0.2).toFixed(1);
    if (b.status === "На поле") {
      b.bat = Math.min(100, b.bat + 1);
    } else if (Math.random() < 0.3) {
      b.bat = Math.max(0, b.bat - 1);
    }
  });
  renderAll();
}

// ---------- СТАРТ ----------
async function init() {
  boxes = await fetchBoxes();
  bindGridEvents();
  renderAll();
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(tickTelemetry, REFRESH_MS);
}

document.addEventListener("DOMContentLoaded", init);