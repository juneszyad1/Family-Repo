import { getActiveGoals, getBodyFatEntries, getCircumferenceEntries, getDailyEntries, getSettings } from "../database.js";
import { calculateMovingAverage, calculateTrendSummary, filterEntriesByRange } from "../calculations.js";
import { GOAL_TYPES, calculateExpectedValueToday, getGoalPoints } from "../goals.js";
import { formatDate, formatNumber, sortByDateDesc, todayIsoDate } from "../utils.js";

const RANGE_OPTIONS = [
  { value: "7d", label: "7 Tage" },
  { value: "30d", label: "30 Tage" },
  { value: "90d", label: "90 Tage" },
  { value: "6m", label: "6 Monate" },
  { value: "1y", label: "1 Jahr" },
  { value: "all", label: "Gesamt" }
];

const chartInstances = [];
const COMBINED_SERIES = [
  { key: "weight", label: "Gewicht", valueKey: "weight", unit: "kg", axis: "weight", defaultVisible: true },
  { key: "calories", label: "Kalorien", valueKey: "calories", unit: "kcal", axis: "calories", defaultVisible: false },
  { key: "protein", label: "Protein", valueKey: "protein", unit: "g", axis: "protein", defaultVisible: false },
  { key: "sleep", label: "Schlafdauer", valueKey: "sleepHours", unit: "h", axis: "sleep", defaultVisible: false }
];
const selectedCombinedSeries = new Set(COMBINED_SERIES.filter((series) => series.defaultVisible).map((series) => series.key));

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

function getCssColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function chartOptions(title) {
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
        ticks: { color: textColor, maxRotation: 0, autoSkip: true },
        grid: { color: borderColor }
      },
      y: {
        ticks: { color: textColor },
        grid: { color: borderColor }
      }
    }
  };
}

