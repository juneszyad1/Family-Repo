import { getActiveGoals, getBodyFatEntries, getCircumferenceEntries, getDailyEntries, getSettings } from "../database.js";
import {
  calculateAverageWeightLast7Days,
  calculateProgress,
  calculateWeightChange,
  getLatestEntry
} from "../calculations.js";
import { GOAL_STATUS, GOAL_TYPES, analyzeGoal } from "../goals.js";
import { formatDate, formatNumber, todayIsoDate } from "../utils.js";

const GOAL_STATUS_LABELS = {
  [GOAL_STATUS.AHEAD]: "Schneller als nötig",
  [GOAL_STATUS.ON_TRACK]: "Im Ziel",
  [GOAL_STATUS.SLIGHTLY_BEHIND]: "Etwas hinter dem Ziel",
  [GOAL_STATUS.BEHIND]: "Deutlich hinter dem Ziel",
  [GOAL_STATUS.WRONG_DIRECTION]: "Trend weg vom Ziel",
  [GOAL_STATUS.INSUFFICIENT_DATA]: "Zu wenig Daten",
  [GOAL_STATUS.NOT_STARTED]: "Startet später",
  [GOAL_STATUS.COMPLETED]: "Ziel erreicht",
  [GOAL_STATUS.OVERDUE]: "Zieltermin erreicht"
};

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

function goalUnit(type) {
  return type === GOAL_TYPES.BODY_FAT ? "%" : "kg";
}

function goalChangeUnit(type) {
  return type === GOAL_TYPES.BODY_FAT ? "Prozentpunkte" : "kg";
}

function goalTitle(type) {
  return type === GOAL_TYPES.BODY_FAT ? "KFA-Ziel" : "Gewichtsziel";
}

function renderGoalSummary(goal, dailyEntries, bodyFatEntries) {
  const entries = goal.type === GOAL_TYPES.BODY_FAT ? bodyFatEntries : dailyEntries;
  const analysis = analyzeGoal(goal, entries, new Date());
  const primaryTrend = analysis.primaryTrend ? analysis.trends[analysis.primaryTrend] : null;
  const unit = goalUnit(goal.type);
  const changeUnit = goalChangeUnit(goal.type);
  const valueProgress = analysis.valueProgress === null ? 0 : Math.round(analysis.valueProgress * 100);
  const timeProgress = analysis.timeProgress === null ? 0 : Math.round(analysis.timeProgress * 100);
  const deviationText = analysis.scheduleDeviation === null
    ? "Noch nicht berechenbar"
    : `${formatNumber(Math.abs(analysis.scheduleDeviation), { maximumFractionDigits: 1 })} ${changeUnit} ${analysis.scheduleDeviation >= 0 ? "vor dem Plan" : "hinter dem Plan"}`;

  return `
    <article class="card dashboard-goal-card">
      <div class="card-body">
        <div class="goal-header">
          <div>
            <p class="metric-label">${goalTitle(goal.type)}</p>
            <h2 class="section-title">${formatNumber(analysis.currentValue, { maximumFractionDigits: 1 })} ${unit} -> ${formatNumber(goal.targetValue, { maximumFractionDigits: 1 })} ${unit}</h2>
          </div>
          <span class="status-pill">${GOAL_STATUS_LABELS[analysis.overallStatus] || analysis.overallStatus}</span>
        </div>
        <div class="dashboard-goal-grid">
          <p><strong>Zieldatum</strong><span>${formatDate(goal.targetDate)}</span></p>
          <p><strong>Soll heute</strong><span>${formatNumber(analysis.expectedValueToday, { maximumFractionDigits: 1 })} ${unit}</span></p>
          <p><strong>Abweichung</strong><span>${deviationText}</span></p>
          <p><strong>Primärtrend</strong><span>${primaryTrend?.available ? `${formatNumber(primaryTrend.weeklyRate, { maximumFractionDigits: 2 })} ${changeUnit}/Woche` : "Noch nicht verfügbar"}</span></p>
        </div>
        <div class="progress-stack compact-progress">
          ${renderProgress("Ziel-Fortschritt", valueProgress, 100, "%")}
          ${renderProgress("Verbrauchte Zeit", timeProgress, 100, "%")}
        </div>
        <a class="button secondary" href="#/goals">Ziel öffnen</a>
      </div>
    </article>
  `;
}

function renderGoalSummaries(activeGoals, dailyEntries, bodyFatEntries) {
  if (!activeGoals.length) {
    return "";
  }

  return `
    <section class="view-stack">
      <h2 class="section-title dashboard-section-title">Aktive Ziele</h2>
      ${activeGoals.map((goal) => renderGoalSummary(goal, dailyEntries, bodyFatEntries)).join("")}
    </section>
  `;
}

