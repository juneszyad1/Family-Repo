import {
  deleteCustomExercise, deleteWorkoutSession, getCustomExercises, getExerciseFavorites,
  getWorkoutPlans, getWorkoutSessions, saveCustomExercise, saveWorkoutPlan, saveWorkoutSession,
  toggleExerciseFavorite
} from "../database.js";
import { createId, escapeHtml, formatDate, formatNumber, todayIsoDate, triggerHaptic } from "../utils.js";
import { filterExercises, getBuiltInExercises } from "../training/exercise-library.js";
import { completeSession, createSessionFromPlan } from "../training/workout-sessions.js";
import {
  calculateWorkoutStatistics, compareWorkoutWithPrevious, detectWorkoutPRs,
  getLastPerformanceForExercise, summarizeWorkout
} from "../training/workout-calculations.js";
import { validateCustomExercise, validateWorkoutPlan } from "../training/workout-validation.js";
import {
  CATEGORY_LABELS, EQUIPMENT_LABELS, MOVEMENT_PATTERN_LABELS, NEXT_SET_TYPE,
  SET_TYPES, SET_TYPE_BADGES, SET_TYPE_LABELS, SIDE_MODE_LABELS, STRETCH_CATEGORY_LABELS,
  WORKOUT_STATUS, WORKOUT_TYPE_LABELS, WORKOUT_TYPES
} from "../training/training-constants.js";
import { StretchTimer } from "../training/stretch-timer.js";
import { RestTimer } from "../training/rest-timer.js";
import { calculatePlates, calculateWarmupSets, PLATE_COLORS, STANDARD_BAR_WEIGHTS } from "../training/plate-calculator.js";
import { analyzeExerciseProgression } from "../training/overload-engine.js";
import { triggerDelight } from "../delight.js";

const state = {
  tab: "plans",
  plans: [],
  sessions: [],
  custom: [],
  favorites: [],
  editingPlan: null,
  activeSession: null,
  workoutSummary: null,
  plateCalc: null,
  historyType: "all",
  picker: { query: "", category: "", equipment: "", movementPattern: "", favorites: false, custom: false, recent: false },
  timers: new Map(),
  restTimer: null
};
export const TRAINING_TABS = [["plans","Pläne"],["history","Historie"],["library","Übungen"],["stats","Statistik"]];
const typeOptions = Object.entries(WORKOUT_TYPE_LABELS).map(([v,l]) => `<option value="${v}">${l}</option>`).join("");
const duration = (seconds) => seconds == null ? "--" : `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")} min`;
const statusMessage = (container, text, type = "success") => { const node = container.querySelector("[data-training-status]"); if (node) node.innerHTML = text ? `<div class="alert ${type}" role="status"><p>${escapeHtml(text)}</p></div>` : ""; };

async function loadState() {
  [state.plans, state.sessions, state.custom, state.favorites] = await Promise.all([getWorkoutPlans(), getWorkoutSessions(), getCustomExercises(), getExerciseFavorites()]);
  state.activeSession = (state.sessions || []).filter((s) => s.status === WORKOUT_STATUS.IN_PROGRESS).sort((a,b)=>String(b.updatedAt||b.date||"").localeCompare(String(a.updatedAt||a.date||"")))[0] || null;
}

function navigation() {
  return `<div class="training-tabs" role="tablist" aria-label="Trainingsbereiche">
    ${TRAINING_TABS.map(([id,label]) => `<button type="button" role="tab" id="training-tab-${id}" class="training-tab" aria-selected="${state.tab===id}" aria-controls="training-panel-${id}" tabindex="${state.tab===id?"0":"-1"}" data-tab="${id}">${label}</button>`).join("")}
  </div>`;
}

export function getNextTrainingTab(currentTab, key) {
  const index = Math.max(0, TRAINING_TABS.findIndex(([id]) => id === currentTab));
  if (key === "Home") return TRAINING_TABS[0][0];
  if (key === "End") return TRAINING_TABS.at(-1)[0];
  if (key === "ArrowRight") return TRAINING_TABS[(index + 1) % TRAINING_TABS.length][0];
  if (key === "ArrowLeft") return TRAINING_TABS[(index - 1 + TRAINING_TABS.length) % TRAINING_TABS.length][0];
  return currentTab;
}

export function getRequestedPlanId(hash = window.location.hash) {
  const query = hash.split("?")[1] || "";
  return new URLSearchParams(query).get("startPlan");
}

function resumePanel() {
  if (!state.activeSession || state.activeSession.status !== WORKOUT_STATUS.IN_PROGRESS || state.editingPlan || state.tab === "session") return "";
  const minutes = Math.max(1, Math.round((Date.now() - new Date(state.activeSession.startedAt)) / 60000));
  return `<section class="card resume-card"><div class="card-body"><p class="metric-label">Du hast ein laufendes Training</p><h2>${escapeHtml(state.activeSession.planNameSnapshot)}</h2><p class="muted">Gestartet vor ${minutes} Minuten</p><div class="button-row"><button class="button" data-resume>Fortsetzen</button><button class="button danger" data-discard-session>Verwerfen</button></div></div></section>`;
}

function planList() {
  const plans = (state.plans || []).filter((p) => !p.isArchived).sort((a,b) => String(b.updatedAt||b.createdAt||b.id||"").localeCompare(String(a.updatedAt||a.createdAt||a.id||"")));
  return `<section class="view-stack"><div class="training-heading"><div><p class="metric-label">Kraft & Mobilität</p><h2 class="section-title">Trainingspläne</h2><p class="muted">Plane Krafttraining, Stretching oder andere Aktivitäten.</p></div><button class="button" data-new-plan>Plan erstellen</button></div>
    ${plans.length ? `<div class="entry-list">${plans.map((plan) => `<article class="card"><div class="card-body plan-row"><div><span class="status-pill">${WORKOUT_TYPE_LABELS[plan.workoutType]}</span><h3>${escapeHtml(plan.name)}</h3><p class="muted">${plan.exercises?.length || 0} Übungen${plan.description ? ` · ${escapeHtml(plan.description)}` : ""}</p></div><div class="entry-actions"><button class="button" data-start-plan="${plan.id}">Starten</button><button class="icon-button" data-edit-plan="${plan.id}">Bearbeiten</button><button class="icon-button" data-archive-plan="${plan.id}">Archivieren</button></div></div></article>`).join("")}</div>` : `<section class="card empty-state"><h2>Noch keine Pläne</h2><p>Erstelle deinen ersten Trainingsplan.</p></section>`}
    ${state.plans.some((p)=>p.isArchived) ? `<details class="goal-details"><summary>Archivierte Pläne</summary><div class="goal-detail-stack">${state.plans.filter((p)=>p.isArchived).map((p)=>`<button class="button secondary" data-archive-plan="${p.id}">${escapeHtml(p.name)} wiederherstellen</button>`).join("")}</div></details>` : ""}
  </section>`;
}

function blankPlan() { return { id: null, name: "", workoutType: WORKOUT_TYPES.STRENGTH, description: "", exercises: [], isArchived: false }; }
function categoryOptions(type) {
  const labels = type === WORKOUT_TYPES.STRETCHING ? STRETCH_CATEGORY_LABELS : CATEGORY_LABELS;
  return `<option value="">Alle Kategorien</option>${Object.entries(labels).map(([v,l])=>`<option value="${v}" ${state.picker.category===v?"selected":""}>${l}</option>`).join("")}`;
}
function equipmentOptions() { return `<option value="">Alle Ausrüstungen</option>${Object.entries(EQUIPMENT_LABELS).map(([v,l])=>`<option value="${v}" ${state.picker.equipment===v?"selected":""}>${l}</option>`).join("")}`; }
function availableExercises(plan) {
  const builtIn = getBuiltInExercises(plan.workoutType); const custom = state.custom.filter((x)=>x.workoutType===plan.workoutType);
  const favoriteIds = new Set(state.favorites.filter((f)=>f.workoutType===plan.workoutType).map((f)=>f.exerciseId));
  const recentIds = new Set(state.sessions.slice().sort((a,b)=>String(b.updatedAt||b.date||"").localeCompare(String(a.updatedAt||a.date||""))).flatMap((s)=>s.exercises||[]).map((x)=>x.exerciseId).slice(0,30));
  return filterExercises([...builtIn,...custom], { ...state.picker, favoriteOnly: state.picker.favorites, customOnly: state.picker.custom, recentOnly: state.picker.recent, favoriteIds, recentIds }).slice(0,60);
}
function exerciseName(id) { return [...getBuiltInExercises(WORKOUT_TYPES.STRENGTH),...getBuiltInExercises(WORKOUT_TYPES.STRETCHING),...state.custom].find((x)=>x.id===id)?.name || "Unbekannte Übung"; }

function exercisePickerRows(plan) {
  const exercises = plan.workoutType === WORKOUT_TYPES.OTHER ? [] : availableExercises(plan);
  return exercises.map((x)=>`<div class="picker-row"><button type="button" class="favorite-button" data-favorite="${x.id}" aria-label="Favorit umschalten">${state.favorites.some((f)=>f.exerciseId===x.id)?"★":"☆"}</button><button type="button" class="picker-add" data-add-exercise="${x.id}"><strong>${escapeHtml(x.name)}</strong><span>${escapeHtml(x.englishName||"")} · ${x.isCustom?"Eigene Übung":escapeHtml((plan.workoutType===WORKOUT_TYPES.STRETCHING?STRETCH_CATEGORY_LABELS:CATEGORY_LABELS)[x.category]||x.category)}</span></button></div>`).join("") || `<p class="muted">Keine Übungen gefunden.</p>`;
}

