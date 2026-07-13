import {
  getActiveGoals,
  getBodyFatEntries,
  getDailyEntries,
  getGoals,
  saveGoal,
  updateGoalStatus
} from "../database.js";
import {
  GOAL_STATUS,
  GOAL_TYPES,
  analyzeGoal,
  calculateRequiredRate,
  resolveStartValue
} from "../goals.js";
import { formatDate, formatNumber, todayIsoDate, toNumberOrNull } from "../utils.js";

const STATUS_LABELS = {
  [GOAL_STATUS.AHEAD]: "Deutlich schneller als noetig",
  [GOAL_STATUS.ON_TRACK]: "Im Ziel",
  [GOAL_STATUS.SLIGHTLY_BEHIND]: "Etwas langsamer als noetig",
  [GOAL_STATUS.BEHIND]: "Deutlich hinter dem benoetigten Tempo",
  [GOAL_STATUS.WRONG_DIRECTION]: "Aktueller Trend entfernt sich vom Ziel",
  [GOAL_STATUS.INSUFFICIENT_DATA]: "Noch nicht genuegend Daten",
  [GOAL_STATUS.NOT_STARTED]: "Ziel startet spaeter",
  [GOAL_STATUS.COMPLETED]: "Ziel aktuell erreicht",
  [GOAL_STATUS.OVERDUE]: "Zieltermin erreicht"
};

function addWeeks(date, weeks) {
  const result = new Date(`${date}T00:00:00`);
  result.setDate(result.getDate() + weeks * 7);
  return result.toISOString().slice(0, 10);
}

function valueLabel(type) {
  return type === GOAL_TYPES.BODY_FAT ? "KFA" : "Gewicht";
}

function unitLabel(type) {
  return type === GOAL_TYPES.BODY_FAT ? "%" : "kg";
}

function changeUnitLabel(type) {
  return type === GOAL_TYPES.BODY_FAT ? "Prozentpunkte" : "kg";
}

function entriesForType(type, dailyEntries, bodyFatEntries) {
  return type === GOAL_TYPES.BODY_FAT ? bodyFatEntries : dailyEntries;
}

function getGoalFormValues(form, dailyEntries, bodyFatEntries) {
  const formData = new FormData(form);
  const type = formData.get("type");
  const inputMode = formData.get("inputMode");
  const startDate = formData.get("startDate");
  const entries = entriesForType(type, dailyEntries, bodyFatEntries);
  const startValueResolution = resolveStartValue({ type, startDate, startValue: null }, entries);
  const manualStartValue = toNumberOrNull(formData.get("startValue"));
  const startValue = manualStartValue ?? startValueResolution.value;
  let targetValue = toNumberOrNull(formData.get("targetValue"));
  let targetDate = formData.get("targetDate");
  let requestedChange = null;
  let requestedWeeks = null;

  if (inputMode === "changeOverWeeks") {
    requestedChange = Math.abs(toNumberOrNull(formData.get("requestedChange")) ?? 0);
    requestedWeeks = toNumberOrNull(formData.get("requestedWeeks"));
    targetValue = startValue === null ? null : Number((startValue - requestedChange).toFixed(2));
    targetDate = requestedWeeks ? addWeeks(startDate, requestedWeeks) : "";
  }

  return {
    type,
    inputMode,
    startDate,
    targetDate,
    startValue,
    targetValue,
    requestedChange,
    requestedWeeks,
    startValueResolution
  };
}

function validateGoal(values) {
  const errors = [];

  if (!values.type) errors.push("Bitte Zieltyp auswaehlen.");
  if (!values.startDate) errors.push("Bitte Startdatum auswaehlen.");
  if (!values.targetDate) errors.push("Bitte Zieldatum auswaehlen.");
  if (values.startValue === null) errors.push("Bitte Ausgangswert eintragen oder genug Messdaten erfassen.");
  if (values.targetValue === null) errors.push("Bitte Zielwert oder Reduktion eintragen.");
  if (values.startDate && values.targetDate && values.targetDate <= values.startDate) {
    errors.push("Der Zieltermin muss nach dem Startdatum liegen.");
  }

  return errors;
}