function renderDashboardContent({ dailyEntries, bodyFatEntries, circumferenceEntries, settings, activeGoals }) {
  const today = todayIsoDate();
  const todayEntry = dailyEntries.find((entry) => entry.date === today);
  const latestWeight = getLatestEntry(dailyEntries, "weight");
  const latestBodyFat = getLatestEntry(bodyFatEntries, "bodyFatPercentage");
  const latestArm = getLatestEntry(circumferenceEntries, "arm");
  const latestLeg = getLatestEntry(circumferenceEntries, "leg");
  const weightChange = calculateWeightChange(dailyEntries);
  const averageWeight = calculateAverageWeightLast7Days(dailyEntries);
  const caloriesToday = todayEntry?.calories ?? null;
  const proteinToday = todayEntry?.protein ?? null;
  const hasCaloriesToday = caloriesToday !== null && caloriesToday !== undefined;
  const hasProteinToday = proteinToday !== null && proteinToday !== undefined;
  const hasNutritionToday = hasCaloriesToday && hasProteinToday;
  const hasPartialNutritionToday = hasCaloriesToday || hasProteinToday;

  return `
    <div class="metric-grid">
      <article class="card metric">
        <p class="metric-label">Aktuelles Gewicht</p>
        <p class="metric-value">${formatNumber(latestWeight?.weight, { maximumFractionDigits: 1 })} kg</p>
        <p class="muted">${latestWeight ? `Letzte Messung: ${formatDate(latestWeight.date)}` : "Noch keine Messung"}</p>
      </article>
      <article class="card metric">
        <p class="metric-label">Veränderung</p>
        <p class="metric-value">${formatSignedWeight(weightChange)}</p>
        <p class="muted">Gegenüber der letzten Messung</p>
      </article>
      <article class="card metric">
        <p class="metric-label">7-Tage-Schnitt</p>
        <p class="metric-value">${formatNumber(averageWeight, { maximumFractionDigits: 1 })} kg</p>
        <p class="muted">Nur vorhandene Gewichtswerte</p>
      </article>
      <article class="card metric">
        <p class="metric-label">Körperfett</p>
        <p class="metric-value">${formatNumber(latestBodyFat?.bodyFatPercentage, { maximumFractionDigits: 1 })} %</p>
        <p class="muted">${latestBodyFat ? `Letzte Messung: ${formatDate(latestBodyFat.date)}` : "Noch keine KFA-Messung"}</p>
      </article>
      <article class="card metric">
        <p class="metric-label">Armumfang</p>
        <p class="metric-value">${formatNumber(latestArm?.arm, { maximumFractionDigits: 1 })} cm</p>
        <p class="muted">${latestArm ? `Letzte Messung: ${formatDate(latestArm.date)}` : "Noch keine Umfangmessung"}</p>
      </article>
      <article class="card metric">
        <p class="metric-label">Beinumfang</p>
        <p class="metric-value">${formatNumber(latestLeg?.leg, { maximumFractionDigits: 1 })} cm</p>
        <p class="muted">${latestLeg ? `Letzte Messung: ${formatDate(latestLeg.date)}` : "Noch keine Umfangmessung"}</p>
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

    ${renderGoalSummaries(activeGoals, dailyEntries, bodyFatEntries)}

    <section class="card">
      <div class="card-body">
        <h2 class="section-title">Schnellaktionen</h2>
        <div class="button-row">
          <a class="button" href="#/daily">Tagesdaten</a>
          <a class="button secondary" href="#/body-fat">KFA messen</a>
          <a class="button secondary" href="#/goals">Ziele</a>
        </div>
      </div>
    </section>

    ${
      hasNutritionToday
        ? `
          <section class="card empty-state">
            <h2>Heute ist erfasst</h2>
            <p>${formatNumber(caloriesToday, { maximumFractionDigits: 0 })} kcal und ${formatNumber(proteinToday, { maximumFractionDigits: 0 })} g Protein gespeichert.</p>
          </section>
        `
        : hasPartialNutritionToday
          ? `
            <section class="card empty-state">
              <h2>Heute ist teilweise erfasst</h2>
              <p>${hasCaloriesToday ? `${formatNumber(caloriesToday, { maximumFractionDigits: 0 })} kcal gespeichert.` : "Kalorien fehlen noch."} ${hasProteinToday ? `${formatNumber(proteinToday, { maximumFractionDigits: 0 })} g Protein gespeichert.` : "Protein fehlt noch."}</p>
            </section>
          `
          : todayEntry
            ? `
              <section class="card empty-state">
                <h2>Gewicht ist erfasst</h2>
                <p>Kalorien und Protein fehlen für heute noch.</p>
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
    const [dailyEntries, bodyFatEntries, circumferenceEntries, settings, activeGoals] = await Promise.all([
      getDailyEntries(),
      getBodyFatEntries(),
      getCircumferenceEntries(),
      getSettings(),
      getActiveGoals()
    ]);

    container.innerHTML = renderDashboardContent({ dailyEntries, bodyFatEntries, circumferenceEntries, settings, activeGoals });
  } catch (error) {
    console.error(error);
    container.innerHTML = `
      <section class="card empty-state">
        <h2>Dashboard konnte nicht geladen werden</h2>
        <p>Die lokale Datenbank ist gerade nicht verfügbar.</p>
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
