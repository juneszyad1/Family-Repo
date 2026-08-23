import { getActiveGoals, getBodyFatEntries, getCircumferenceEntries, getDailyEntries, getSettings, getWorkoutSessions } from "../database.js";
import { calculateAdaptiveTdee, calculateMovingAverage, calculateRolling7DayAverages, calculateTrendSummary, filterEntriesByRange } from "../calculations.js";
import { getTrackedStrengthExercises, extractExerciseProgression } from "../training/workout-calculations.js";
import { GOAL_TYPES, calculateExpectedValueToday, getGoalPoints } from "../goals.js";
import { escapeHtml, formatDate, formatNumber, formatShortDate, sortByDateDesc, todayIsoDate } from "../utils.js";

const RANGE_OPTIONS = [
  { value: "7d", label: "7 Tage" },
  { value: "30d", label: "30 Tage" },
  { value: "90d", label: "90 Tage" },
  { value: "6m", label: "6 Monate" },
  { value: "1y", label: "1 Jahr" },
  { value: "all", label: "Gesamt" }
];

const chartInstances = [];
let fullscreenChartInstance = null;
const COMBINED_SERIES = [
  { key: "weight", label: "Gewicht", valueKey: "weight", unit: "kg", axis: "weight", defaultVisible: true },
  { key: "calories", label: "Kalorien", valueKey: "calories", unit: "kcal", axis: "calories", defaultVisible: false },
  { key: "protein", label: "Protein", valueKey: "protein", unit: "g", axis: "protein", defaultVisible: false },
  { key: "sleep", label: "Schlafdauer", valueKey: "sleepHours", unit: "h", axis: "sleep", defaultVisible: false }
];
const selectedCombinedSeries = new Set(COMBINED_SERIES.filter((series) => series.defaultVisible).map((series) => series.key));

const ROLLING_SERIES = [
  { key: "weight", label: "Ø Gewicht", valueKey: "weight", unit: "kg", axis: "weight", defaultVisible: true },
  { key: "calories", label: "Ø Kalorien", valueKey: "calories", unit: "kcal", axis: "calories", defaultVisible: true },
  { key: "protein", label: "Ø Protein", valueKey: "protein", unit: "g", axis: "protein", defaultVisible: false },
  { key: "sleep", label: "Ø Schlafdauer", valueKey: "sleepHours", unit: "h", axis: "sleep", defaultVisible: false }
];
const selectedRollingSeries = new Set(ROLLING_SERIES.filter((series) => series.defaultVisible).map((series) => series.key));

export function getRangeLabel(range) {
  return RANGE_OPTIONS.find((option) => option.value === range)?.label || "30 Tage";
}

function destroyCharts() {
  while (chartInstances.length) {
    try {
      chartInstances.pop().destroy();
    } catch (error) {
      console.warn("Ein altes Diagramm konnte nicht sauber entfernt werden.", error);
    }
  }
}

function destroyFullscreenChart() {
  if (fullscreenChartInstance) {
    try {
      fullscreenChartInstance.destroy();
    } catch (error) {
      console.warn("Vollbild-Diagramm konnte nicht entfernt werden.", error);
    }
    fullscreenChartInstance = null;
  }
}

function getCssColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function chartOptions(title, isFullscreen = false) {
  const textColor = getCssColor("--text-secondary");
  const borderColor = getCssColor("--border");

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: textColor,
          boxWidth: 12
        }
      },
      title: {
        display: false,
        text: title
      }
    },
    scales: {
      x: {
        type: "category",
        ticks: {
          color: textColor,
          maxRotation: 0,
          autoSkip: true,
          autoSkipPadding: 16,
          maxTicksLimit: isFullscreen ? 14 : 6,
          callback: function(value) {
            const label = this.getLabelForValue(value);
            if (typeof label === "string" && label.length === 10 && label[2] === "." && label[5] === ".") {
              return label.slice(0, 6);
            }
            return label;
          }
        },
        grid: { color: borderColor }
      },
      y: {
        ticks: { color: textColor },
        grid: { color: borderColor }
      }
    }
  };
}

function combinedChartOptions(range, isFullscreen = false) {
  const options = chartOptions(`Übersicht · ${getRangeLabel(range)}`, isFullscreen);
  const textColor = getCssColor("--text-secondary");
  const borderColor = getCssColor("--border");

  return {
    ...options,
    interaction: {
      mode: "index",
      intersect: false
    },
    scales: {
      x: options.scales.x,
      weight: {
        type: "linear",
        position: "left",
        ticks: { color: textColor },
        grid: { color: borderColor }
      },
      calories: {
        type: "linear",
        position: "right",
        ticks: { color: textColor },
        grid: { drawOnChartArea: false }
      },
      protein: {
        type: "linear",
        position: "right",
        display: false
      },
      sleep: {
        type: "linear",
        position: "left",
        display: false
      }
    }
  };
}

function lineDataset(label, data, color, dashed = false) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    borderDash: dashed ? [6, 6] : [],
    tension: 0.28,
    pointRadius: 3,
    pointHoverRadius: 5,
    spanGaps: true
  };
}

function pointDataset(label, data, color, shape = "circle") {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    showLine: false,
    pointRadius: 5,
    pointHoverRadius: 7,
    pointStyle: shape
  };
}

function goalPathDataset(label, goal, color) {
  const points = getGoalPoints(goal);
  return {
    label,
    data: points.map((p) => ({ x: formatDate(p.date), y: p.value })),
    borderColor: color,
    backgroundColor: color,
    borderDash: [2, 6],
    tension: 0,
    pointRadius: 0,
    pointHoverRadius: 4
  };
}

function goalMarkerDatasets(goal, today, color, textColor) {
  const expectedValueToday = calculateExpectedValueToday(goal, today);
  const datasets = [
    pointDataset("Zielpunkt", [{ x: formatDate(goal.targetDate), y: goal.targetValue }], color, "triangle")
  ];

  if (goal.milestones && Array.isArray(goal.milestones) && goal.milestones.length > 0) {
    const milestonePoints = goal.milestones
      .filter((m) => m && m.date && m.targetValue !== null && m.targetValue !== undefined)
      .map((m) => ({ x: formatDate(m.date), y: m.targetValue }));
    if (milestonePoints.length > 0) {
      datasets.push(pointDataset("Zwischenziele", milestonePoints, color, "circle"));
    }
  }

  if (expectedValueToday !== null) {
    datasets.push(pointDataset("Sollwert heute", [{ x: formatDate(today), y: expectedValueToday }], textColor, "rectRot"));
  }

  return datasets;
}