function renderStatus(message, type = "success") {
  return `<div class="alert ${type}" role="status"><p>${message}</p></div>`;
}

function syncInputModeVisibility(form) {
  const mode = form.elements.inputMode.value;
  form.querySelectorAll("[data-mode-group]").forEach((group) => {
    group.hidden = group.dataset.modeGroup !== mode;
  });
}

function renderGoalCard(goal, dailyEntries, bodyFatEntries) {
  const entries = entriesForType(goal.type, dailyEntries, bodyFatEntries);
  const analysis = analyzeGoal(goal, entries, new Date());
  const primary = analysis.primaryTrend ? analysis.trends[analysis.primaryTrend] : null;
  const unit = unitLabel(goal.type);
  const changeUnit = changeUnitLabel(goal.type);
  const progress = analysis.valueProgress === null ? "--" : `${formatNumber(analysis.valueProgress * 100, { maximumFractionDigits: 0 })}%`;
  const time = analysis.timeProgress === null ? "--" : `${formatNumber(analysis.timeProgress * 100, { maximumFractionDigits: 0 })}%`;

  return `
    <article class="card goal-card" data-goal-id="${goal.id}">
      <div class="card-body">
        <div class="goal-header">
          <div>
            <p class="metric-label">${valueLabel(goal.type)}ziel</p>
            <h2 class="section-title">${formatNumber(goal.startValue, { maximumFractionDigits: 1 })} ${unit} -> ${formatNumber(goal.targetValue, { maximumFractionDigits: 1 })} ${unit}</h2>
          </div>
          <span class="status-pill">${STATUS_LABELS[analysis.overallStatus] || analysis.overallStatus}</span>
        </div>
        <div class="goal-facts">
          <p><strong>Aktuell:</strong> ${formatNumber(analysis.currentValue, { maximumFractionDigits: 1 })} ${unit}</p>
          <p><strong>Zieldatum:</strong> ${formatDate(goal.targetDate)}</p>
          <p><strong>Soll heute:</strong> ${formatNumber(analysis.expectedValueToday, { maximumFractionDigits: 1 })} ${unit}</p>
          <p><strong>Planabweichung:</strong> ${formatNumber(Math.abs(analysis.scheduleDeviation), { maximumFractionDigits: 1 })} ${changeUnit} ${analysis.scheduleDeviation >= 0 ? "vor dem Plan" : "hinter dem Plan"}</p>
          <p><strong>Ziel-Fortschritt:</strong> ${progress}</p>
          <p><strong>Verbrauchte Zeit:</strong> ${time}</p>
          <p><strong>Benoetigt:</strong> ${formatNumber(analysis.requiredWeeklyRate, { maximumFractionDigits: 2 })} ${changeUnit}/Woche</p>
          <p><strong>Ab heute benoetigt:</strong> ${formatNumber(analysis.remainingRequiredWeeklyRate, { maximumFractionDigits: 2 })} ${changeUnit}/Woche</p>
        </div>
        <div class="trend-strip">
          ${["days7", "days14", "days30"].map((key) => {
            const trend = analysis.trends[key];
            const label = key.replace("days", "");
            return `
              <div>
                <strong>${label} Tage</strong>
                <span>${trend.available ? `${formatNumber(trend.weeklyRate, { maximumFractionDigits: 2 })} ${changeUnit}/Woche` : "Nicht genug Daten"}</span>
                <small>${trend.available ? STATUS_LABELS[trend.status] : trend.reason}</small>
              </div>
            `;
          }).join("")}
        </div>
        ${primary?.available ? `
          <div class="goal-projection">
            <p><strong>Prognose am Zieltermin:</strong> ${formatNumber(primary.projectedValueAtTargetDate, { maximumFractionDigits: 1 })} ${unit}</p>
            <p><strong>Voraussichtliches Erreichen:</strong> ${primary.projectedGoalDate?.date ? formatDate(primary.projectedGoalDate.date) : "nicht berechenbar"}</p>
          </div>
        ` : ""}
        ${analysis.warnings.length ? `<div class="alert danger">${analysis.warnings.map((warning) => `<p>${warning}</p>`).join("")}</div>` : ""}
        <div class="entry-actions">
          <button class="icon-button" type="button" data-action="complete-goal">Abschliessen</button>
          <button class="icon-button danger" type="button" data-action="cancel-goal">Abbrechen</button>
        </div>
      </div>
    </article>
  `;
}

