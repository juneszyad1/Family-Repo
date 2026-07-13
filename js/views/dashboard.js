import { getBodyFatEntries, getDailyEntries, getSettings } from "../database.js";
import {
  calculateAverageWeightLast7Days,
  calculateProgress,
  calculateWeightChange,
  getLatestEntry
} from "../calculations.js";
import { formatDate, formatNumber, todayIsoDate } from "../utils.js";

function formatSignedWeight(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, { maximumFractionDigits: 1 })} kg`;
}

function renderProgress(label, value, target, unit) {
  const progress = calculateProgress(value, target);

  return `
    <div class="progress-block">
      <div class="progress-header">
        <span>${label}</span>
        <strong>${formatNumber(value, { maximumFractionDigits: 0 })} / ${formatNumber(target, { maximumFractionDigits: 0 })} ${unit}</strong>
      </div>
      <div class="progress-track" aria-label="${label}: ${progress} Prozent erreicht">
        <span style="width: ${progress}%"></span>
      </div>
    </div>
  `;
}

function renderDashboardContent({ dailyEntries, bodyFatEntries, settings }) {
  const today = todayIsoDate();
  const todayEntry = dailyEntries.find((entry) => entry.date === today);
  const latestWeight = getLatestEntry(dailyEntries, "weight");
  const latestBodyFat = getLatestEntry(bodyFatEntries, "bodyFatPercentage");
  const weightChange = calculateWeightChange(dailyEntries);
  const averageWeight = calculateAverageWeightLast7Days(dailyEntries);
  const caloriesToday = todayEntry?.calories ?? null;
  const proteinToday = todayEntry?.protein ?? null;

  return `
    <div class="metric-grid">
      <article class="card metric">
        <p class="metric-label">Aktuelles Gewicht</p>
        <p class="metric-value">${formatNumber(latestWeight?.weight, { maximumFractionDigits: 1 })} kg</p>
        <p class="muted">${latestWeight ? `Letzte Messung: ${formatDate(latestWeight.date)}` : "Noch keine Messung"}</p>
      </article>
      <article class="card metric">
        <p class="metric-label">Veraenderung</p>
        <p class="metric-value">${formatSignedWeight(weightChange)}</p>
        <p class="muted">Gegenueber der letzten Messung</p>
      </article>
      <article class="card metric">
        <p class="metric-label">7-Tage-Schnitt</p>
        <p class="metric-value">${formatNumber(averageWeight, { maximumFractionDigits: 1 })} kg</p>
        <p class="muted">Nur vorhandene Gewichtswerte</p>
      </article>
      <article class="card metric">
        <p class="metric-label">Koerperfett</p>
        <p class="metric-value">${formatNumber(latestBodyFat?.bodyFatPercentage, { maximumFractionDigits: 1 })} %</p>
        <p class="muted">${latestBodyFat ? `Letzte Messung: ${formatDate(latestBodyFat.date)}` : "Noch keine KFA-Messung"}</p>
      </article>
    </div>

    <section class="card">
      <div class="card-body">
        <h2 class="section-title">Heute</h2>
        <div class="progress-stack">
          ${renderProgress("Kalorien", caloriesToday, settings.calorieTarget, "kcal")}
          ${renderProgress("Protein", proteinToday, settings.proteinTarget, "g")}
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-body">
        <h2 class="section-title">Schnellaktionen</h2>
        <div class="button-row">
          <a class="button" href="#/daily">Tagesdaten</a>
          <a class="button secondary" href="#/body-fat">KFA messen</a>
          <a class="button secondary" href="#/trends">Trends</a>
        </div>
      </div>
    </section>

    ${
      todayEntry
        ? `
          <section class="card empty-state">
            <h2>Heute ist erfasst</h2>
            <p>${formatNumber(caloriesToday, { maximumFractionDigits: 0 })} kcal und ${formatNumber(proteinToday, { maximumFractionDigits: 0 })} g Protein gespeichert.</p>
          </section>
        `
        : `
          <section class="card empty-state">
            <h2>Heute fehlen noch Daten</h2>
            <p>Trage deinen Tagesdatensatz ein, damit Kalorien und Protein hier auftauchen.</p>
          </section>
        `
    }
  `;
}

async function initializeDashboard(container) {
  try {
    const [dailyEntries, bodyFatEntries, settings] = await Promise.all([
      getDailyEntries(),
      getBodyFatEntries(),
      getSettings()
    ]);

    container.innerHTML = renderDashboardContent({ dailyEntries, bodyFatEntries, settings });
  } catch (error) {
    console.error(error);
    container.innerHTML = `
      <section class="card empty-state">
        <h2>Dashboard konnte nicht geladen werden</h2>
        <p>Die lokale Datenbank ist gerade nicht verfuegbar.</p>
      </section>
    `;
  }
}

export function renderDashboard() {
  const fragment = document.createDocumentFragment();
  const container = document.createElement("section");
  container.className = "view-stack";
  container.innerHTML = `
    <section class="card empty-state">
      <h2>Dashboard wird geladen</h2>
      <p>Einen Moment bitte.</p>
    </section>
  `;
  fragment.append(container);
  initializeDashboard(container);
  return fragment;
}