function combinedChartOptions(range) {
  const options = chartOptions(`Übersicht · ${getRangeLabel(range)}`);
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
    pointHoverRadius: 5
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

function renderSummary(summary) {
  const items = [
    ["Ø Kalorien", `${formatNumber(summary.averageCalories, { maximumFractionDigits: 0 })} kcal`],
    ["Ø Protein", `${formatNumber(summary.averageProtein, { maximumFractionDigits: 0 })} g`],
    ["Ø Schlaf", `${formatNumber(summary.averageSleep, { maximumFractionDigits: 1 })} h`],
    ["Gewicht", `${formatNumber(summary.weightChange, { maximumFractionDigits: 1 })} kg`],
    ["Schlaf", `${formatNumber(summary.sleepChange, { maximumFractionDigits: 1 })} h`],
    ["KFA", `${formatNumber(summary.bodyFatChange, { maximumFractionDigits: 1 })} %`],
    ["Erfasste Tage", formatNumber(summary.trackedDays, { maximumFractionDigits: 0 })]
  ];

  return `
    <section class="trend-summary" aria-label="Zusammenfassung des Zeitraums">
      ${items
        .map(
          ([label, value]) => `
            <article class="metric compact-metric">
              <p class="metric-label">${label}</p>
              <p class="metric-value">${value}</p>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderCombinedChartShell(range, dailyEntries) {
  return `
    <section class="card">
      <div class="card-body">
        <h2 class="section-title">Übersicht · ${getRangeLabel(range)}</h2>
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
        <p class="chart-summary">${dailyEntries.length} erfasste Tage im Zeitraum. Für eine klare Darstellung ist standardmäßig nur Gewicht aktiv.</p>
        ${renderDataAlternative(dailyEntries)}
      </div>
    </section>
  `;
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

function renderTrendContent({ dailyEntries, bodyFatEntries, circumferenceEntries, settings, range, activeGoals }) {
  const filteredDaily = filterEntriesByRange(dailyEntries, range);
  const filteredBodyFat = filterEntriesByRange(bodyFatEntries, range);
  const filteredCircumference = filterEntriesByRange(circumferenceEntries, range);
  const summary = calculateTrendSummary(filteredDaily, filteredBodyFat, filteredCircumference);
  const hasAnyData = filteredDaily.length || filteredBodyFat.length || filteredCircumference.length;
  const hasGoals = activeGoals.length > 0;
  const countValues = (entries, key) => entries.filter((entry) => entry[key] !== null && entry[key] !== undefined).length;
  const weightCount = countValues(filteredDaily, "weight");
  const calorieCount = countValues(filteredDaily, "calories");
  const proteinCount = countValues(filteredDaily, "protein");
  const bodyFatCount = countValues(filteredBodyFat, "bodyFatPercentage");
  const circumferenceCount = filteredCircumference.filter((entry) => entry.arm != null || entry.leg != null).length;
  const skinfoldCount = filteredBodyFat.filter((entry) => entry.skinfoldSum != null).length;
  const hasCombinedData = COMBINED_SERIES.some((series) => countValues(filteredDaily, series.valueKey) > 0);

  if (!hasAnyData && !hasGoals) {
    return renderEmptyMessage();
  }

  return `
    ${renderSummary(summary)}
    ${hasCombinedData ? renderCombinedChartShell(range, filteredDaily) : ""}
    <p class="chart-summary">Zusätzlich im Zeitraum: ${bodyFatCount} KFA-, ${circumferenceCount} Umfang- und ${skinfoldCount} Hautfaltenmessungen.</p>
  `;
}

function renderCharts(container, { dailyEntries, bodyFatEntries, circumferenceEntries, settings, activeGoals, range }) {
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
  const violet = getCssColor("--primary-strong");
  const today = todayIsoDate();
  const weightGoal = activeGoals.find((goal) => goal.type === GOAL_TYPES.WEIGHT);
  const bodyFatGoal = activeGoals.find((goal) => goal.type === GOAL_TYPES.BODY_FAT);

  const combinedColors = {
    weight: primary,
    calories: warningColor,
    protein: success,
    sleep: violet
  };
  const combinedDatasets = COMBINED_SERIES
    .filter((series) => selectedCombinedSeries.has(series.key))
    .map((series) => lineDataset(
      `${series.label} (${series.unit})`,
      entriesForValue(sortedDailyEntries, series.valueKey).map((entry) => ({ x: formatDate(entry.date), y: entry[series.valueKey] })),
      combinedColors[series.key]
    ))
    .map((dataset, index) => ({
      ...dataset,
      yAxisID: COMBINED_SERIES.filter((series) => selectedCombinedSeries.has(series.key))[index].axis
    }));

  createChart(container.querySelector("#combined-chart"), {
    type: "line",
    data: {
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
    lineDataset("KFA", bodyFat.map((entry) => ({ x: formatDate(entry.date), y: entry.bodyFatPercentage })), danger)
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
        { label: "Kalorien", data: calories.map((entry) => entry.calories), backgroundColor: primary },
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

async function loadTrends(container, range = "30d") {
  const content = container.querySelector("[data-trend-content]");

  try {
    const [dailyEntries, bodyFatEntries, circumferenceEntries, settings, activeGoals] = await Promise.all([
      getDailyEntries(),
      getBodyFatEntries(),
      getCircumferenceEntries(),
      getSettings(),
      getActiveGoals()
    ]);

    const filteredDaily = filterEntriesByRange(dailyEntries, range);
    const filteredBodyFat = filterEntriesByRange(bodyFatEntries, range);
    const filteredCircumference = filterEntriesByRange(circumferenceEntries, range);

    content.innerHTML = renderTrendContent({ dailyEntries, bodyFatEntries, circumferenceEntries, settings, range, activeGoals });
    const chartData = { dailyEntries: filteredDaily, bodyFatEntries: filteredBodyFat, circumferenceEntries: filteredCircumference, settings, activeGoals, range };
    tryRenderCharts(container, chartData);
    container.querySelectorAll("[data-combined-toggle]").forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) selectedCombinedSeries.add(input.value);
        else selectedCombinedSeries.delete(input.value);
        tryRenderCharts(container, chartData);
      });
    });
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
  `;
  fragment.append(container);
  initializeTrends(container);
  return fragment;
}