function renderGoalHistory(goals) {
  const history = goals.filter((goal) => goal.status !== "active");
  if (!history.length) {
    return `<section class="card empty-state"><h2>Keine Zielhistorie</h2><p>Abgeschlossene oder abgebrochene Ziele erscheinen hier.</p></section>`;
  }

  return `
    <section class="card">
      <div class="card-body">
        <h2 class="section-title">Zielhistorie</h2>
        <div class="entry-list">
          ${history.map((goal) => `
            <article class="entry-row">
              <div>
                <p class="entry-date">${valueLabel(goal.type)}ziel · ${goal.status === "completed" ? "abgeschlossen" : "abgebrochen"}</p>
                <p class="entry-meta">${formatNumber(goal.startValue, { maximumFractionDigits: 1 })} ${unitLabel(goal.type)} -> ${formatNumber(goal.targetValue, { maximumFractionDigits: 1 })} ${unitLabel(goal.type)} bis ${formatDate(goal.targetDate)}</p>
              </div>
            </article>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

async function refreshGoals(container) {
  const [goals, dailyEntries, bodyFatEntries] = await Promise.all([
    getGoals(),
    getDailyEntries(),
    getBodyFatEntries()
  ]);
  const activeGoals = goals.filter((goal) => goal.status === "active");
  const activeSlot = container.querySelector("[data-active-goals]");
  const historySlot = container.querySelector("[data-goal-history]");

  activeSlot.innerHTML = activeGoals.length
    ? activeGoals.map((goal) => renderGoalCard(goal, dailyEntries, bodyFatEntries)).join("")
    : `<section class="card empty-state"><h2>Noch keine aktiven Ziele</h2><p>Lege ein Gewichtsziel oder KFA-Ziel an.</p></section>`;
  historySlot.innerHTML = renderGoalHistory(goals);
}

function updateDerivedFields(container, dailyEntries, bodyFatEntries) {
  const form = container.querySelector("[data-goal-form]");
  const values = getGoalFormValues(form, dailyEntries, bodyFatEntries);
  const info = container.querySelector("[data-start-value-info]");
  const preview = container.querySelector("[data-goal-preview]");

  if (values.startValueResolution.value !== null && !form.elements.startValue.value) {
    info.textContent = `Ausgangswert: ${formatNumber(values.startValueResolution.value, { maximumFractionDigits: 1 })} ${unitLabel(values.type)}. ${values.startValueResolution.description}`;
  } else {
    info.textContent = values.startValue !== null ? "Ausgangswert manuell festgelegt." : "Noch kein Ausgangswert bestimmbar.";
  }

  const errors = validateGoal(values);
  if (errors.length) {
    preview.innerHTML = "";
    return;
  }

  const required = calculateRequiredRate(values);
  preview.innerHTML = renderStatus(`Benoetigtes Tempo: ${formatNumber(required.requiredWeeklyRate, { maximumFractionDigits: 2 })} ${changeUnitLabel(values.type)} pro Woche.`);
}

async function initializeGoals(container) {
  const form = container.querySelector("[data-goal-form]");
  const status = container.querySelector("[data-status]");
  let dailyEntries = [];
  let bodyFatEntries = [];

  try {
    [dailyEntries, bodyFatEntries] = await Promise.all([getDailyEntries(), getBodyFatEntries()]);
    form.elements.startDate.value = todayIsoDate();
    syncInputModeVisibility(form);
    updateDerivedFields(container, dailyEntries, bodyFatEntries);
    await refreshGoals(container);
  } catch (error) {
    console.error(error);
    status.innerHTML = renderStatus("Ziele konnten nicht geladen werden.", "danger");
  }

  form.addEventListener("input", () => {
    syncInputModeVisibility(form);
    updateDerivedFields(container, dailyEntries, bodyFatEntries);
  });
  form.addEventListener("change", () => {
    syncInputModeVisibility(form);
    updateDerivedFields(container, dailyEntries, bodyFatEntries);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = getGoalFormValues(form, dailyEntries, bodyFatEntries);
    const errors = validateGoal(values);

    if (errors.length) {
      status.innerHTML = renderStatus(errors.join(" "), "danger");
      return;
    }

    try {
      await saveGoal({
        type: values.type,
        inputMode: values.inputMode,
        startDate: values.startDate,
        targetDate: values.targetDate,
        startValue: values.startValue,
        targetValue: values.targetValue,
        requestedChange: values.requestedChange,
        requestedWeeks: values.requestedWeeks
      });
      form.reset();
      form.elements.startDate.value = todayIsoDate();
      syncInputModeVisibility(form);
      status.innerHTML = renderStatus("Ziel gespeichert.");
      await refreshGoals(container);
      updateDerivedFields(container, dailyEntries, bodyFatEntries);
    } catch (error) {
      console.error(error);
      status.innerHTML = renderStatus("Ziel konnte nicht gespeichert werden.", "danger");
    }
  });

  container.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    const card = event.target.closest("[data-goal-id]");

    if (!button || !card) return;

    const action = button.dataset.action;
    const statusValue = action === "complete-goal" ? "completed" : "cancelled";
    const confirmed = window.confirm(action === "complete-goal" ? "Ziel abschliessen?" : "Ziel abbrechen?");
    if (!confirmed) return;

    try {
      await updateGoalStatus(card.dataset.goalId, statusValue);
      status.innerHTML = renderStatus(action === "complete-goal" ? "Ziel abgeschlossen." : "Ziel abgebrochen.");
      await refreshGoals(container);
    } catch (error) {
      console.error(error);
      status.innerHTML = renderStatus("Zielstatus konnte nicht geaendert werden.", "danger");
    }
  });
}

