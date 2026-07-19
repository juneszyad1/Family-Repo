import { getActiveGoals, getBodyFatEntries, getCircumferenceEntries, getDailyEntries, getSettings, getWorkoutPlans, getWorkoutSessions } from "../database.js";
import {
  calculateAverageWeightLast7Days,
  calculateProgress,
  calculateWeightChange,
  getLatestEntry
} from "../calculations.js";
import { GOAL_STATUS, GOAL_TYPES, analyzeGoal } from "../goals.js";
import { formatDate, formatNumber, todayIsoDate } from "../utils.js";
import { WORKOUT_STATUS, WORKOUT_TYPE_LABELS } from "../training/training-constants.js";
import { calculateWeeklyWorkoutCount } from "../training/workout-calculations.js";

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

function renderTrainingSummary(sessions, plans) {
  const completed = sessions.filter((s) => s.status === WORKOUT_STATUS.COMPLETED).sort((a,b)=>(b.completedAt||b.updatedAt).localeCompare(a.completedAt||a.updatedAt));
  const last = completed[0];
  const counts = completed.filter((s) => { const d=new Date(`${s.date}T12:00:00`); const start=new Date(); start.setDate(start.getDate()-6); start.setHours(0,0,0,0); return d>=start; }).reduce((acc,s)=>({...acc,[s.workoutType]:(acc[s.workoutType]||0)+1}),{});
  const week = Array.from({length:7},(_,index)=>{const date=new Date();date.setHours(12,0,0,0);date.setDate(date.getDate()-6+index);const iso=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;const daySessions=completed.filter((s)=>s.date===iso);return `<li class="${daySessions.length?"has-training":""}"><strong>${new Intl.DateTimeFormat("de-DE",{weekday:"short"}).format(date)}</strong><span>${daySessions.length?daySessions.map((s)=>WORKOUT_TYPE_LABELS[s.workoutType]).join(", "):"Kein Training"}</span></li>`}).join("");
  const quickPlans=plans.filter((p)=>!p.isArchived).slice(0,3);
  return `<section class="card dashboard-training-card"><div class="card-body"><div class="section-heading"><div><p class="metric-label">Bewegung</p><h2 class="section-title">Training</h2></div><a class="text-link" href="#/training">Alle öffnen →</a></div><div class="dashboard-training-grid"><div class="training-highlight"><p class="metric-label">Letztes Training</p><p><strong>${last?escapeHtmlSafe(last.planNameSnapshot):"Noch keines"}</strong>${last?`<br><span class="muted">${formatDate(last.date)} · ${WORKOUT_TYPE_LABELS[last.workoutType]} · ${Math.round((last.durationSeconds||0)/60)} min</span>`:""}</p></div><div class="training-count"><strong>${calculateWeeklyWorkoutCount(completed)}</strong><span>Einheiten<br>in 7 Tagen</span><small>${counts.strength||0} Kraft · ${counts.stretching||0} Stretch</small></div></div><h3 class="subsection-title">Wochenrhythmus</h3><ul class="week-overview">${week}</ul>${quickPlans.length?`<h3 class="subsection-title">Schnellstart</h3><div class="quick-plan-list">${quickPlans.map((p)=>`<a href="#/training"><strong>${escapeHtmlSafe(p.name)}</strong><span>${WORKOUT_TYPE_LABELS[p.workoutType]} →</span></a>`).join("")}</div>`:""}<a class="button" href="#/training">Training starten</a></div></section>`;
}
function escapeHtmlSafe(value) { const node=document.createElement("span"); node.textContent=value||""; return node.innerHTML; }

function renderDashboardContent({ dailyEntries, bodyFatEntries, circumferenceEntries, settings, activeGoals, workoutSessions, workoutPlans }) {
  const today = todayIsoDate();
  const todayEntry = dailyEntries.find((entry) => entry.date === today);
  const latestWeight = getLatestEntry(dailyEntries, "weight");
  const latestBodyFat = getLatestEntry(bodyFatEntries, "bodyFatPercentage");
  const latestSleep = getLatestEntry(dailyEntries, "sleepHours");
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
  const displayDate = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "long" }).format(new Date(`${today}T12:00:00`));
  const weightChangeClass = weightChange === null ? "neutral" : weightChange <= 0 ? "positive" : "negative";

  return `
    <section class="dashboard-intro">
      <div><p class="eyebrow">${displayDate}</p><h2>Dein Status heute</h2></div>
      <a class="button compact-button" href="#/daily">Werte eintragen</a>
    </section>

    <section class="card dashboard-hero">
      <div class="card-body">
        <div class="hero-primary">
          <p class="metric-label">Aktuelles Gewicht</p>
          <p class="hero-value">${formatNumber(latestWeight?.weight, { maximumFractionDigits: 1 })}<span>kg</span></p>
          <p class="trend-badge ${weightChangeClass}">${formatSignedWeight(weightChange)} <span>zur letzten Messung</span></p>
          <p class="hero-date">${latestWeight ? `Stand ${formatDate(latestWeight.date)}` : "Noch keine Gewichtsmessung"}</p>
        </div>
        <div class="hero-facts">
          <div><span>7-Tage-Schnitt</span><strong>${formatNumber(averageWeight, { maximumFractionDigits: 1 })} kg</strong></div>
          <div><span>Körperfett</span><strong>${formatNumber(latestBodyFat?.bodyFatPercentage, { maximumFractionDigits: 1 })} %</strong></div>
        </div>
      </div>
    </section>

    <section class="dashboard-vitals" aria-label="Weitere Körperwerte">
      <article><span>Schlaf</span><strong>${formatNumber(latestSleep?.sleepHours, { maximumFractionDigits: 1 })} h</strong><small>${latestSleep ? formatDate(latestSleep.date) : "Kein Wert"}</small></article>
      <article><span>Arm</span><strong>${formatNumber(latestArm?.arm, { maximumFractionDigits: 1 })} cm</strong><small>${latestArm ? formatDate(latestArm.date) : "Kein Wert"}</small></article>
      <article><span>Bein</span><strong>${formatNumber(latestLeg?.leg, { maximumFractionDigits: 1 })} cm</strong><small>${latestLeg ? formatDate(latestLeg.date) : "Kein Wert"}</small></article>
    </section>

    <section class="card nutrition-card">
      <div class="card-body">
        <div class="section-heading"><div><p class="metric-label">Tagesziele</p><h2 class="section-title">Ernährung</h2></div><span class="status-pill">Heute</span></div>
        <div class="progress-stack nutrition-progress">
          ${renderProgress("Kalorien", caloriesToday, settings.calorieTarget, "kcal")}
          ${renderProgress("Protein", proteinToday, settings.proteinTarget, "g")}
        </div>
      </div>
    </section>

    ${renderTrainingSummary(workoutSessions, workoutPlans)}

    ${renderGoalSummaries(activeGoals, dailyEntries, bodyFatEntries)}

    <section class="card quick-action-card">
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
    const [dailyEntries, bodyFatEntries, circumferenceEntries, settings, activeGoals, workoutSessions, workoutPlans] = await Promise.all([
      getDailyEntries(),
      getBodyFatEntries(),
      getCircumferenceEntries(),
      getSettings(),
      getActiveGoals(),
      getWorkoutSessions(),
      getWorkoutPlans()
    ]);

    container.innerHTML = renderDashboardContent({ dailyEntries, bodyFatEntries, circumferenceEntries, settings, activeGoals, workoutSessions, workoutPlans });
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