function refreshExercisePicker(container) {
  const pickerList = container.querySelector("[data-picker-list]");
  if (pickerList && state.editingPlan) pickerList.innerHTML = exercisePickerRows(state.editingPlan);
}

function strengthPlanExercise(item, index) {
  const isSuperset = Boolean(item.supersetId);
  const suggestion = analyzeExerciseProgression(item.exerciseId, state.sessions, item);

  return `<article class="exercise-card ${isSuperset ? "is-superset-exercise" : ""}" data-plan-exercise="${item.id}">
    <div class="exercise-header">
      <div>
        <span class="metric-label">Übung ${index+1}${isSuperset ? ` · Supersatz ${escapeHtml(item.supersetId)}` : ""}</span>
        <h3>${escapeHtml(exerciseName(item.exerciseId))}</h3>
      </div>
      <div class="compact-actions">
        <button type="button" class="button secondary compact-button" data-generate-plan-warmup title="Aufwärm-Pyramide vor den Arbeitssätzen generieren">+ Warm-up</button>
        <button type="button" class="button secondary compact-button ${isSuperset ? "active-superset-btn" : ""}" data-toggle-plan-superset title="Als Supersatz mit benachbarter Übung koppeln/entkoppeln">
          ${isSuperset ? `SS: ${escapeHtml(item.supersetId)}` : "+ Supersatz"}
        </button>
        <button class="icon-button" data-move="up" aria-label="Nach oben">↑</button>
        <button class="icon-button" data-move="down" aria-label="Nach unten">↓</button>
        <button class="icon-button danger" data-remove-exercise aria-label="Übung entfernen">×</button>
      </div>
    </div>
    ${suggestion ? `
      <div class="overload-suggestion-pill ${suggestion.suggestionType}">
        <span class="overload-badge">${escapeHtml(suggestion.badgeText)}</span>
        <span class="overload-reason">${escapeHtml(suggestion.reasonText)}</span>
        <button type="button" class="button secondary compact-button" data-apply-plan-overload="${item.id}" data-suggested-weight="${suggestion.suggestedWeight}" data-suggested-reps="${suggestion.suggestedReps}">Übernehmen</button>
      </div>
    ` : ""}
    <div class="set-list">${item.sets.map((set,setIndex)=>{
      const type = set.setType || "normal";
      return `<div class="set-row plan-set is-${type}" data-set="${set.id}">
        <button type="button" class="set-type-pill is-${type}" data-toggle-plan-set-type title="Satz-Typ umschalten: Normal, Warm-up, Drop-Set, Failure">
          ${type === "normal" ? `Satz ${setIndex + 1}` : `${SET_TYPE_LABELS[type]} (${SET_TYPE_BADGES[type]}${setIndex + 1})`}
        </button>
        <label>Wdh.<input type="number" inputmode="numeric" min="0" max="1000" value="${set.targetReps}" data-target-reps></label>
        <label>kg<input type="number" inputmode="decimal" min="0" max="1000" step="0.1" value="${set.targetWeight}" data-target-weight></label>
        <label>RIR<input type="number" inputmode="numeric" min="0" max="10" step="1" value="${set.targetRir ?? ''}" placeholder="–" data-target-rir></label>
        <button type="button" class="icon-button compact-button" data-open-plate-calc="${set.targetWeight}" data-target-set-id="${set.id}" title="Hantelscheiben berechnen">⚖</button>
        <button class="icon-button danger" data-remove-set aria-label="Satz entfernen">×</button>
      </div>`;
    }).join("")}</div>
    <button class="button secondary" data-add-set>Satz hinzufügen</button><label class="field"><span>Übungsnotiz</span><input value="${escapeHtml(item.notes||"")}" data-exercise-notes></label></article>`;
}
function stretchPlanExercise(item, index) {
  return `<article class="exercise-card" data-plan-exercise="${item.id}"><div class="exercise-header"><div><span class="metric-label">Übung ${index+1}</span><h3>${escapeHtml(exerciseName(item.exerciseId))}</h3></div><div class="compact-actions"><button class="icon-button" data-move="up">↑</button><button class="icon-button" data-move="down">↓</button><button class="icon-button danger" data-remove-exercise>×</button></div></div><div class="form-grid"><label class="field"><span>Durchgänge</span><input type="number" inputmode="numeric" min="1" max="20" value="${item.sets}" data-stretch-sets></label><label class="field"><span>Sekunden</span><input type="number" inputmode="numeric" min="5" max="3600" value="${item.durationSeconds}" data-stretch-duration></label><label class="field"><span>Seite</span><select data-side-mode>${Object.entries(SIDE_MODE_LABELS).map(([v,l])=>`<option value="${v}" ${item.sideMode===v?"selected":""}>${l}</option>`).join("")}</select></label><label class="field"><span>Notiz</span><input value="${escapeHtml(item.notes||"")}" data-exercise-notes></label></div></article>`;
}
function planEditor(plan) {
  return `<form class="view-stack" data-plan-form><section class="card"><div class="card-body"><div class="training-heading"><div><p class="metric-label">Plan bearbeiten</p><h2>${plan.id ? escapeHtml(plan.name) : "Neuer Trainingsplan"}</h2></div><button type="button" class="button secondary" data-cancel-plan>Schließen</button></div><div class="form-grid"><label class="field"><span>Trainingsart</span><select name="workoutType" ${plan.exercises.length?"disabled":""}>${Object.entries(WORKOUT_TYPE_LABELS).map(([v,l])=>`<option value="${v}" ${plan.workoutType===v?"selected":""}>${l}</option>`).join("")}</select></label><label class="field"><span>Name</span><input name="name" required value="${escapeHtml(plan.name)}"></label><label class="field field-full"><span>Beschreibung (optional)</span><textarea name="description">${escapeHtml(plan.description||"")}</textarea></label>${plan.workoutType===WORKOUT_TYPES.OTHER?`<label class="field"><span>Standarddauer (Minuten)</span><input name="otherDuration" type="number" inputmode="numeric" min="0" max="1440" value="${Math.round((plan.durationSeconds||0)/60)}"></label>`:""}</div></div></section>
    ${plan.workoutType!==WORKOUT_TYPES.OTHER ? `<section class="card"><div class="card-body"><h2 class="section-title">Übungen auswählen</h2><div class="exercise-filters"><label class="field"><span>Suche</span><input type="search" value="${escapeHtml(state.picker.query)}" data-picker-query placeholder="Name, Muskel, Ausrüstung"></label><label class="field"><span>Kategorie</span><select data-picker-category>${categoryOptions(plan.workoutType)}</select></label>${plan.workoutType===WORKOUT_TYPES.STRENGTH?`<label class="field"><span>Ausrüstung</span><select data-picker-equipment>${equipmentOptions()}</select></label><label class="field"><span>Bewegungsmuster</span><select data-picker-movement><option value="">Alle Bewegungsmuster</option>${Object.entries(MOVEMENT_PATTERN_LABELS).map(([v,l])=>`<option value="${v}" ${state.picker.movementPattern===v?"selected":""}>${l}</option>`).join("")}</select></label>`:""}<label class="check-field"><input type="checkbox" data-picker-favorites ${state.picker.favorites?"checked":""}> Nur Favoriten</label><label class="check-field"><input type="checkbox" data-picker-custom ${state.picker.custom?"checked":""}> Nur eigene</label><label class="check-field"><input type="checkbox" data-picker-recent ${state.picker.recent?"checked":""}> Zuletzt verwendet</label></div><div class="picker-list" role="listbox" aria-label="Übungen" data-picker-list>${exercisePickerRows(plan)}</div></div></section>
    <section class="view-stack"><h2 class="section-title">Sätze konfigurieren und Reihenfolge</h2>${plan.exercises.map((x,i)=>plan.workoutType===WORKOUT_TYPES.STRENGTH?strengthPlanExercise(x,i):stretchPlanExercise(x,i)).join("") || `<section class="card empty-state"><h2>Noch keine Übung gewählt</h2><p>Nutze Suche und Filter oben.</p></section>`}</section>` : ""}
    <div class="sticky-action"><button class="button" type="submit">Plan speichern</button></div></form>`;
}

function formatDiffBadge(diffObj) {
  if (!diffObj || diffObj.percent === null || diffObj.percent === undefined) {
    return `<span class="diff-tag neutral">Neu</span>`;
  }
  const val = diffObj.percent;
  if (val > 0) {
    return `<span class="diff-tag positive">+${val}%</span>`;
  }
  if (val < 0) {
    return `<span class="diff-tag negative">${val}%</span>`;
  }
  return `<span class="diff-tag neutral">±0%</span>`;
}