export function renderGoals() {
  const fragment = document.createDocumentFragment();
  const container = document.createElement("section");
  container.className = "view-stack";
  container.innerHTML = `
    <section class="card">
      <div class="card-body">
        <h2 class="section-title">Ziel erstellen</h2>
        <div data-status></div>
        <form class="form-grid" data-goal-form>
          <label class="field">
            <span>Zieltyp</span>
            <select name="type">
              <option value="weight">Gewicht</option>
              <option value="bodyFat">KFA</option>
            </select>
          </label>
          <label class="field">
            <span>Eingabemethode</span>
            <select name="inputMode">
              <option value="targetValue">Zielwert festlegen</option>
              <option value="changeOverWeeks">Reduktion ueber Wochen</option>
            </select>
          </label>
          <label class="field">
            <span>Startdatum</span>
            <input type="date" name="startDate" required>
          </label>
          <label class="field">
            <span>Ausgangswert ueberschreiben</span>
            <input type="number" name="startValue" step="0.1" inputmode="decimal" placeholder="Optional">
          </label>
          <label class="field" data-mode-group="targetValue">
            <span>Zielwert</span>
            <input type="number" name="targetValue" step="0.1" inputmode="decimal">
          </label>
          <label class="field" data-mode-group="targetValue">
            <span>Zieldatum</span>
            <input type="date" name="targetDate">
          </label>
          <label class="field" data-mode-group="changeOverWeeks">
            <span>Gewuenschte Reduktion</span>
            <input type="number" name="requestedChange" step="0.1" inputmode="decimal">
          </label>
          <label class="field" data-mode-group="changeOverWeeks">
            <span>Zeitraum in Wochen</span>
            <input type="number" name="requestedWeeks" min="1" step="1" inputmode="numeric">
          </label>
          <p class="muted field-full" data-start-value-info></p>
          <div class="field-full" data-goal-preview></div>
          <div class="form-actions field-full">
            <button class="button" type="submit">Ziel speichern</button>
          </div>
        </form>
      </div>
    </section>

    <div class="view-stack" data-active-goals></div>
    <div data-goal-history></div>
  `;
  fragment.append(container);
  initializeGoals(container);
  return fragment;
}