function createChart(canvas, config) {
  if (!window.Chart || !canvas) {
    return null;
  }

  const existingChart = window.Chart.getChart?.(canvas);
  existingChart?.destroy();
  const chart = new window.Chart(canvas, config);
  chartInstances.push(chart);
  return chart;
}

function entriesForValue(entries, valueKey) {
  return [...entries]
    .filter((entry) => entry[valueKey] !== null && entry[valueKey] !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function formatSignedNumber(value, unit = "") {
  if (value === null || value === undefined) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ""}`;
}

function renderTdeeCard(tdeeData) {
  if (!tdeeData) return "";

  if (!tdeeData.hasSufficientData) {
    const remaining = Math.max(1, tdeeData.requiredDays - tdeeData.trackedDaysWithCalories);
    return `
      <section class="card tdee-overview-card" aria-label="TDEE Energiebilanz">
        <div class="card-body">
          <div class="trend-hero-header">
            <div>
              <p class="metric-label">TDEE (14 Tage)</p>
              <p class="hero-value">--<span>kcal</span></p>
            </div>
            <span class="status-pill">${tdeeData.trackedDaysWithCalories}/${tdeeData.requiredDays} Tage</span>
          </div>
          <p class="muted" style="margin: 8px 0 0; font-size: 0.8rem;">Noch ${remaining} Tag${remaining > 1 ? "e" : ""} mit Gewicht & Kalorien nötig.</p>
        </div>
      </section>
    `;
  }

  const deficitText = tdeeData.dailyDeficit >= 0
    ? `-${tdeeData.dailyDeficit} kcal Defizit`
    : `+${Math.abs(tdeeData.dailyDeficit)} kcal Überschuss`;
  const weightChangeStr = formatSignedNumber(tdeeData.totalWeightDelta, "kg");
  const weeklyRateStr = formatSignedNumber(tdeeData.weeklyWeightChangeRate, "kg/Wo.");

  return `
    <section class="card tdee-overview-card" aria-label="TDEE Energiebilanz">
      <div class="card-body">
        <div class="trend-hero-header">
          <div>
            <p class="metric-label">TDEE · 14 Tage</p>
            <p class="hero-value">${formatNumber(tdeeData.tdee, { maximumFractionDigits: 0 })}<span>kcal</span></p>
          </div>
          <span class="status-pill ${tdeeData.dailyDeficit >= 0 ? "positive" : ""}">${deficitText}</span>
        </div>
        <div class="stat-strip">
          <div class="stat-cell">
            <p class="stat-label">Ø Intake</p>
            <p class="stat-value">${formatNumber(tdeeData.averageCalories, { maximumFractionDigits: 0 })} <span class="stat-unit">kcal</span></p>
          </div>
          <div class="stat-cell">
            <p class="stat-label">Δ Gewicht</p>
            <p class="stat-value">${weightChangeStr}</p>
          </div>
          <div class="stat-cell">
            <p class="stat-label">Wochendelta</p>
            <p class="stat-value">${weeklyRateStr}</p>
          </div>
          <div class="stat-cell">
            <p class="stat-label">Basis</p>
            <p class="stat-value">${tdeeData.trackedDaysWithCalories} <span class="stat-unit">Tage</span></p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderExerciseProgressionSection(workoutSessions = [], selectedExerciseId = null) {
  const trackedExercises = getTrackedStrengthExercises(workoutSessions);

  if (!trackedExercises.length) {
    return `
      <section class="card exercise-progression-card">
        <div class="card-body">
          <div class="chart-header">
            <div>
              <p class="metric-label">Kraftanalyse</p>
              <h2 class="section-title">Kraftprogression</h2>
            </div>
          </div>
          <p class="muted" style="font-size: 0.82rem; margin: 4px 0 0;">Sobald Krafttrainingseinheiten erfasst sind, erscheint hier dein 1RM-Verlauf.</p>
        </div>
      </section>
    `;
  }

  const activeExerciseId = selectedExerciseId || trackedExercises[0]?.id;
  const progression = extractExerciseProgression(workoutSessions, activeExerciseId, allDailyEntriesCache);

  let heroLabel = "1RM All-Time PR";
  let heroValue = `${formatNumber(progression?.allTime1RM, { maximumFractionDigits: 1 })}<span>kg</span>`;
  let heroPill = `${(progression?.progress1RMPercent || 0) >= 0 ? `+${progression?.progress1RMPercent}%` : `${progression?.progress1RMPercent}%`}`;

  if (progression?.isBodyweight) {
    heroLabel = `1RM PR (${Math.round(progression.bodyweightRatio * 100)}% BW + Last)`;
  }

  if (selectedProgressionMetric === "reps") {
    heroLabel = "Top-Set Rekord";
    heroValue = `${formatNumber(progression?.allTimeMaxReps, { maximumFractionDigits: 0 })}<span>Wdh.</span>`;
    heroPill = `${(progression?.progressRepsPercent || 0) >= 0 ? `+${progression?.progressRepsPercent}%` : `${progression?.progressRepsPercent}%`}`;
  } else if (selectedProgressionMetric === "volume") {
    heroLabel = "Lifetime-Volumen";
    heroValue = `${formatNumber(progression?.totalLifetimeVolume, { maximumFractionDigits: 0 })}<span>kg</span>`;
    heroPill = `${progression?.totalSessionsTracked || 0} Logs`;
  } else if (selectedProgressionMetric === "weight") {
    heroLabel = "Top-Last";
    heroValue = `${formatNumber(progression?.allTimeMaxWeight, { maximumFractionDigits: 1 })}<span>kg</span>`;
    heroPill = `${(progression?.progressWeightPercent || 0) >= 0 ? `+${progression?.progressWeightPercent}%` : `${progression?.progressWeightPercent}%`}`;
  }

  return `
    <section class="card exercise-progression-card" data-exercise-progression-card>
      <div class="card-body">
        <div class="chart-header">
          <div>
            <p class="metric-label">Kraftanalyse</p>
            <h2 class="section-title">Kraftprogression</h2>
          </div>
        </div>

        <label class="field exercise-select-field">
          <span>Übung auswählen</span>
          <select data-exercise-progression-select>
            ${trackedExercises.map((ex) => `
              <option value="${escapeHtml(ex.id)}" ${ex.id === activeExerciseId ? "selected" : ""}>
                ${escapeHtml(ex.name)} · 1RM: ${formatNumber(ex.allTime1RM, { maximumFractionDigits: 1 })} kg (${ex.count}×)
              </option>
            `).join("")}
          </select>
        </label>

        ${progression ? `
          <div class="exercise-progression-details" data-exercise-details>
            <div class="trend-hero-header">
              <div>
                <p class="metric-label">${heroLabel}</p>
                <p class="hero-value">${heroValue}</p>
              </div>
              <span class="status-pill ${((selectedProgressionMetric === 'reps' ? progression.progressRepsPercent : progression.progress1RMPercent) || 0) >= 0 ? "positive" : ""}">
                ${heroPill}
              </span>
            </div>

            <div class="range-selector progression-metric-selector" role="group" aria-label="Metrik auswählen">
              <button type="button" class="range-button ${selectedProgressionMetric === '1rm' ? 'active' : ''}" data-progression-metric="1rm">1RM</button>
              <button type="button" class="range-button ${selectedProgressionMetric === 'reps' ? 'active' : ''}" data-progression-metric="reps">Reps</button>
              <button type="button" class="range-button ${selectedProgressionMetric === 'volume' ? 'active' : ''}" data-progression-metric="volume">Volumen</button>
              <button type="button" class="range-button ${selectedProgressionMetric === 'weight' ? 'active' : ''}" data-progression-metric="weight">Last</button>
            </div>

            <div class="chart-frame tall-chart-frame progression-chart-frame">
              <canvas id="exercise-progression-chart" aria-label="Kraftprogression für ${escapeHtml(progression.exerciseName)}" role="img"></canvas>
            </div>

            <div class="stat-strip">
              <div class="stat-cell">
                <p class="stat-label">Max. Reps</p>
                <p class="stat-value">${formatNumber(progression.allTimeMaxReps, { maximumFractionDigits: 0 })} <span class="stat-unit">Wdh.</span></p>
              </div>
              <div class="stat-cell">
                <p class="stat-label">Max. Last</p>
                <p class="stat-value">${formatNumber(progression.allTimeMaxWeight, { maximumFractionDigits: 1 })} <span class="stat-unit">kg</span></p>
              </div>
              <div class="stat-cell">
                <p class="stat-label">Bestes 1RM</p>
                <p class="stat-value">${formatNumber(progression.allTime1RM, { maximumFractionDigits: 1 })} <span class="stat-unit">kg</span></p>
              </div>
              <div class="stat-cell">
                <p class="stat-label">Einheiten</p>
                <p class="stat-value">${progression.totalSessionsTracked}</p>
              </div>
            </div>

            <h3 class="subsection-title">Letzte Trainings-Top-Sets</h3>
            <ul class="stat-list">
              ${progression.dataPoints.slice(-5).reverse().map((point) => `
                <li>
                  <span>${formatDate(point.date)} · ${escapeHtml(point.planName)}</span>
                  <strong>${formatNumber(point.topWeight, { maximumFractionDigits: 1 })} kg × ${point.topReps} <small class="muted">(${formatNumber(point.estimated1RM, { maximumFractionDigits: 1 })} kg 1RM)</small></strong>
                </li>
              `).join("")}
            </ul>
          </div>
        ` : ""}
      </div>
    </section>
  `;
}

function renderSummary(summary) {
  const weightChangeStr = formatSignedNumber(summary.weightChange, "kg");

  return `
    <section class="card trend-overview-card" aria-label="Zusammenfassung des Zeitraums">
      <div class="card-body">
        <div class="trend-hero-header">
          <div>
            <p class="metric-label">Gewichtsverlauf</p>
            <p class="hero-value">${weightChangeStr}</p>
          </div>
          <span class="status-pill">${formatNumber(summary.trackedDays, { maximumFractionDigits: 0 })} Tage</span>
        </div>
        <div class="stat-strip">
          <div class="stat-cell">
            <p class="stat-label">Ø Kalorien</p>
            <p class="stat-value">${formatNumber(summary.averageCalories, { maximumFractionDigits: 0 })} <span class="stat-unit">kcal</span></p>
          </div>
          <div class="stat-cell">
            <p class="stat-label">Ø Protein</p>
            <p class="stat-value">${formatNumber(summary.averageProtein, { maximumFractionDigits: 0 })} <span class="stat-unit">g</span></p>
          </div>
          <div class="stat-cell">
            <p class="stat-label">Ø Schlaf</p>
            <p class="stat-value">${formatNumber(summary.averageSleep, { maximumFractionDigits: 1 })} <span class="stat-unit">h</span></p>
          </div>
          <div class="stat-cell">
            <p class="stat-label">KFA-Delta</p>
            <p class="stat-value">${formatSignedNumber(summary.bodyFatChange)} <span class="stat-unit">%</span></p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderCombinedChartShell(range, dailyEntries) {
  return `
    <section class="card">
      <div class="card-body">
        <div class="chart-header">
          <div>
            <p class="metric-label">Tagesdaten</p>
            <h2 class="section-title">Multi-Achsen Trend</h2>
          </div>
          <button type="button" class="chart-fullscreen-trigger" data-open-fullscreen="combined" aria-label="Tageswert-Diagramm im Vollbild anzeigen">
            ⛶
          </button>
        </div>
        <fieldset class="choice-group compact-choice-group">
          <legend>Kurven</legend>
          ${COMBINED_SERIES.map((series) => `
            <label>
              <input type="checkbox" value="${series.key}" data-combined-toggle ${selectedCombinedSeries.has(series.key) ? "checked" : ""}>
              ${series.label}
            </label>
          `).join("")}
        </fieldset>
        <div class="chart-frame tall-chart-frame">
          <canvas id="combined-chart" aria-label="Kombinierter Trend für ${getRangeLabel(range)}" role="img"></canvas>
        </div>
        ${renderDataAlternative(dailyEntries)}
      </div>
    </section>
  `;
}

let activeFullscreenMode = "combined";

function renderFullscreenChart(container, chartData, mode = activeFullscreenMode) {
  destroyFullscreenChart();
  const canvas = container.querySelector("#fullscreen-chart");
  if (!window.Chart || !canvas || !chartData) return;

  const { dailyEntries, allDailyEntries, range } = chartData;
  const sortedDailyEntries = sortByDateDesc(dailyEntries).sort((a, b) => a.date.localeCompare(b.date));
  const chartDates = Array.from(new Set(sortedDailyEntries.map((d) => d.date))).sort();
  const chartLabels = chartDates.map(formatDate);

  const chartWeight = getCssColor("--chart-weight") || getCssColor("--primary");
  const chartCalories = getCssColor("--chart-calories") || getCssColor("--warning");
  const chartProtein = getCssColor("--chart-protein") || getCssColor("--success");
  const chartSleep = getCssColor("--chart-sleep") || "#818cf8";

  const colors = {
    weight: chartWeight,
    calories: chartCalories,
    protein: chartProtein,
    sleep: chartSleep
  };

  let datasets = [];
  if (mode === "rolling") {
    datasets = ROLLING_SERIES
      .filter((series) => selectedRollingSeries.has(series.key))
      .map((series) => {
        const fullRolling = calculateRolling7DayAverages(allDailyEntries || dailyEntries, series.valueKey, chartDates);
        const rollingMap = new Map(fullRolling.map((item) => [item.date, item.value]));
        const data = chartDates.map((date) => rollingMap.get(date) ?? null);
        return lineDataset(
          `${series.label} (${series.unit})`,
          data,
          colors[series.key]
        );
      })
      .map((dataset, index) => ({
        ...dataset,
        yAxisID: ROLLING_SERIES.filter((series) => selectedRollingSeries.has(series.key))[index].axis
      }));
  } else {
    datasets = COMBINED_SERIES
      .filter((series) => selectedCombinedSeries.has(series.key))
      .map((series) => {
        const valueMap = new Map();
        sortedDailyEntries.forEach((entry) => {
          if (entry[series.valueKey] !== null && entry[series.valueKey] !== undefined) {
            valueMap.set(entry.date, entry[series.valueKey]);
          }
        });
        const data = chartDates.map((date) => valueMap.get(date) ?? null);
        return lineDataset(
          `${series.label} (${series.unit})`,
          data,
          colors[series.key]
        );
      })
      .map((dataset, index) => ({
        ...dataset,
        yAxisID: COMBINED_SERIES.filter((series) => selectedCombinedSeries.has(series.key))[index].axis
      }));
  }

  fullscreenChartInstance = new window.Chart(canvas, {
    type: "line",
    data: {
      labels: chartLabels,
      datasets
    },
    options: combinedChartOptions(range, true)
  });
}

function renderDataAlternative(entries) {
  const rows = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
  if (!rows.length) return "";
  return `<details class="data-alternative"><summary>Daten als Tabelle anzeigen</summary><div class="trend-table-wrap"><table class="trend-table"><caption class="muted">Die letzten ${rows.length} Tageswerte im gewählten Zeitraum</caption><thead><tr><th>Datum</th><th>Gewicht</th><th>Kalorien</th><th>Protein</th><th>Schlaf</th></tr></thead><tbody>${rows.map((entry) => `<tr><td>${formatDate(entry.date)}</td><td>${formatNumber(entry.weight, { maximumFractionDigits: 1 })} kg</td><td>${formatNumber(entry.calories, { maximumFractionDigits: 0 })} kcal</td><td>${formatNumber(entry.protein, { maximumFractionDigits: 0 })} g</td><td>${formatNumber(entry.sleepHours, { maximumFractionDigits: 1 })} h</td></tr>`).join("")}</tbody></table></div></details>`;
}

function renderChartShell(title, id, summary) {
  return `
    <section class="card">
      <div class="card-body">
        <h2 class="section-title">${title}</h2>
        <div class="chart-frame">
          <canvas id="${id}" aria-label="${title} im ausgewählten Zeitraum" role="img"></canvas>
        </div>
        <p class="chart-summary">${summary}</p>
      </div>
    </section>
  `;
}

function renderEmptyMessage() {
  return `
    <section class="card empty-state">
      <h2>Nicht genug Daten</h2>
      <p>Speichere Tagesdaten und KFA-Messungen, damit hier Trends entstehen.</p>
    </section>
  `;
}

function renderExerciseProgressionChart(container, progression, activeMetric = selectedProgressionMetric) {
  const canvas = container.querySelector("#exercise-progression-chart");
  if (!window.Chart || !canvas || !progression || !progression.dataPoints.length) return;

  const primary = getCssColor("--primary");
  const textSecondary = getCssColor("--text-secondary");
  const chartProtein = getCssColor("--chart-protein") || getCssColor("--success");
  const chartCalories = getCssColor("--chart-calories") || getCssColor("--warning");

  let datasets = [];
  let yAxisTitle = "kg";

  if (activeMetric === "reps") {
    yAxisTitle = "Wiederholungen";
    datasets = [
      lineDataset("Top-Set Wiederholungen", progression.dataPoints.map((d) => ({ x: formatDate(d.date), y: d.topReps })), chartProtein)
    ];
  } else if (activeMetric === "volume") {
    yAxisTitle = "Volumen (kg)";
    datasets = [
      lineDataset("Trainingsvolumen (kg)", progression.dataPoints.map((d) => ({ x: formatDate(d.date), y: d.totalVolume })), chartCalories)
    ];
  } else if (activeMetric === "weight") {
    yAxisTitle = "Gewicht (kg)";
    datasets = [
      lineDataset("Zusatz-/Hantellast (kg)", progression.dataPoints.map((d) => ({ x: formatDate(d.date), y: d.topWeight })), primary)
    ];
  } else {
    // default 1RM
    yAxisTitle = "1RM (kg)";
    const e1rmLabel = progression.isBodyweight
      ? `Geschätztes 1RM (inkl. ${Math.round(progression.bodyweightRatio * 100)}% BW)`
      : "Geschätztes 1RM (kg)";
    datasets = [
      lineDataset(e1rmLabel, progression.dataPoints.map((d) => ({ x: formatDate(d.date), y: d.estimated1RM })), primary),
      lineDataset("Zusatz-/Hantellast (kg)", progression.dataPoints.map((d) => ({ x: formatDate(d.date), y: d.topWeight })), textSecondary, true)
    ];
  }

  const options = chartOptions(`${progression.exerciseName} · ${yAxisTitle}`);
  createChart(canvas, {
    type: "line",
    data: { datasets },
    options: {
      ...options,
      plugins: {
        ...options.plugins,
        tooltip: {
          callbacks: {
            afterBody: (context) => {
              const idx = context[0]?.dataIndex;
              if (idx === undefined) return "";
              const point = progression.dataPoints[idx];
              if (!point) return "";
              const bwInfo = progression.isBodyweight ? ` (BW: ${point.sessionBodyweight} kg)` : "";
              return `Top-Set: ${point.topWeight} kg × ${point.topReps}\n1RM: ${formatNumber(point.estimated1RM, { maximumFractionDigits: 1 })} kg${bwInfo}\nVolumen: ${formatNumber(point.totalVolume, { maximumFractionDigits: 0 })} kg\nPlan: ${point.planName}`;
            }
          }
        }
      }
    }
  });
}

function renderRollingChartShell(range, dailyEntries) {
  return `
    <section class="card" aria-label="Gleitender 7-Tage-Durchschnitt">
      <div class="card-body">
        <div class="chart-header">
          <div>
            <p class="metric-label">Glättung</p>
            <h2 class="section-title">7-Tage-Durchschnitt</h2>
          </div>
          <button type="button" class="chart-fullscreen-trigger" data-open-fullscreen="rolling" aria-label="Gleitenden 7-Tage-Durchschnitt im Vollbild anzeigen">
            ⛶
          </button>
        </div>
        <fieldset class="choice-group compact-choice-group">
          <legend>7-Tage-Kurven</legend>
          ${ROLLING_SERIES.map((series) => `
            <label>
              <input type="checkbox" value="${series.key}" data-rolling-toggle ${selectedRollingSeries.has(series.key) ? "checked" : ""}>
              ${series.label}
            </label>
          `).join("")}
        </fieldset>
        <div class="chart-frame tall-chart-frame">
          <canvas id="rolling-chart" aria-label="Gleitender 7-Tage-Durchschnitt für ${getRangeLabel(range)}" role="img"></canvas>
        </div>
      </div>
    </section>
  `;
}

function renderTrendContent({ dailyEntries, bodyFatEntries, circumferenceEntries, settings, range, activeGoals, workoutSessions, tdeeData, selectedExerciseId }) {
  const filteredDaily = filterEntriesByRange(dailyEntries, range);
  const filteredBodyFat = filterEntriesByRange(bodyFatEntries, range);
  const filteredCircumference = filterEntriesByRange(circumferenceEntries, range);
  const summary = calculateTrendSummary(filteredDaily, filteredBodyFat, filteredCircumference);
  const hasAnyData = filteredDaily.length || filteredBodyFat.length || filteredCircumference.length || (workoutSessions && workoutSessions.length);
  const hasGoals = activeGoals.length > 0;
  const countValues = (entries, key) => entries.filter((entry) => entry[key] !== null && entry[key] !== undefined).length;
  const hasCombinedData = COMBINED_SERIES.some((series) => countValues(filteredDaily, series.valueKey) > 0);

  if (!hasAnyData && !hasGoals) {
    return renderEmptyMessage();
  }

  return `
    ${renderSummary(summary)}
    ${renderTdeeCard(tdeeData)}
    ${renderExerciseProgressionSection(workoutSessions, selectedExerciseId)}
    ${hasCombinedData ? renderRollingChartShell(range, filteredDaily) : ""}
    ${hasCombinedData ? renderCombinedChartShell(range, filteredDaily) : ""}
  `;
}

function renderCharts(container, { dailyEntries, allDailyEntries, bodyFatEntries, circumferenceEntries, settings, activeGoals, range, workoutSessions }) {
  destroyCharts();

  const warning = container.querySelector("[data-chart-warning]");

  if (!window.Chart) {
    warning.innerHTML = `
      <section class="card empty-state">
        <h2>Diagramme nicht verfügbar</h2>
        <p>Chart.js konnte nicht geladen werden. Die Zusammenfassung bleibt nutzbar.</p>
      </section>
    `;
    return;
  }

  warning.innerHTML = "";

  if (workoutSessions && selectedProgressionExerciseId) {
    const progression = extractExerciseProgression(workoutSessions, selectedProgressionExerciseId, allDailyEntries || allDailyEntriesCache);
    if (progression) {
      renderExerciseProgressionChart(container, progression, selectedProgressionMetric);
    }
  }

  const sortedDailyEntries = sortByDateDesc(dailyEntries).sort((a, b) => a.date.localeCompare(b.date));
  const sortedBodyFatEntries = sortByDateDesc(bodyFatEntries).sort((a, b) => a.date.localeCompare(b.date));
  const sortedCircumferenceEntries = sortByDateDesc(circumferenceEntries).sort((a, b) => a.date.localeCompare(b.date));
  const calorieTarget = settings.calorieTarget;
  const proteinTarget = settings.proteinTarget;
  const primary = getCssColor("--primary");
  const success = getCssColor("--success");
  const warningColor = getCssColor("--warning");
  const danger = getCssColor("--danger");
  const textSecondary = getCssColor("--text-secondary");
  const chartWeight = getCssColor("--chart-weight") || primary;
  const chartCalories = getCssColor("--chart-calories") || warningColor;
  const chartProtein = getCssColor("--chart-protein") || success;
  const chartSleep = getCssColor("--chart-sleep") || "#818cf8";
  const chartBodyFat = getCssColor("--chart-body-fat") || danger;
  const today = todayIsoDate();
  const weightGoal = activeGoals.find((goal) => goal.type === GOAL_TYPES.WEIGHT);
  const bodyFatGoal = activeGoals.find((goal) => goal.type === GOAL_TYPES.BODY_FAT);

  const combinedColors = {
    weight: chartWeight,
    calories: chartCalories,
    protein: chartProtein,
    sleep: chartSleep
  };

  const chartDates = Array.from(new Set(sortedDailyEntries.map((d) => d.date))).sort();
  const chartLabels = chartDates.map(formatDate);

  const rollingDatasets = ROLLING_SERIES
    .filter((series) => selectedRollingSeries.has(series.key))
    .map((series) => {
      const fullRolling = calculateRolling7DayAverages(allDailyEntries || dailyEntries, series.valueKey, chartDates);
      const rollingMap = new Map(fullRolling.map((item) => [item.date, item.value]));
      const data = chartDates.map((date) => rollingMap.get(date) ?? null);
      return lineDataset(
        `${series.label} (${series.unit})`,
        data,
        combinedColors[series.key]
      );
    })
    .map((dataset, index) => ({
      ...dataset,
      yAxisID: ROLLING_SERIES.filter((series) => selectedRollingSeries.has(series.key))[index].axis
    }));

  createChart(container.querySelector("#rolling-chart"), {
    type: "line",
    data: {
      labels: chartLabels,
      datasets: rollingDatasets
    },
    options: combinedChartOptions(range)
  });

  const combinedDatasets = COMBINED_SERIES
    .filter((series) => selectedCombinedSeries.has(series.key))
    .map((series) => {
      const valueMap = new Map();
      sortedDailyEntries.forEach((entry) => {
        if (entry[series.valueKey] !== null && entry[series.valueKey] !== undefined) {
          valueMap.set(entry.date, entry[series.valueKey]);
        }
      });
      const data = chartDates.map((date) => valueMap.get(date) ?? null);
      return lineDataset(
        `${series.label} (${series.unit})`,
        data,
        combinedColors[series.key]
      );
    })
    .map((dataset, index) => ({
      ...dataset,
      yAxisID: COMBINED_SERIES.filter((series) => selectedCombinedSeries.has(series.key))[index].axis
    }));

  createChart(container.querySelector("#combined-chart"), {
    type: "line",
    data: {
      labels: chartLabels,
      datasets: combinedDatasets
    },
    options: combinedChartOptions(range)
  });

  const weightEntries = entriesForValue(sortedDailyEntries, "weight");
  const movingAverage = calculateMovingAverage(sortedDailyEntries, "weight");
  const weightDatasets = [
    lineDataset("Gewicht", weightEntries.map((entry) => ({ x: formatDate(entry.date), y: entry.weight })), primary),
    lineDataset("7-Tage-Schnitt", movingAverage.map((entry) => ({ x: formatDate(entry.date), y: entry.value })), success, true)
  ];

  if (weightGoal) {
    weightDatasets.push(
      goalPathDataset("Zielpfad", weightGoal, warningColor),
      ...goalMarkerDatasets(weightGoal, today, warningColor, textSecondary)
    );
  }

  createChart(container.querySelector("#weight-chart"), {
    type: "line",
    data: {
      datasets: weightDatasets
    },
    options: chartOptions("Gewicht")
  });

  const bodyFat = entriesForValue(sortedBodyFatEntries, "bodyFatPercentage");
  const bodyFatDatasets = [
    lineDataset("KFA", bodyFat.map((entry) => ({ x: formatDate(entry.date), y: entry.bodyFatPercentage })), chartBodyFat)
  ];

  if (bodyFatGoal) {
    bodyFatDatasets.push(
      goalPathDataset("Zielpfad", bodyFatGoal, warningColor),
      ...goalMarkerDatasets(bodyFatGoal, today, warningColor, textSecondary)
    );
  }

  createChart(container.querySelector("#body-fat-chart"), {
    type: "line",
    data: {
      datasets: bodyFatDatasets
    },
    options: chartOptions("Körperfettanteil")
  });

  const calories = entriesForValue(sortedDailyEntries, "calories");
  createChart(container.querySelector("#calories-chart"), {
    type: "bar",
    data: {
      labels: calories.map((entry) => formatDate(entry.date)),
      datasets: [
        { label: "Kalorien", data: calories.map((entry) => entry.calories), backgroundColor: warningColor },
        { label: "Ziel", data: calories.map(() => calorieTarget), type: "line", borderColor: textSecondary, borderDash: [6, 6], pointRadius: 0 }
      ]
    },
    options: chartOptions("Kalorien")
  });

  const protein = entriesForValue(sortedDailyEntries, "protein");
  createChart(container.querySelector("#protein-chart"), {
    type: "bar",
    data: {
      labels: protein.map((entry) => formatDate(entry.date)),
      datasets: [
        { label: "Protein", data: protein.map((entry) => entry.protein), backgroundColor: success },
        { label: "Ziel", data: protein.map(() => proteinTarget), type: "line", borderColor: textSecondary, borderDash: [6, 6], pointRadius: 0 }
      ]
    },
    options: chartOptions("Protein")
  });

  createChart(container.querySelector("#circumference-chart"), {
    type: "line",
    data: {
      labels: sortedCircumferenceEntries.map((entry) => formatDate(entry.date)),
      datasets: [
        lineDataset("Armumfang", sortedCircumferenceEntries.map((entry) => entry.arm), primary),
        lineDataset("Beinumfang", sortedCircumferenceEntries.map((entry) => entry.leg), success)
      ]
    },
    options: chartOptions("Arm- und Beinumfang")
  });

  createChart(container.querySelector("#skinfold-chart"), {
    type: "line",
    data: {
      labels: sortedBodyFatEntries.map((entry) => formatDate(entry.date)),
      datasets: [
        lineDataset("Summe", sortedBodyFatEntries.map((entry) => entry.skinfoldSum), primary),
        lineDataset("Brust", sortedBodyFatEntries.map((entry) => entry.chest), success),
        lineDataset("Bauch", sortedBodyFatEntries.map((entry) => entry.abdomen), warningColor),
        lineDataset("Oberschenkel", sortedBodyFatEntries.map((entry) => entry.thigh), danger)
      ]
    },
    options: chartOptions("Hautfalten")
  });
}

function tryRenderCharts(container, chartData) {
  try {
    renderCharts(container, chartData);
    return true;
  } catch (error) {
    console.error("Diagramme konnten nicht gerendert werden.", error);
    container.querySelector("[data-chart-warning]").innerHTML = `
      <section class="card empty-state">
        <h2>Diagramme konnten nicht angezeigt werden</h2>
        <p>Die Trend-Zusammenfassung bleibt verfügbar. Lade die App neu, um die Diagramme erneut aufzubauen.</p>
      </section>
    `;
    return false;
  }
}

let currentChartData = null;
let selectedProgressionExerciseId = null;
let selectedProgressionMetric = "1rm";
let allDailyEntriesCache = [];
let allWorkoutSessions = [];

function updateCurveToggles(container) {
  container.querySelectorAll("[data-combined-toggle]").forEach((input) => {
    input.checked = selectedCombinedSeries.has(input.value);
  });
  container.querySelectorAll("[data-fullscreen-combined-toggle]").forEach((input) => {
    input.checked = selectedCombinedSeries.has(input.value);
  });
}

function openFullscreen(container, mode = "combined") {
  if (!currentChartData) return;
  activeFullscreenMode = mode;
  const overlay = container.querySelector("[data-fullscreen-overlay]");
  if (!overlay) return;
  overlay.hidden = false;
  document.body.classList.add("has-fullscreen-chart");
  overlay.querySelector("[data-fullscreen-range]").textContent = getRangeLabel(currentChartData.range);
  const titleEl = overlay.querySelector(".fullscreen-title");
  if (titleEl) {
    titleEl.textContent = mode === "rolling" ? "Gleitender 7-Tage-Durchschnitt" : "Trend-Übersicht (Tageswerte)";
  }

  const controls = overlay.querySelector(".fullscreen-controls");
  if (controls) {
    const seriesList = mode === "rolling" ? ROLLING_SERIES : COMBINED_SERIES;
    const selectedSet = mode === "rolling" ? selectedRollingSeries : selectedCombinedSeries;
    const toggleAttr = mode === "rolling" ? "data-fullscreen-rolling-toggle" : "data-fullscreen-combined-toggle";

    controls.innerHTML = `
      <fieldset class="choice-group compact-choice-group">
        <legend>${mode === "rolling" ? "7-Tage-Kurven" : "Kurven"}</legend>
        ${seriesList.map((series) => `
          <label>
            <input type="checkbox" value="${series.key}" ${toggleAttr} ${selectedSet.has(series.key) ? "checked" : ""}>
            ${series.label}
          </label>
        `).join("")}
      </fieldset>
    `;
  }

  renderFullscreenChart(container, currentChartData, mode);
}

function closeFullscreen(container) {
  const overlay = container.querySelector("[data-fullscreen-overlay]");
  if (!overlay) return;
  overlay.hidden = true;
  overlay.classList.remove("is-landscape-forced");
  document.body.classList.remove("has-fullscreen-chart");
  const rotateBtn = overlay.querySelector("[data-toggle-landscape]");
  if (rotateBtn) rotateBtn.textContent = "Querformat";
  destroyFullscreenChart();
}

function toggleLandscape(container) {
  const overlay = container.querySelector("[data-fullscreen-overlay]");
  if (!overlay) return;
  overlay.classList.toggle("is-landscape-forced");
  const isForced = overlay.classList.contains("is-landscape-forced");
  const rotateBtn = overlay.querySelector("[data-toggle-landscape]");
  if (rotateBtn) rotateBtn.textContent = isForced ? "Hochformat" : "Querformat";
  requestAnimationFrame(() => {
    if (fullscreenChartInstance) {
      fullscreenChartInstance.resize();
    }
  });
}

async function loadTrends(container, range = "30d") {
  const content = container.querySelector("[data-trend-content]");

  try {
    const [dailyEntries, bodyFatEntries, circumferenceEntries, settings, activeGoals, workoutSessions] = await Promise.all([
      getDailyEntries(),
      getBodyFatEntries(),
      getCircumferenceEntries(),
      getSettings(),
      getActiveGoals(),
      getWorkoutSessions()
    ]);

    allDailyEntriesCache = dailyEntries || [];
    allWorkoutSessions = workoutSessions || [];
    const trackedExercises = getTrackedStrengthExercises(allWorkoutSessions);
    if (!selectedProgressionExerciseId && trackedExercises.length) {
      selectedProgressionExerciseId = trackedExercises[0].id;
    }

    const filteredDaily = filterEntriesByRange(dailyEntries, range);
    const filteredBodyFat = filterEntriesByRange(bodyFatEntries, range);
    const filteredCircumference = filterEntriesByRange(circumferenceEntries, range);
    const tdeeData = calculateAdaptiveTdee(dailyEntries, 14);

    content.innerHTML = renderTrendContent({
      dailyEntries,
      bodyFatEntries,
      circumferenceEntries,
      settings,
      range,
      activeGoals,
      workoutSessions: allWorkoutSessions,
      tdeeData,
      selectedExerciseId: selectedProgressionExerciseId
    });

    currentChartData = {
      dailyEntries: filteredDaily,
      allDailyEntries: dailyEntries,
      bodyFatEntries: filteredBodyFat,
      circumferenceEntries: filteredCircumference,
      settings,
      activeGoals,
      range,
      workoutSessions: allWorkoutSessions
    };
    tryRenderCharts(container, currentChartData);

    const overlay = container.querySelector("[data-fullscreen-overlay]");
    if (overlay && !overlay.hidden) {
      overlay.querySelector("[data-fullscreen-range]").textContent = getRangeLabel(range);
      renderFullscreenChart(container, currentChartData, activeFullscreenMode);
    }
  } catch (error) {
    console.error(error);
    content.innerHTML = `
      <section class="card empty-state">
        <h2>Trends konnten nicht geladen werden</h2>
        <p>Die lokale Datenbank ist gerade nicht verfügbar.</p>
      </section>
    `;
  }
}

function initializeTrends(container) {
  const select = container.querySelector("[data-range-select]");

  select.addEventListener("change", () => {
    loadTrends(container, select.value);
  });

  container.addEventListener("change", (event) => {
    const t = event.target;
    if (t.matches("[data-exercise-progression-select]")) {
      selectedProgressionExerciseId = t.value;
      const card = container.querySelector("[data-exercise-progression-card]");
      if (card) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = renderExerciseProgressionSection(allWorkoutSessions, selectedProgressionExerciseId, allDailyEntriesCache, selectedProgressionMetric);
        const newCard = tempDiv.firstElementChild;
        if (newCard) {
          card.replaceWith(newCard);
          const progression = extractExerciseProgression(allWorkoutSessions, selectedProgressionExerciseId, allDailyEntriesCache);
          if (progression) {
            renderExerciseProgressionChart(container, progression, selectedProgressionMetric);
          }
        }
      }
      return;
    }

    if (t.matches("[data-rolling-toggle]")) {
      if (t.checked) selectedRollingSeries.add(t.value);
      else selectedRollingSeries.delete(t.value);
      if (currentChartData) {
        tryRenderCharts(container, currentChartData);
      }
      return;
    }

    if (t.matches("[data-fullscreen-rolling-toggle]")) {
      if (t.checked) selectedRollingSeries.add(t.value);
      else selectedRollingSeries.delete(t.value);
      container.querySelectorAll(`[data-rolling-toggle][value="${t.value}"]`).forEach((input) => {
        input.checked = t.checked;
      });
      if (currentChartData) {
        tryRenderCharts(container, currentChartData);
        renderFullscreenChart(container, currentChartData, activeFullscreenMode);
      }
      return;
    }

    if (t.matches("[data-combined-toggle], [data-fullscreen-combined-toggle]")) {
      if (t.checked) selectedCombinedSeries.add(t.value);
      else selectedCombinedSeries.delete(t.value);
      updateCurveToggles(container);
      if (currentChartData) {
        tryRenderCharts(container, currentChartData);
        const overlay = container.querySelector("[data-fullscreen-overlay]");
        if (overlay && !overlay.hidden) {
          renderFullscreenChart(container, currentChartData, activeFullscreenMode);
        }
      }
    }
  });

  container.addEventListener("click", (event) => {
    const metricBtn = event.target.closest("[data-progression-metric]");
    if (metricBtn) {
      selectedProgressionMetric = metricBtn.dataset.progressionMetric;
      const card = container.querySelector("[data-exercise-progression-card]");
      if (card) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = renderExerciseProgressionSection(allWorkoutSessions, selectedProgressionExerciseId, allDailyEntriesCache, selectedProgressionMetric);
        const newCard = tempDiv.firstElementChild;
        if (newCard) {
          card.replaceWith(newCard);
          const progression = extractExerciseProgression(allWorkoutSessions, selectedProgressionExerciseId, allDailyEntriesCache);
          if (progression) {
            renderExerciseProgressionChart(container, progression, selectedProgressionMetric);
          }
        }
      }
      return;
    }

    const openFsBtn = event.target.closest("[data-open-fullscreen]");
    if (openFsBtn) {
      const mode = openFsBtn.dataset.openFullscreen || "combined";
      openFullscreen(container, mode);
      return;
    }
    if (event.target.closest("[data-close-fullscreen]")) {
      closeFullscreen(container);
      return;
    }
    if (event.target.closest("[data-toggle-landscape]")) {
      toggleLandscape(container);
      return;
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeFullscreen(container);
    }
  });

  window.addEventListener("resize", () => {
    chartInstances.forEach((chart) => chart?.resize?.());
    fullscreenChartInstance?.resize?.();
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      chartInstances.forEach((chart) => chart?.resize?.());
      fullscreenChartInstance?.resize?.();
    }, 150);
  });

  loadTrends(container, select.value);
}

export function renderTrends() {
  const fragment = document.createDocumentFragment();
  const container = document.createElement("section");
  container.className = "view-stack";
  container.innerHTML = `
    <section class="card">
      <div class="card-body">
        <label class="field">
          <span>Zeitraum</span>
          <select data-range-select>
            ${RANGE_OPTIONS.map((option) => `<option value="${option.value}" ${option.value === "30d" ? "selected" : ""}>${option.label}</option>`).join("")}
          </select>
        </label>
      </div>
    </section>
    <div data-chart-warning></div>
    <div class="view-stack" data-trend-content>
      <section class="card skeleton" aria-label="Trends werden geladen"></section>
    </div>
    <section class="card">
      <div class="card-body">
        <a class="button secondary" href="#/progress-photos">Fortschrittsbilder</a>
      </div>
    </section>
    <div class="chart-fullscreen-overlay" data-fullscreen-overlay hidden>
      <div class="fullscreen-chart-modal" role="dialog" aria-modal="true" aria-label="Diagramm Vollbildansicht">
        <div class="fullscreen-chart-header">
          <div>
            <span class="status-pill" data-fullscreen-range>30 Tage</span>
            <h3 class="fullscreen-title">Trend-Übersicht</h3>
          </div>
          <div class="fullscreen-header-actions">
            <button type="button" class="button secondary compact-button" data-toggle-landscape aria-label="Querformat umschalten">
              Querformat
            </button>
            <button type="button" class="icon-button" data-close-fullscreen aria-label="Vollbild schließen">
              ×
            </button>
          </div>
        </div>
        <div class="fullscreen-controls">
          <fieldset class="choice-group compact-choice-group">
            <legend>Kurven</legend>
            ${COMBINED_SERIES.map((series) => `
              <label>
                <input type="checkbox" value="${series.key}" data-fullscreen-combined-toggle ${selectedCombinedSeries.has(series.key) ? "checked" : ""}>
                ${series.label}
              </label>
            `).join("")}
          </fieldset>
        </div>
        <div class="fullscreen-chart-frame">
          <canvas id="fullscreen-chart" aria-label="Vollbild-Diagramm" role="img"></canvas>
        </div>
      </div>
    </div>
  `;
  fragment.append(container);
  initializeTrends(container);
  return fragment;
}