function workoutCompletionModal(summary) {
  if (!summary) return "";
  const { session, prs, comparison } = summary;
  const isStrength = session.workoutType === WORKOUT_TYPES.STRENGTH;
  const sSummary = summarizeWorkout(session);

  const prsHtml = prs && prs.length > 0 ? `
    <div class="pr-section">
      <h3 class="section-title">Neue Bestleistungen</h3>
      <div class="pr-badge-list">
        ${prs.map((pr) => `
          <div class="pr-card">
            <div class="pr-card-info">
              <span class="pr-card-badge">★ ${escapeHtml(pr.label)}</span>
              <strong>${escapeHtml(pr.exerciseName)}</strong>
            </div>
            <div class="pr-card-val">
              ${escapeHtml(pr.formatted)}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  const strengthTableHtml = isStrength && comparison?.exerciseComparisons?.length ? `
    <div class="view-stack">
      <h3 class="section-title">Übersicht & Vergleich zum letzten Training</h3>
      <div class="comparison-table-wrapper">
        <table class="comparison-table">
          <thead>
            <tr>
              <th>Übung</th>
              <th>Sätze × Wdh.</th>
              <th>Top-Gewicht</th>
              <th>Volumen</th>
              <th>Vergleich</th>
            </tr>
          </thead>
          <tbody>
            ${comparison.exerciseComparisons.map((ec) => {
              const setsStr = ec.current.sets.length > 0
                ? `${ec.current.sets.length}S · ${ec.current.totalReps} Wdh.`
                : "--";
              const weightStr = ec.current.maxWeight > 0 ? `${formatNumber(ec.current.maxWeight, { maximumFractionDigits: 1 })} kg` : "Bodyweight";
              const volStr = `${formatNumber(ec.current.totalVolume, { maximumFractionDigits: 0 })} kg`;
              const badge = formatDiffBadge(ec.volumeDiff);

              return `
                <tr>
                  <td>${escapeHtml(ec.exerciseName)}</td>
                  <td>${setsStr}</td>
                  <td>${weightStr}</td>
                  <td>${volStr}</td>
                  <td>${badge}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  ` : "";

  const comparisonStripHtml = isStrength ? `
    <div class="comparison-summary-strip">
      <div class="metric">
        <span class="metric-label">Dauer</span>
        <p class="metric-value" style="font-size: 1.3rem;">${duration(session.durationSeconds)}</p>
      </div>
      <div class="metric">
        <span class="metric-label">Gesamtvolumen</span>
        <p class="metric-value" style="font-size: 1.3rem;">${formatNumber(sSummary.totalVolume, { maximumFractionDigits: 0 })} kg</p>
        ${comparison?.totalComparison?.volume?.percent !== null && comparison?.totalComparison?.volume?.percent !== undefined ? `
          <small class="muted">${comparison.totalComparison.volume.percent >= 0 ? `+${comparison.totalComparison.volume.percent}%` : `${comparison.totalComparison.volume.percent}%`} vs. Vorher</small>
        ` : ""}
      </div>
      <div class="metric">
        <span class="metric-label">Wiederholungen</span>
        <p class="metric-value" style="font-size: 1.3rem;">${sSummary.totalReps}</p>
        ${comparison?.totalComparison?.reps?.percent !== null && comparison?.totalComparison?.reps?.percent !== undefined ? `
          <small class="muted">${comparison.totalComparison.reps.percent >= 0 ? `+${comparison.totalComparison.reps.percent}%` : `${comparison.totalComparison.reps.percent}%`} vs. Vorher</small>
        ` : ""}
      </div>
      <div class="metric">
        <span class="metric-label">Kraftsätze</span>
        <p class="metric-value" style="font-size: 1.3rem;">${sSummary.completedSets}</p>
      </div>
    </div>
  ` : `
    <div class="comparison-summary-strip">
      <div class="metric">
        <span class="metric-label">Dauer</span>
        <p class="metric-value" style="font-size: 1.3rem;">${duration(session.durationSeconds)}</p>
      </div>
      <div class="metric">
        <span class="metric-label">Durchgänge</span>
        <p class="metric-value" style="font-size: 1.3rem;">${sSummary.completedSets || 0}</p>
      </div>
    </div>
  `;

  return `
    <div class="completion-celebration" data-celebration-overlay>
      <div class="celebration-modal" role="dialog" aria-modal="true" aria-labelledby="celebration-title">
        <div class="celebration-banner">
          <div class="celebration-icon">★</div>
          <h2 id="celebration-title" class="celebration-title">Training abgeschlossen!</h2>
          <p class="celebration-subtitle">${escapeHtml(session.planNameSnapshot)} · ${formatDate(session.date)}</p>
        </div>
        ${comparisonStripHtml}
        ${prsHtml}
        ${strengthTableHtml}
        <div class="form-actions field-full">
          <button type="button" class="button" data-dismiss-summary>Fertig & Zur Historie</button>
        </div>
      </div>
    </div>
  `;
}

function plateCalculatorModal(plateCalc) {
  if (!plateCalc || !plateCalc.isOpen) return "";
  const { targetWeight, barWeight, targetSetId } = plateCalc;
  const result = calculatePlates(targetWeight, barWeight);

  return `
    <div class="completion-celebration" data-plate-calc-overlay>
      <div class="celebration-modal plate-calc-modal" role="dialog" aria-modal="true" aria-labelledby="plate-calc-title">
        <div class="celebration-banner">
          <div class="celebration-icon">⚖</div>
          <h2 id="plate-calc-title" class="celebration-title">Hantelscheiben-Rechner</h2>
          <p class="celebration-subtitle">Optimales Stecken pro Seite</p>
        </div>

        <div class="plate-calc-hero">
          <div class="plate-calc-target-display">
            <span class="metric-label">Gesamtgewicht</span>
            <p class="hero-value">${formatNumber(result.targetWeight, { maximumFractionDigits: 1 })}<span>kg</span></p>
          </div>
          <div class="plate-calc-side-display">
            <span class="metric-label">Pro Seite</span>
            <p class="hero-value" style="font-size: 1.6rem;">${formatNumber(result.weightPerSide, { maximumFractionDigits: 2 })}<span>kg</span></p>
          </div>
        </div>

        <div class="plate-calc-controls">
          <div class="plate-calc-adjusters">
            <button type="button" class="button secondary compact-button" data-adjust-plate-target="-5">-5 kg</button>
            <button type="button" class="button secondary compact-button" data-adjust-plate-target="-2.5">-2.5 kg</button>
            <button type="button" class="button secondary compact-button" data-adjust-plate-target="+2.5">+2.5 kg</button>
            <button type="button" class="button secondary compact-button" data-adjust-plate-target="+5">+5 kg</button>
          </div>
          
          <label class="field" style="margin-top: 8px;">
            <span>Stangengewicht</span>
            <select data-plate-bar-select>
              ${STANDARD_BAR_WEIGHTS.map((b) => `
                <option value="${b.value}" ${b.value === barWeight ? "selected" : ""}>${b.label}</option>
              `).join("")}
            </select>
          </label>
        </div>

        <div class="barbell-visual-wrap">
          <div class="barbell-visual">
            <div class="barbell-collar"></div>
            <div class="barbell-sleeve">
              ${result.platesPerSide.map((p) => {
                const color = PLATE_COLORS[p.plate] || "#64748b";
                return Array.from({ length: p.count }).map(() => `
                  <div class="barbell-plate plate-${String(p.plate).replace('.', '-')}" style="--plate-color: ${color};" title="${p.plate} kg">
                    <span>${p.plate}</span>
                  </div>
                `).join("");
              }).join("")}
              ${!result.platesPerSide.length ? `<span class="empty-sleeve-hint">Nur Stange (${barWeight} kg)</span>` : ""}
            </div>
          </div>
        </div>

        <div class="plate-breakdown-list">
          ${result.platesPerSide.length ? `
            <div class="stat-strip">
              ${result.platesPerSide.map((p) => `
                <div class="stat-cell">
                  <p class="stat-label">${p.plate} kg</p>
                  <p class="stat-value">${p.count}× <span class="stat-unit">/ Seite</span></p>
                </div>
              `).join("")}
            </div>
          ` : `<p class="muted text-center" style="font-size: 0.85rem; margin: 8px 0;">Keine Scheiben nötig. Nutze nur die Stange (${barWeight} kg).</p>`}
        </div>

        <div class="form-actions field-full" style="margin-top: 14px;">
          ${targetSetId ? `<button type="button" class="button" data-apply-plate-weight="${result.targetWeight}" data-target-set-id="${targetSetId}">Gewicht übernehmen (${result.targetWeight} kg)</button>` : ""}
          <button type="button" class="button secondary" data-close-plate-calc>Schließen</button>
        </div>
      </div>
    </div>
  `;
}

function historyView() {
  const items = (state.sessions || []).filter((s)=>s.status!==WORKOUT_STATUS.IN_PROGRESS && (state.historyType==="all"||s.workoutType===state.historyType)).sort((a,b)=>String(b.completedAt||b.updatedAt||b.date||"").localeCompare(String(a.completedAt||a.updatedAt||a.date||"")));
  return `<section class="view-stack"><section class="card"><div class="card-body"><label class="field"><span>Historie filtern</span><select data-history-filter><option value="all">Alle</option>${typeOptions}</select></label></div></section>${items.length?`<div class="entry-list">${items.map((s)=>{const sum=summarizeWorkout(s);return `<article class="card"><div class="card-body plan-row"><div><span class="status-pill">${WORKOUT_TYPE_LABELS[s.workoutType]}</span><h3>${escapeHtml(s.planNameSnapshot)}</h3><p class="muted">${formatDate(s.date)} · ${duration(s.durationSeconds)} · ${sum.exerciseCount} Übungen · ${s.status==="completed"?"Abgeschlossen":"Abgebrochen"}</p></div><div class="entry-actions"><button class="button secondary" data-show-summary="${s.id}">Zusammenfassung</button><button class="button secondary" data-open-session="${s.id}">Öffnen</button><button class="button danger" data-delete-session="${s.id}">Löschen</button></div></div></article>`}).join("")}</div>`:`<section class="card empty-state"><h2>Noch keine Einheiten</h2><p>Abgeschlossene Trainings erscheinen hier.</p></section>`}</section>`;
}
function libraryView() {
  const strengthCount=getBuiltInExercises("strength").length, stretchCount=getBuiltInExercises("stretching").length;
  return `<section class="view-stack"><section class="card"><div class="card-body"><div class="trend-hero-header"><div><p class="metric-label">Übungs-Bibliothek</p><p class="hero-value">${strengthCount + stretchCount}<span>Übungen</span></p></div></div><div class="stat-strip"><div class="stat-cell"><p class="stat-label">Kraftübungen</p><p class="stat-value">${strengthCount}</p></div><div class="stat-cell"><p class="stat-label">Stretch-Übungen</p><p class="stat-value">${stretchCount}</p></div><div class="stat-cell"><p class="stat-label">Eigene Übungen</p><p class="stat-value">${state.custom.length}</p></div></div></div></section><section class="card"><div class="card-body"><div class="training-heading"><div><h2 class="section-title">Eigene Übungen</h2><p class="muted">Eigene Übungen können bearbeitet und gelöscht werden.</p></div><button class="button" data-new-custom>Übung erstellen</button></div>${state.custom.length?`<div class="entry-list">${state.custom.map((x)=>`<div class="entry-row"><div><strong>${escapeHtml(x.name)}</strong><p class="entry-meta">${WORKOUT_TYPE_LABELS[x.workoutType]}</p></div><div class="entry-actions"><button class="icon-button" data-edit-custom="${x.id}">Bearbeiten</button><button class="icon-button danger" data-delete-custom="${x.id}">Löschen</button></div></div>`).join("")}</div>`:""}</div></section></section>`;
}
function customEditor(exercise={ workoutType:"strength", name:"", category:"chest", equipment:["bodyweight"], stretchType:"static", defaultDurationSeconds:30, defaultSets:2 }) {
  return `<form class="card" data-custom-form data-id="${exercise.id||""}"><div class="card-body"><h2>${exercise.id?"Eigene Übung bearbeiten":"Eigene Übung erstellen"}</h2><div class="form-grid"><label class="field"><span>Art</span><select name="workoutType">${Object.entries(WORKOUT_TYPE_LABELS).filter(([v])=>v!=="other").map(([v,l])=>`<option value="${v}" ${exercise.workoutType===v?"selected":""}>${l}</option>`).join("")}</select></label><label class="field"><span>Name</span><input name="name" required value="${escapeHtml(exercise.name)}"></label><label class="field"><span>Kategorie/Zielbereich</span><select name="category">${Object.entries({...CATEGORY_LABELS,...STRETCH_CATEGORY_LABELS}).map(([v,l])=>`<option value="${v}" ${exercise.category===v?"selected":""}>${l}</option>`).join("")}</select></label><label class="field"><span>Ausrüstung (Kraft)</span><select name="equipment">${Object.entries(EQUIPMENT_LABELS).map(([v,l])=>`<option value="${v}" ${exercise.equipment?.includes(v)?"selected":""}>${l}</option>`).join("")}</select></label><label class="field"><span>Primäre Muskeln (optional, Komma)</span><input name="primaryMuscles" value="${escapeHtml((exercise.primaryMuscles||[]).join(", "))}"></label><label class="field"><span>Sekundäre Muskeln (optional, Komma)</span><input name="secondaryMuscles" value="${escapeHtml((exercise.secondaryMuscles||[]).join(", "))}"></label><label class="field"><span>Stretching-Typ</span><select name="stretchType"><option value="static" ${exercise.stretchType==="static"?"selected":""}>Statisch</option><option value="dynamic" ${exercise.stretchType==="dynamic"?"selected":""}>Dynamisch</option><option value="mobility" ${exercise.stretchType==="mobility"?"selected":""}>Mobility</option></select></label><label class="field"><span>Standarddauer Sekunden</span><input name="defaultDurationSeconds" type="number" min="5" max="3600" value="${exercise.defaultDurationSeconds||30}"></label><label class="field"><span>Standard-Durchgänge</span><input name="defaultSets" type="number" min="1" max="20" value="${exercise.defaultSets||2}"></label><label class="field field-full"><span>Notiz</span><textarea name="notes">${escapeHtml(exercise.notes||"")}</textarea></label></div><div class="form-actions"><button class="button">Speichern</button><button type="button" class="button secondary" data-cancel-custom>Abbrechen</button></div></div></form>`;
}
function statsView() {
  const x=calculateWorkoutStatistics(state.sessions),completed=(state.sessions||[]).filter((s)=>s.status===WORKOUT_STATUS.COMPLETED),stretch=completed.filter((s)=>s.workoutType===WORKOUT_TYPES.STRETCHING),stretchDuration=stretch.reduce((sum,s)=>sum+(s.durationSeconds||0),0),frequency=new Map();stretch.flatMap((s)=>s.exercises||[]).forEach((e)=>frequency.set(e.exerciseNameSnapshot,(frequency.get(e.exerciseNameSnapshot)||0)+1));const common=[...frequency].sort((a,b)=>b[1]-a[1]).slice(0,5),volumes=completed.filter((s)=>s.workoutType===WORKOUT_TYPES.STRENGTH).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))).slice(0,8).map((s)=>[s.date,summarizeWorkout(s).totalVolume]);
  return `<section class="view-stack">
    <section class="card"><div class="card-body"><div class="trend-hero-header"><div><p class="metric-label">Aktivität diese Woche</p><p class="hero-value">${x.weeklyCount}<span>Einheiten</span></p></div><span class="status-pill">${x.monthlyCount} Einheiten diesen Monat</span></div><div class="stat-strip"><div class="stat-cell"><p class="stat-label">Gesamtdauer</p><p class="stat-value">${duration(x.totalDuration)}</p></div><div class="stat-cell"><p class="stat-label">Ø Dauer</p><p class="stat-value">${duration(x.averageDuration)}</p></div><div class="stat-cell"><p class="stat-label">Kraft / Stretch</p><p class="stat-value">${x.strengthCount} / ${x.stretchingCount}</p></div></div></div></section>
    <section class="card"><div class="card-body"><div class="trend-hero-header"><div><p class="metric-label">Kraftvolumen gesamt</p><p class="hero-value">${formatNumber(x.totalVolume,{maximumFractionDigits:0})}<span>kg</span></p></div></div><div class="stat-strip"><div class="stat-cell"><p class="stat-label">Kraftsätze</p><p class="stat-value">${x.totalSets}</p></div><div class="stat-cell"><p class="stat-label">Wiederholungen</p><p class="stat-value">${x.totalReps}</p></div><div class="stat-cell"><p class="stat-label">Stretch-Dauer</p><p class="stat-value">${duration(stretchDuration)}</p></div></div></div></section>
    <section class="card"><div class="card-body"><h2 class="section-title">Kraftvolumen nach Datum</h2>${volumes.length?`<ul class="stat-list">${volumes.map(([d,v])=>`<li><span>${formatDate(d)}</span><strong>${formatNumber(v,{maximumFractionDigits:1})} kg</strong></li>`).join("")}</ul>`:`<p class="muted">Noch keine Krafttrainings.</p>`}</div></section>
    <section class="card"><div class="card-body"><h2 class="section-title">Häufigste Stretch-Übungen</h2>${common.length?`<ol class="stat-list">${common.map(([n,c])=>`<li><span>${escapeHtml(n)}</span><strong>${c}×</strong></li>`).join("")}</ol>`:`<p class="muted">Noch keine Stretching-Einheiten.</p>`}</div></section>
  </section>`;
}

function restTimerBar() {
  if (!state.restTimer || !state.activeSession || state.activeSession.status !== WORKOUT_STATUS.IN_PROGRESS || state.activeSession.workoutType !== WORKOUT_TYPES.STRENGTH) return "";
  const isRunning = state.restTimer.status === "running";
  const isFinished = state.restTimer.status === "finished";
  const timeStr = duration(state.restTimer.remainingSeconds);

  return `
    <div class="rest-timer-bar ${isRunning ? "is-running" : ""} ${isFinished ? "is-finished" : ""}" data-rest-timer-bar>
      <div class="rest-timer-info">
        <span class="rest-timer-label">${isFinished ? "Pause beendet!" : "Satzpause"}</span>
        <strong class="rest-timer-clock" data-rest-clock>${timeStr}</strong>
      </div>
      <div class="rest-timer-controls">
        <button type="button" class="button secondary compact-button" data-rest-adjust="-30" aria-label="30 Sekunden abziehen">-30s</button>
        <button type="button" class="button secondary compact-button" data-rest-adjust="+30" aria-label="30 Sekunden hinzufügen">+30s</button>
        ${isRunning
          ? `<button type="button" class="button secondary compact-button" data-rest-pause>Pause</button>`
          : `<button type="button" class="button compact-button" data-rest-start>Start</button>`}
        <button type="button" class="icon-button" data-rest-stop aria-label="Pausen-Timer stoppen">×</button>
      </div>
    </div>
  `;
}

function sessionView(session) {
  const readonly = session.status !== WORKOUT_STATUS.IN_PROGRESS; const summary = summarizeWorkout(session);
  return `<form class="view-stack" data-session-form>
    ${!readonly ? restTimerBar() : ""}
    <section class="card"><div class="card-body"><div class="training-heading"><div><span class="status-pill">${WORKOUT_TYPE_LABELS[session.workoutType]}</span><h2>${escapeHtml(session.planNameSnapshot)}</h2><p class="muted">${readonly?"Abgeschlossen":"Laufendes Training"}</p></div><button type="button" class="button secondary" data-close-session>Schließen</button></div>${readonly?`<div class="stat-strip"><div class="stat-cell"><p class="stat-label">Übungen</p><p class="stat-value">${summary.exerciseCount}</p></div>${session.workoutType==="strength"?`<div class="stat-cell"><p class="stat-label">Sätze</p><p class="stat-value">${summary.completedSets}</p></div><div class="stat-cell"><p class="stat-label">Wdh.</p><p class="stat-value">${summary.totalReps}</p></div><div class="stat-cell"><p class="stat-label">Volumen</p><p class="stat-value">${formatNumber(summary.totalVolume,{maximumFractionDigits:1})} <span class="stat-unit">kg</span></p></div>`:`<div class="stat-cell"><p class="stat-label">Durchgänge</p><p class="stat-value">${summary.completedSets||0}</p></div>`}</div>`:""}<div class="form-grid"><label class="field"><span>Datum</span><input name="date" type="date" value="${session.date}" ${readonly?"":"readonly"}></label><label class="field"><span>Trainingsnotiz</span><textarea name="notes">${escapeHtml(session.notes||"")}</textarea></label></div></div></section>
    ${session.workoutType===WORKOUT_TYPES.OTHER?`<section class="card"><div class="card-body"><label class="field"><span>Dauer (Minuten)</span><input data-other-duration type="number" min="0" max="1440" value="${Math.round((session.durationSeconds||0)/60)}"></label></div></section>`:session.exercises.map((exercise,index)=>sessionExercise(exercise,index,session.workoutType,readonly)).join("")}
    <div class="sticky-action">${readonly?`<button class="button" data-show-summary="${session.id}">Zusammenfassung anzeigen</button><button class="button secondary" data-save-completed>Änderungen speichern</button>`:`<button class="button" data-complete-session>Training abschließen</button><button class="button danger" data-cancel-session>Training abbrechen</button>`}</div></form>`;
}

function sessionExercise(exercise,index,type,readonly) {
  const isSuperset = Boolean(exercise.supersetId);
  const firstOpenExercise = state.activeSession?.exercises.find((item) => item.sets.some((set) => !set.completed));
  const firstOpenSet = firstOpenExercise?.sets.find((set) => !set.completed);
  const lastPerf = (!readonly && type === WORKOUT_TYPES.STRENGTH)
    ? getLastPerformanceForExercise(state.sessions, exercise.exerciseId || exercise.exerciseNameSnapshot, state.activeSession?.id)
    : null;
  const suggestion = (!readonly && type === WORKOUT_TYPES.STRENGTH)
    ? analyzeExerciseProgression(exercise.exerciseId || exercise.exerciseNameSnapshot, state.sessions, exercise)
    : null;

  const setRows = exercise.sets.map((set, i) => {
    if (type === WORKOUT_TYPES.STRENGTH) {
      const setType = set.setType || "normal";
      const lastSet = lastPerf?.sets?.[i];
      const ghostReps = lastSet ? `z. B. ${lastSet.actualReps}` : "";
      const ghostWeight = lastSet ? `z. B. ${formatNumber(lastSet.actualWeight, { maximumFractionDigits: 1 })}` : "";
      const ghostRir = lastSet?.actualRir != null ? `z. B. ${lastSet.actualRir}` : "";

      return `
        <div class="set-row session-set is-${setType} ${set.completed ? "is-complete" : ""} ${set.id === firstOpenSet?.id ? "is-current" : ""}" data-session-set="${set.id}">
          <div class="set-meta-info">
            <button type="button" class="set-type-pill is-${setType}" ${readonly ? "disabled" : ""} data-toggle-session-set-type title="Satz-Typ wechseln: Normal, Warm-up, Drop-Set, Failure">
              ${setType === "normal" ? `Satz ${i + 1}` : `${SET_TYPE_LABELS[setType]} (${SET_TYPE_BADGES[setType]}${i + 1})`}
            </button>
            ${lastSet ? `<span class="ghost-set-pill" title="Letzte Einheit (${formatDate(lastPerf.sessionDate)})">Vorher: ${formatNumber(lastSet.actualWeight, { maximumFractionDigits: 1 })}kg × ${lastSet.actualReps}${lastSet.actualRir != null ? ` @ ${lastSet.actualRir} RIR` : ""}</span>` : ""}
          </div>
          <label>Wdh. · Ziel ${set.plannedReps ?? "–"}
            <input type="number" inputmode="numeric" min="0" max="1000" value="${set.actualReps ?? ""}" placeholder="${ghostReps}" data-actual-reps>
          </label>
          <label>kg · Ziel ${formatNumber(set.plannedWeight, { maximumFractionDigits: 1 })}
            <input type="number" inputmode="decimal" min="0" max="1000" step="0.1" value="${set.actualWeight ?? ""}" placeholder="${ghostWeight}" data-actual-weight>
          </label>
          <label>RIR · Ziel ${set.targetRir ?? "–"}
            <input type="number" inputmode="numeric" min="0" max="1000" step="1" value="${set.actualRir ?? ""}" placeholder="${ghostRir}" data-actual-rir>
          </label>
          <button type="button" class="icon-button compact-button" data-open-plate-calc="${set.actualWeight || set.plannedWeight || 20}" data-target-set-id="${set.id}" title="Hantelscheiben berechnen">⚖</button>
          <label class="set-check">
            <input type="checkbox" data-set-completed ${set.completed ? "checked" : ""}>
            <span>${set.completed ? "Erledigt" : "Satz abschließen"}</span>
          </label>
          ${readonly ? "" : `<button type="button" class="icon-button danger" data-remove-session-set aria-label="Satz entfernen">×</button>`}
        </div>
      `;
    }

    return `
      <div class="stretch-round ${set.completed ? "is-complete" : ""} ${set.id === firstOpenSet?.id ? "is-current" : ""}" data-session-set="${set.id}">
        <label class="set-check">
          <input type="checkbox" data-set-completed ${set.completed ? "checked" : ""}>
          <span>Durchgang ${i + 1}: ${set.completed ? "Erledigt" : "Offen"}</span>
        </label>
      </div>
    `;
  }).join("");

  const timerRemaining = exercise.timerState?.endsAt ? Math.max(0,Math.ceil((exercise.timerState.endsAt-Date.now())/1000)) : exercise.timerState?.remainingSeconds ?? exercise.durationSeconds;

  return `
    <article class="exercise-card ${isSuperset ? "is-superset-exercise" : ""} ${exercise.id===firstOpenExercise?.id?"is-current-exercise":""}" data-session-exercise="${exercise.id}">
      <div class="exercise-header">
        <div>
          <span class="metric-label">Übung ${index+1}${isSuperset ? ` · Supersatz ${escapeHtml(exercise.supersetId)}` : ""}${exercise.id===firstOpenExercise?.id?" · Aktuell":""}</span>
          <h3>${escapeHtml(exercise.exerciseNameSnapshot)}</h3>
          ${type===WORKOUT_TYPES.STRETCHING?`<p class="muted">${exercise.durationSeconds} Sekunden · ${SIDE_MODE_LABELS[exercise.sideMode]}</p>`:""}
        </div>
        <div class="compact-actions">
          ${!readonly && type===WORKOUT_TYPES.STRENGTH ? `
            <button type="button" class="button secondary compact-button" data-generate-session-warmup="${exercise.id}" title="Aufwärm-Pyramide vor den Arbeitssätzen generieren">+ Warm-up</button>
            <button type="button" class="button secondary compact-button ${isSuperset ? "active-superset-btn" : ""}" data-toggle-session-superset="${exercise.id}" title="Als Supersatz mit benachbarter Übung koppeln/entkoppeln">
              ${isSuperset ? `SS: ${escapeHtml(exercise.supersetId)}` : "+ Supersatz"}
            </button>
          ` : ""}
          ${lastPerf ? `
            <button type="button" class="button secondary compact-button ghost-autofill-btn" data-autofill-exercise="${exercise.id}" title="Werte aus vorheriger Einheit (${formatDate(lastPerf.sessionDate)}) für alle Sätze übernehmen">
              Letzte Einheit
            </button>
          ` : ""}
        </div>
      </div>
      ${suggestion ? `
        <div class="overload-suggestion-pill ${suggestion.suggestionType}">
          <span class="overload-badge">${escapeHtml(suggestion.badgeText)}</span>
          <span class="overload-reason">${escapeHtml(suggestion.reasonText)}</span>
          ${!readonly ? `
            <button type="button" class="button secondary compact-button" data-apply-session-overload="${exercise.id}" data-suggested-weight="${suggestion.suggestedWeight}" data-suggested-reps="${suggestion.suggestedReps}">Übernehmen</button>
          ` : ""}
        </div>
      ` : ""}
      <div class="set-list">${setRows}</div>
      ${!readonly&&type===WORKOUT_TYPES.STRENGTH?`<button type="button" class="button secondary" data-add-session-set>Satz hinzufügen</button>`:""}
      ${!readonly&&type===WORKOUT_TYPES.STRETCHING?`<div class="timer" data-timer><strong data-timer-time>${timerRemaining}</strong><span data-timer-status>${timerRemaining===0?"Zeit abgelaufen":exercise.timerState?.status==="paused"?"Pausiert":"Bereit"}</span><div class="compact-actions"><button type="button" class="button" data-timer-start>Start/Fortsetzen</button><button type="button" class="button secondary" data-timer-pause>Pause</button><button type="button" class="button secondary" data-timer-reset>Zurücksetzen</button></div></div>`:""}
      <label class="field"><span>Übungsnotiz</span><input value="${escapeHtml(exercise.notes||"")}" data-session-exercise-notes></label>
      ${!readonly&&index<state.activeSession.exercises.length-1?`<button type="button" class="button secondary" data-next-exercise>Nächste Übung</button>`:""}
    </article>
  `;
}

function ensureRestTimer(container) {
  if (!state.restTimer) {
    state.restTimer = new RestTimer(90, () => {
      const clock = container.querySelector("[data-rest-clock]");
      if (clock && state.restTimer) {
        clock.textContent = duration(state.restTimer.remainingSeconds);
        const bar = container.querySelector("[data-rest-timer-bar]");
        if (bar) {
          bar.classList.toggle("is-running", state.restTimer.status === "running");
          bar.classList.toggle("is-finished", state.restTimer.status === "finished");
          const label = bar.querySelector(".rest-timer-label");
          if (label) {
            label.textContent = state.restTimer.status === "finished" ? "Pause beendet!" : "Satzpause";
          }
        }
      }
    });
  }
}

function renderContent(container) {
  state.timers.forEach((timer)=>timer.destroy()); state.timers.clear();
  ensureRestTimer(container);
  let content = state.activeSession && state.tab==="session" ? sessionView(state.activeSession) : state.editingPlan ? planEditor(state.editingPlan) : state.tab==="plans" ? planList() : state.tab==="history" ? historyView() : state.tab==="library" ? libraryView() : statsView();
  const isSession = state.activeSession && state.tab === "session";
  document.body.classList.toggle("workout-focus", Boolean(isSession && state.activeSession.status === WORKOUT_STATUS.IN_PROGRESS));
  const activeTab = TRAINING_TABS.some(([id]) => id === state.tab) ? state.tab : "plans";
  const tabPanels = TRAINING_TABS.map(([id]) => `<div role="tabpanel" id="training-panel-${id}" aria-labelledby="training-tab-${id}" tabindex="0" ${id===activeTab?"":"hidden"}>${id===activeTab?`${resumePanel()}${content}`:""}</div>`).join("");
  container.innerHTML = `<div data-training-status aria-live="polite"></div>${isSession?"":navigation()}${isSession?content:tabPanels}${workoutCompletionModal(state.workoutSummary)}${plateCalculatorModal(state.plateCalc)}`;
}
function mutatePlanExercise(target, callback) { const el=target.closest("[data-plan-exercise]"); const item=state.editingPlan.exercises.find((x)=>x.id===el?.dataset.planExercise); if(item) callback(item,el); }
async function persistActive(container) { if (!state.activeSession) return; await saveWorkoutSession(state.activeSession); state.sessions=await getWorkoutSessions(); }
async function startPlan(container, planId) { if(state.activeSession?.status===WORKOUT_STATUS.IN_PROGRESS)throw new Error("Schließe oder verwirf zuerst das laufende Training.");const plan=state.plans.find((x)=>x.id===planId);if(!plan)throw new Error("Der ausgewählte Trainingsplan wurde nicht gefunden.");state.activeSession=createSessionFromPlan(plan,state.custom);await saveWorkoutSession(state.activeSession);state.tab="session";renderContent(container); }
function selectTrainingTab(container, tabId, focus = false) { state.tab=tabId;state.editingPlan=null;if(state.activeSession?.status!==WORKOUT_STATUS.IN_PROGRESS)state.activeSession=null;renderContent(container);if(focus)container.querySelector(`[data-tab="${tabId}"]`)?.focus(); }

function bindEvents(container) {
  container.addEventListener("click", async (event) => {
    const button=event.target.closest("button"); if(!button) return;
    try {
      if(button.hasAttribute("data-dismiss-summary")){state.workoutSummary=null;state.activeSession=null;state.tab="history";renderContent(container);return;}
      if(button.dataset.showSummary){const targetSession=state.sessions.find((s)=>s.id===button.dataset.showSummary);if(targetSession){const prs=detectWorkoutPRs(targetSession,state.sessions);const comparison=compareWorkoutWithPrevious(targetSession,state.sessions);state.workoutSummary={session:targetSession,prs,comparison};renderContent(container);}return;}
      if(button.dataset.tab){selectTrainingTab(container,button.dataset.tab);return;}
      if(button.hasAttribute("data-new-plan")){state.editingPlan=blankPlan();renderContent(container);return;}
      if(button.hasAttribute("data-cancel-plan")){state.editingPlan=null;renderContent(container);return;}
      if(button.dataset.editPlan){state.editingPlan=structuredClone(state.plans.find((p)=>p.id===button.dataset.editPlan));renderContent(container);return;}
      if(button.dataset.archivePlan){const p=state.plans.find((x)=>x.id===button.dataset.archivePlan);await saveWorkoutPlan({...p,isArchived:!p.isArchived});await loadState();renderContent(container);return;}
      if(button.dataset.startPlan){await startPlan(container,button.dataset.startPlan);return;}
      if(button.hasAttribute("data-resume")){state.tab="session";renderContent(container);return;}
      if(button.hasAttribute("data-discard-session")){if(confirm("Laufendes Training wirklich verwerfen?")){state.activeSession={...state.activeSession,status:WORKOUT_STATUS.CANCELLED,completedAt:new Date().toISOString()};await persistActive(container);state.activeSession=null;renderContent(container);}return;}
      if(button.dataset.addExercise){const id=button.dataset.addExercise;const type=state.editingPlan.workoutType;state.editingPlan.exercises.push(type===WORKOUT_TYPES.STRENGTH?{id:createId("plan-exercise"),exerciseId:id,order:state.editingPlan.exercises.length+1,sets:[{id:createId("set-template"),targetReps:8,targetWeight:0}],notes:""}:{id:createId("plan-stretch"),exerciseId:id,order:state.editingPlan.exercises.length+1,sets:2,durationSeconds:30,sideMode:"both",notes:""});renderContent(container);return;}
      if(button.dataset.favorite){await toggleExerciseFavorite(button.dataset.favorite,state.editingPlan?.workoutType||"strength");state.favorites=await getExerciseFavorites();renderContent(container);return;}
      if(button.hasAttribute("data-toggle-plan-set-type")){
        mutatePlanExercise(button,(item)=>{
          const setEl=button.closest("[data-set]");
          const set=item.sets?.find((s)=>s.id===setEl?.dataset.set);
          if(set){set.setType=NEXT_SET_TYPE[set.setType||"normal"]||"normal";triggerHaptic("light");}
        });
        renderContent(container);return;
      }
      if(button.hasAttribute("data-toggle-session-set-type")){
        const ex=state.activeSession.exercises.find((x)=>x.id===button.closest("[data-session-exercise]").dataset.sessionExercise);
        const set=ex?.sets?.find((s)=>s.id===button.closest("[data-session-set]")?.dataset.sessionSet);
        if(set){set.setType=NEXT_SET_TYPE[set.setType||"normal"]||"normal";triggerHaptic("light");await persistActive(container);renderContent(container);}
        return;
      }
      if(button.hasAttribute("data-toggle-plan-superset")){
        mutatePlanExercise(button,(item)=>{
          const planExercises=state.editingPlan.exercises;
          const currentIndex=planExercises.indexOf(item);
          if(item.supersetId){
            const oldId=item.supersetId;
            item.supersetId=null;
            const remaining=planExercises.filter((e)=>e.supersetId===oldId);
            if(remaining.length===1) remaining[0].supersetId=null;
          } else {
            const nextEx=planExercises[currentIndex+1];
            const prevEx=planExercises[currentIndex-1];
            const pairId=`SS-${currentIndex+1}`;
            if(nextEx && !nextEx.supersetId){item.supersetId=pairId;nextEx.supersetId=pairId;}
            else if(prevEx && !prevEx.supersetId){item.supersetId=pairId;prevEx.supersetId=pairId;}
            else {item.supersetId=pairId;}
          }
          triggerHaptic("medium");
        });
        renderContent(container);return;
      }
      if(button.dataset.toggleSessionSuperset){
        const ex=state.activeSession.exercises.find((x)=>x.id===button.dataset.toggleSessionSuperset);
        if(ex){
          const sessionExercises=state.activeSession.exercises;
          const currentIndex=sessionExercises.indexOf(ex);
          if(ex.supersetId){
            const oldId=ex.supersetId;
            ex.supersetId=null;
            const remaining=sessionExercises.filter((e)=>e.supersetId===oldId);
            if(remaining.length===1) remaining[0].supersetId=null;
          } else {
            const nextEx=sessionExercises[currentIndex+1];
            const prevEx=sessionExercises[currentIndex-1];
            const pairId=`SS-${currentIndex+1}`;
            if(nextEx && !nextEx.supersetId){ex.supersetId=pairId;nextEx.supersetId=pairId;}
            else if(prevEx && !prevEx.supersetId){ex.supersetId=pairId;prevEx.supersetId=pairId;}
            else {ex.supersetId=pairId;}
          }
          triggerHaptic("medium");
          await persistActive(container);
          renderContent(container);
        }
        return;
      }
      if(button.hasAttribute("data-remove-exercise")){mutatePlanExercise(button,(item)=>{state.editingPlan.exercises=state.editingPlan.exercises.filter((x)=>x.id!==item.id)});renderContent(container);return;}
      if(button.dataset.move){mutatePlanExercise(button,(item)=>{const i=state.editingPlan.exercises.indexOf(item),j=button.dataset.move==="up"?i-1:i+1;if(j>=0&&j<state.editingPlan.exercises.length)[state.editingPlan.exercises[i],state.editingPlan.exercises[j]]=[state.editingPlan.exercises[j],state.editingPlan.exercises[i]];});renderContent(container);return;}
      if(button.hasAttribute("data-add-set")){mutatePlanExercise(button,(item)=>item.sets.push({id:createId("set-template"),setType:item.sets.at(-1)?.setType??"normal",targetReps:item.sets.at(-1)?.targetReps??8,targetWeight:item.sets.at(-1)?.targetWeight??0,targetRir:item.sets.at(-1)?.targetRir??null}));renderContent(container);return;}
      if(button.hasAttribute("data-remove-set")){mutatePlanExercise(button,(item)=>{if(item.sets.length>1)item.sets=item.sets.filter((s)=>s.id!==button.closest("[data-set]").dataset.set)});renderContent(container);return;}
      if(button.hasAttribute("data-new-custom")){container.querySelector("[data-training-status]").insertAdjacentHTML("afterend",customEditor());return;}
      if(button.dataset.editCustom){const x=state.custom.find((i)=>i.id===button.dataset.editCustom);container.querySelector("[data-training-status]").insertAdjacentHTML("afterend",customEditor(x));return;}
      if(button.hasAttribute("data-cancel-custom")){button.closest("[data-custom-form]").remove();return;}
      if(button.dataset.deleteCustom){if(confirm("Eigene Übung löschen? Bestehende Trainingseinheiten bleiben erhalten.")){await deleteCustomExercise(button.dataset.deleteCustom);await loadState();renderContent(container);}return;}
      if(button.dataset.openSession){state.activeSession=structuredClone(state.sessions.find((s)=>s.id===button.dataset.openSession));state.tab="session";renderContent(container);return;}
      if(button.dataset.deleteSession){if(confirm("Trainingseinheit dauerhaft löschen?")){await deleteWorkoutSession(button.dataset.deleteSession);await loadState();renderContent(container);}return;}
      if(button.hasAttribute("data-close-session")){await persistActive(container);state.activeSession=state.sessions.find((s)=>s.status===WORKOUT_STATUS.IN_PROGRESS)||null;state.tab="history";renderContent(container);return;}
      if(button.hasAttribute("data-add-session-set")){const ex=state.activeSession.exercises.find((x)=>x.id===button.closest("[data-session-exercise]").dataset.sessionExercise);const last=ex.sets.at(-1)||{};ex.sets.push({id:createId("session-set"),setType:last.setType??"normal",plannedReps:last.plannedReps??0,plannedWeight:last.plannedWeight??0,targetRir:last.targetRir??null,actualReps:last.actualReps??0,actualWeight:last.actualWeight??0,actualRir:last.actualRir??null,completed:false});await persistActive(container);renderContent(container);return;}
      if(button.hasAttribute("data-remove-session-set")){const ex=state.activeSession.exercises.find((x)=>x.id===button.closest("[data-session-exercise]").dataset.sessionExercise);if(ex.sets.length>1)ex.sets=ex.sets.filter((s)=>s.id!==button.closest("[data-session-set]").dataset.sessionSet);await persistActive(container);renderContent(container);return;}
      if(button.hasAttribute("data-open-plate-calc")){
        const weight = Number(button.dataset.openPlateCalc) || 20;
        const targetSetId = button.dataset.targetSetId || null;
        state.plateCalc = {
          isOpen: true,
          targetWeight: Math.max(20, weight),
          barWeight: 20,
          targetSetId
        };
        triggerHaptic("light");
        renderContent(container);
        return;
      }
      if(button.hasAttribute("data-close-plate-calc")){
        state.plateCalc = null;
        renderContent(container);
        return;
      }
      if(button.dataset.adjustPlateTarget){
        const delta = parseFloat(button.dataset.adjustPlateTarget) || 0;
        if(state.plateCalc){
          state.plateCalc.targetWeight = Math.max(state.plateCalc.barWeight, Number((state.plateCalc.targetWeight + delta).toFixed(2)));
          triggerHaptic("light");
          renderContent(container);
        }
        return;
      }
      if(button.hasAttribute("data-apply-plate-weight")){
        const newWeight = Number(button.dataset.applyPlateWeight) || 0;
        const setId = button.dataset.targetSetId;
        if(state.editingPlan){
          for(const ex of state.editingPlan.exercises){
            const s = (ex.sets || []).find((st) => st.id === setId);
            if(s){ s.targetWeight = newWeight; break; }
          }
        } else if(state.activeSession){
          for(const ex of state.activeSession.exercises){
            const s = (ex.sets || []).find((st) => st.id === setId);
            if(s){ s.actualWeight = newWeight; break; }
          }
          await persistActive(container);
        }
        state.plateCalc = null;
        triggerHaptic("medium");
        renderContent(container);
        return;
      }
      if(button.hasAttribute("data-generate-plan-warmup")){
        mutatePlanExercise(button,(item)=>{
          const firstWorkSet = item.sets.find((s)=>s.setType!=="warmup") || item.sets[0];
          const workWeight = Number(firstWorkSet?.targetWeight) || 60;
          const warmupSets = calculateWarmupSets(workWeight).map((ws)=>({
            id: createId("set-template"),
            setType: "warmup",
            targetReps: ws.plannedReps,
            targetWeight: ws.plannedWeight,
            targetRir: null
          }));
          const workSets = item.sets.filter((s)=>s.setType!=="warmup");
          item.sets = [...warmupSets, ...workSets];
          triggerHaptic("medium");
        });
        renderContent(container);
        return;
      }
      if(button.dataset.generateSessionWarmup){
        const ex = state.activeSession.exercises.find((x)=>x.id===button.dataset.generateSessionWarmup);
        if(ex){
          const firstWorkSet = ex.sets.find((s)=>s.setType!=="warmup") || ex.sets[0];
          const workWeight = Number(firstWorkSet?.actualWeight || firstWorkSet?.plannedWeight) || 60;
          const warmupSets = calculateWarmupSets(workWeight).map((ws)=>({
            id: createId("session-set"),
            setType: "warmup",
            plannedReps: ws.plannedReps,
            plannedWeight: ws.plannedWeight,
            targetRir: null,
            actualReps: ws.plannedReps,
            actualWeight: ws.plannedWeight,
            actualRir: null,
            completed: false
          }));
          const workSets = ex.sets.filter((s)=>s.setType!=="warmup");
          ex.sets = [...warmupSets, ...workSets];
          triggerHaptic("medium");
          await persistActive(container);
          renderContent(container);
        }
        return;
      }
      if(button.dataset.applyPlanOverload){
        const targetWeight = Number(button.dataset.suggestedWeight);
        const targetReps = Number(button.dataset.suggestedReps);
        mutatePlanExercise(button,(item)=>{
          (item.sets || []).filter((s)=>s.setType!=="warmup").forEach((s)=>{
            if(Number.isFinite(targetWeight)) s.targetWeight = targetWeight;
            if(Number.isFinite(targetReps) && targetReps > 0) s.targetReps = targetReps;
          });
          triggerHaptic("medium");
        });
        renderContent(container);
        statusMessage(container,"Progressions-Werte in den Plan übernommen.");
        return;
      }
      if(button.dataset.applySessionOverload){
        const targetWeight = Number(button.dataset.suggestedWeight);
        const targetReps = Number(button.dataset.suggestedReps);
        const ex = state.activeSession?.exercises.find((x)=>x.id===button.dataset.applySessionOverload);
        if(ex){
          (ex.sets || []).filter((s)=>s.setType!=="warmup").forEach((s)=>{
            if(Number.isFinite(targetWeight)) {
              s.plannedWeight = targetWeight;
              if(!s.completed) s.actualWeight = targetWeight;
            }
            if(Number.isFinite(targetReps) && targetReps > 0) {
              s.plannedReps = targetReps;
              if(!s.completed) s.actualReps = targetReps;
            }
          });
          triggerHaptic("medium");
          await persistActive(container);
          renderContent(container);
          statusMessage(container,"Progressions-Vorschlag übernommen.");
        }
        return;
      }
      if(button.hasAttribute("data-next-exercise")){button.closest("[data-session-exercise]").nextElementSibling?.scrollIntoView({behavior:"smooth",block:"start"});await persistActive(container);return;}
      if(button.dataset.autofillExercise){
        const ex=state.activeSession.exercises.find((x)=>x.id===button.dataset.autofillExercise);
        if(ex){
          const lastPerf=getLastPerformanceForExercise(state.sessions,ex.exerciseId||ex.exerciseNameSnapshot,state.activeSession.id);
          if(lastPerf&&lastPerf.sets.length){
            ex.sets.forEach((set,i)=>{
              const prev=lastPerf.sets[i]||lastPerf.sets.at(-1);
              if(prev){
                set.actualReps=prev.actualReps;
                set.actualWeight=prev.actualWeight;
                set.actualRir=prev.actualRir ?? null;
              }
            });
            triggerHaptic("medium");
            await persistActive(container);
            renderContent(container);
            statusMessage(container,"Werte aus der letzten Einheit übernommen.");
          }
        }
        return;
      }
      if(button.hasAttribute("data-rest-start")){
        ensureRestTimer(container);
        state.restTimer.start();
        renderContent(container);
        return;
      }
      if(button.hasAttribute("data-rest-pause")){
        state.restTimer?.pause();
        renderContent(container);
        return;
      }
      if(button.hasAttribute("data-rest-stop")){
        state.restTimer?.stop();
        renderContent(container);
        return;
      }
      if(button.dataset.restAdjust){
        const delta=Number(button.dataset.restAdjust)||30;
        ensureRestTimer(container);
        state.restTimer.addTime(delta);
        renderContent(container);
        return;
      }
      if(button.hasAttribute("data-complete-session")){const form=button.closest("form"),fd=new FormData(form);state.activeSession.notes=fd.get("notes")||"";const invalid=state.activeSession.workoutType===WORKOUT_TYPES.STRENGTH&&state.activeSession.exercises.some((x)=>x.sets.some((s)=>s.actualReps<0||s.actualReps>1000||s.actualWeight<0||s.actualWeight>1000));if(invalid)throw new Error("Wiederholungen und Gewicht müssen zwischen 0 und 1000 liegen.");const other=form.querySelector("[data-other-duration]");const completed=completeSession(state.activeSession);if(other)completed.durationSeconds=Number(other.value)*60;const prs=detectWorkoutPRs(completed,state.sessions);const comparison=compareWorkoutWithPrevious(completed,state.sessions);state.activeSession=completed;triggerDelight({ title: prs.length ? `${prs.length}× Neuer PR!` : "Training abgeschlossen!", subtitle: completed.planNameSnapshot || "Starke Leistung!", badge: prs.length ? "PR GEKNACKT" : "TRAINING DONE" });await persistActive(container);state.workoutSummary={session:completed,prs,comparison};renderContent(container);return;}
      if(button.hasAttribute("data-cancel-session")){if(confirm("Training abbrechen? Die Einheit bleibt als abgebrochen in der Historie.")){state.activeSession={...state.activeSession,status:WORKOUT_STATUS.CANCELLED,completedAt:new Date().toISOString()};await persistActive(container);state.tab="history";renderContent(container);}return;}
      if(button.hasAttribute("data-save-completed")){await persistActive(container);statusMessage(container,"Änderungen gespeichert.");return;}
      if(button.matches("[data-timer-start],[data-timer-pause],[data-timer-reset]")){const exEl=button.closest("[data-session-exercise]"),ex=state.activeSession.exercises.find((x)=>x.id===exEl.dataset.sessionExercise);let timer=state.timers.get(ex.id);if(!timer){timer=new StretchTimer(ex.durationSeconds,({remainingSeconds,status,endsAt})=>{ex.timerState={remainingSeconds,status,endsAt};exEl.querySelector("[data-timer-time]").textContent=remainingSeconds;exEl.querySelector("[data-timer-status]").textContent={ready:"Bereit",running:"Läuft",paused:"Pausiert",finished:"Zeit abgelaufen"}[status];});timer.remainingSeconds=ex.timerState?.endsAt?Math.max(0,Math.ceil((ex.timerState.endsAt-Date.now())/1000)):ex.timerState?.remainingSeconds??ex.durationSeconds;state.timers.set(ex.id,timer);}if(button.hasAttribute("data-timer-start")){timer.start();await persistActive(container);}if(button.hasAttribute("data-timer-pause")){timer.pause();await persistActive(container);}if(button.hasAttribute("data-timer-reset")){timer.reset();await persistActive(container);}return;}
    } catch(error){console.error(error);statusMessage(container,error.message||"Aktion fehlgeschlagen.","danger");}
  });

  container.addEventListener("keydown", (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    selectTrainingTab(container, getNextTrainingTab(tab.dataset.tab, event.key), true);
  });

  container.addEventListener("input", async (event)=>{
    const t=event.target;
    if(t.matches("[data-picker-query]")){state.picker.query=t.value;refreshExercisePicker(container);return;}
    if(state.editingPlan&&t.name==="name")state.editingPlan.name=t.value;
    if(state.editingPlan&&t.name==="description")state.editingPlan.description=t.value;
    if(state.editingPlan){mutatePlanExercise(t,(item)=>{const setEl=t.closest("[data-set]");const set=item.sets?.find?.((s)=>s.id===setEl?.dataset.set);if(t.hasAttribute("data-target-reps"))set.targetReps=Number(t.value);if(t.hasAttribute("data-target-weight"))set.targetWeight=Number(t.value);if(t.hasAttribute("data-target-rir"))set.targetRir=t.value===""?null:Number(t.value);if(t.hasAttribute("data-stretch-sets"))item.sets=Number(t.value);if(t.hasAttribute("data-stretch-duration"))item.durationSeconds=Number(t.value);if(t.hasAttribute("data-exercise-notes"))item.notes=t.value;});}
    if(state.activeSession&&t.closest("[data-session-exercise]")){const ex=state.activeSession.exercises.find((x)=>x.id===t.closest("[data-session-exercise]").dataset.sessionExercise),set=ex.sets.find((s)=>s.id===t.closest("[data-session-set]")?.dataset.sessionSet);if(t.hasAttribute("data-actual-reps"))set.actualReps=Number(t.value);if(t.hasAttribute("data-actual-weight"))set.actualWeight=Number(t.value);if(t.hasAttribute("data-actual-rir"))set.actualRir=t.value===""?null:Number(t.value);if(t.hasAttribute("data-session-exercise-notes"))ex.notes=t.value;await persistActive(container);}
    if(state.activeSession&&t.name==="notes"){state.activeSession.notes=t.value;await persistActive(container);}
  });
  container.addEventListener("change",async(event)=>{const t=event.target;
    if(t.hasAttribute("data-plate-bar-select")){
      if(state.plateCalc){
        state.plateCalc.barWeight=Number(t.value)||20;
        if(state.plateCalc.targetWeight<state.plateCalc.barWeight){
          state.plateCalc.targetWeight=state.plateCalc.barWeight;
        }
        renderContent(container);
      }
      return;
    }
    if(t.matches("[name='workoutType']")&&state.editingPlan&&!state.editingPlan.exercises.length){state.editingPlan.workoutType=t.value;renderContent(container);return;}
    if(t.hasAttribute("data-picker-category")){state.picker.category=t.value;renderContent(container);return;}if(t.hasAttribute("data-picker-equipment")){state.picker.equipment=t.value;renderContent(container);return;}if(t.hasAttribute("data-picker-movement")){state.picker.movementPattern=t.value;renderContent(container);return;}if(t.hasAttribute("data-picker-favorites")){state.picker.favorites=t.checked;renderContent(container);return;}if(t.hasAttribute("data-picker-custom")){state.picker.custom=t.checked;renderContent(container);return;}if(t.hasAttribute("data-picker-recent")){state.picker.recent=t.checked;renderContent(container);return;}
    if(t.hasAttribute("data-side-mode"))mutatePlanExercise(t,(item)=>item.sideMode=t.value);
    if(t.hasAttribute("data-history-filter")){state.historyType=t.value;renderContent(container);return;}
    if(t.hasAttribute("data-set-completed")){
      const ex=state.activeSession.exercises.find((x)=>x.id===t.closest("[data-session-exercise]").dataset.sessionExercise);
      const set=ex.sets.find((s)=>s.id===t.closest("[data-session-set]").dataset.sessionSet);
      set.completed=t.checked;
      triggerHaptic("light");
      if(t.checked && state.activeSession.workoutType===WORKOUT_TYPES.STRENGTH){
        ensureRestTimer(container);
        state.restTimer.start(90);
      }
      await persistActive(container);
      renderContent(container);
    }
  });
  container.addEventListener("submit",async(event)=>{event.preventDefault();const form=event.target;
    try{if(form.hasAttribute("data-plan-form")){const fd=new FormData(form);state.editingPlan.name=fd.get("name").trim();state.editingPlan.description=fd.get("description").trim();if(state.editingPlan.workoutType===WORKOUT_TYPES.OTHER)state.editingPlan.durationSeconds=Number(fd.get("otherDuration"))*60;state.editingPlan.exercises.forEach((x,i)=>x.order=i+1);const validIds=new Set([...getBuiltInExercises(state.editingPlan.workoutType),...state.custom].map((x)=>x.id));const errors=validateWorkoutPlan(state.editingPlan,validIds);if(errors.length)throw new Error(errors.join(" "));await saveWorkoutPlan(state.editingPlan);state.editingPlan=null;await loadState();renderContent(container);statusMessage(container,"Trainingsplan gespeichert.");}
    if(form.hasAttribute("data-custom-form")){const fd=new FormData(form),type=fd.get("workoutType"),list=(name)=>String(fd.get(name)||"").split(",").map((x)=>x.trim()).filter(Boolean);const data={id:form.dataset.id||null,workoutType:type,name:fd.get("name").trim(),englishName:"",category:fd.get("category"),equipment:type==="strength"?[fd.get("equipment")]:[],stretchType:type==="stretching"?fd.get("stretchType"):null,targetAreas:type==="stretching"?[fd.get("category")]:[],primaryMuscles:list("primaryMuscles"),secondaryMuscles:list("secondaryMuscles"),movementPattern:"other",laterality:"bilateral",defaultTrackingType:type==="strength"?"reps-weight":null,defaultDurationSeconds:Number(fd.get("defaultDurationSeconds")),defaultSets:Number(fd.get("defaultSets")),notes:fd.get("notes"),instructions:null,difficulty:null,videoUrl:null,imageUrl:null};const errors=validateCustomExercise(data);if(errors.length)throw new Error(errors.join(" "));await saveCustomExercise(data);await loadState();renderContent(container);statusMessage(container,"Eigene Übung gespeichert.");}
    if(form.hasAttribute("data-session-form")){const fd=new FormData(form);state.activeSession.date=fd.get("date");state.activeSession.notes=fd.get("notes");const other=form.querySelector("[data-other-duration]");if(other)state.activeSession.durationSeconds=Number(other.value)*60;await persistActive(container);}}
    catch(error){console.error(error);statusMessage(container,error.message||"Speichern fehlgeschlagen.","danger");}}
  );
}

export function renderTrainingDashboard() {
  const container=document.createElement("section");container.className="view-stack";container.innerHTML=`<section class="card skeleton" aria-label="Training wird geladen"></section>`;
  loadState().then(async()=>{bindEvents(container);const requestedPlanId=getRequestedPlanId();if(requestedPlanId){window.history.replaceState(null,"","#/training");try{await startPlan(container,requestedPlanId);}catch(error){renderContent(container);statusMessage(container,error.message||"Training konnte nicht gestartet werden.","danger");}}else{renderContent(container);}}).catch((error)=>{console.error(error);container.innerHTML=`<section class="card empty-state"><h2>Training konnte nicht geladen werden</h2><p>Die lokale Datenbank ist nicht verfügbar.</p></section>`;});
  return container;
}
