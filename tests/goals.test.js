import {
  GOAL_STATUS,
  GOAL_TYPES,
  analyzeGoal,
  calculateExpectedValueToday,
  calculateGoalProgress,
  calculateLinearTrend,
  calculatePaceRatio,
  calculateProjectedGoalDate,
  calculateProjectedValue,
  calculateRemainingRequiredRate,
  calculateRequiredRate,
  calculateScheduleDeviation,
  differenceInCalendarDays,
  resolveStartValue
} from "../js/goals.js";

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}. Erwartet: ${expected}, erhalten: ${actual}`);
  }
}

function assertClose(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}. Erwartet: ${expected}, erhalten: ${actual}`);
  }
}

const weightGoal = {
  id: "goal-weight",
  type: GOAL_TYPES.WEIGHT,
  startDate: "2026-07-01",
  targetDate: "2026-09-23",
  startValue: 95,
  targetValue: 87,
  direction: "decrease",
  status: "active"
};

const gainGoal = {
  ...weightGoal,
  id: "goal-gain",
  startValue: 80,
  targetValue: 84
};

const bodyFatGoal = {
  id: "goal-body-fat",
  type: GOAL_TYPES.BODY_FAT,
  startDate: "2026-07-01",
  targetDate: "2026-10-21",
  startValue: 24,
  targetValue: 20,
  direction: "decrease",
  status: "active"
};

test("differenceInCalendarDays nutzt Kalendertage", () => {
  assertEqual(differenceInCalendarDays("2026-07-08", "2026-07-01"), 7, "Differenz falsch");
});

test("berechnet erforderliche Tages- und Wochenrate für Gewichtsabnahme", () => {
  const result = calculateRequiredRate(weightGoal);
  assertEqual(result.durationDays, 84, "Dauer falsch");
  assertClose(result.requiredDailyRate, -0.0952, 0.0001, "Tagesrate falsch");
  assertClose(result.requiredWeeklyRate, -0.6667, 0.0001, "Wochenrate falsch");
});

test("berechnet Sollwert am heutigen Tag", () => {
  assertClose(calculateExpectedValueToday(weightGoal, "2026-08-12"), 91, 0.01, "Sollwert falsch");
});

test("berechnet Fortschritt und Zeitfortschritt", () => {
  const result = calculateGoalProgress(weightGoal, 91.8, "2026-08-12");
  assertClose(result.valueProgress, 0.4, 0.01, "Wertfortschritt falsch");
  assertClose(result.timeProgress, 0.5, 0.01, "Zeitfortschritt falsch");
});

test("richtungsbereinigte Pace Ratio funktioniert für Abnahme", () => {
  assertClose(calculatePaceRatio(weightGoal, -0.5), 0.75, 0.01, "Pace Ratio für Abnahme falsch");
});

test("richtungsbereinigte Pace Ratio funktioniert für Zunahme", () => {
  assertClose(calculatePaceRatio(gainGoal, 0.5), 1.5, 0.01, "Pace Ratio für Zunahme falsch");
});

test("Schedule Deviation ist negativ, wenn Gewichtsabnahme hinter Plan liegt", () => {
  assertClose(calculateScheduleDeviation(weightGoal, 91.8, "2026-08-12"), -0.8, 0.01, "Planabweichung falsch");
});

test("lineare Regression erkennt regelmäßig fallende Werte", () => {
  const entries = [
    { date: "2026-07-01", weight: 95 },
    { date: "2026-07-03", weight: 94 },
    { date: "2026-07-05", weight: 93 }
  ];
  const result = calculateLinearTrend(entries, {
    valueKey: "weight",
    startDate: "2026-07-01",
    endDate: "2026-07-07",
    goalType: GOAL_TYPES.WEIGHT
  });
  assert(result.available, "Trend sollte verfügbar sein");
  assertClose(result.dailyRate, -0.5, 0.0001, "Trendrate falsch");
  assertClose(result.weeklyRate, -3.5, 0.0001, "Wochentrend falsch");
});

test("lineare Regression berücksichtigt unregelmäßige Messabstände", () => {
  const entries = [
    { date: "2026-07-01", weight: 100 },
    { date: "2026-07-02", weight: 99.8 },
    { date: "2026-07-11", weight: 98 }
  ];
  const result = calculateLinearTrend(entries, {
    valueKey: "weight",
    startDate: "2026-07-01",
    endDate: "2026-07-11",
    goalType: GOAL_TYPES.WEIGHT
  });
  assert(result.available, "Trend sollte verfügbar sein");
  assertClose(result.dailyRate, -0.2, 0.0001, "Unregelmäßige Abstände falsch bewertet");
});

test("Gewicht nutzt bei mehreren Messungen am gleichen Tag den Tagesmittelwert", () => {
  const entries = [
    { date: "2026-07-01", weight: 100 },
    { date: "2026-07-01", weight: 98 },
    { date: "2026-07-04", weight: 97 },
    { date: "2026-07-08", weight: 96 }
  ];
  const result = calculateLinearTrend(entries, {
    valueKey: "weight",
    startDate: "2026-07-01",
    endDate: "2026-07-08",
    goalType: GOAL_TYPES.WEIGHT
  });
  assert(result.available, "Trend sollte verfügbar sein");
  assertEqual(result.measurementCount, 3, "Tagesmittel wurde nicht verwendet");
});

test("zu wenige Gewichtswerte liefern keinen Trend", () => {
  const result = calculateLinearTrend([{ date: "2026-07-01", weight: 95 }], {
    valueKey: "weight",
    startDate: "2026-07-01",
    endDate: "2026-07-07",
    goalType: GOAL_TYPES.WEIGHT
  });
  assert(!result.available, "Trend darf nicht verfügbar sein");
});

test("KFA-Trend ist mit zwei Messungen über sieben Tage verfügbar", () => {
  const result = calculateLinearTrend([
    { date: "2026-07-01", bodyFatPercentage: 24 },
    { date: "2026-07-08", bodyFatPercentage: 23.5 }
  ], {
    valueKey: "bodyFatPercentage",
    startDate: "2026-07-01",
    endDate: "2026-07-14",
    goalType: GOAL_TYPES.BODY_FAT
  });
  assert(result.available, "KFA-Trend sollte verfügbar sein");
  assertEqual(result.confidence, "low", "Zwei KFA-Messungen sollten geringe Aussagekraft haben");
});

test("Prognose zum Zieltermin wird berechnet", () => {
  const projected = calculateProjectedValue(weightGoal, 91, -0.1, "2026-08-12");
  assertClose(projected, 86.8, 0.01, "Prognosewert falsch");
});

test("prognostiziertes Erreichungsdatum wird berechnet", () => {
  const projected = calculateProjectedGoalDate(weightGoal, 91, -0.1, "2026-08-12");
  assertEqual(projected.date, "2026-09-21", "Erreichungsdatum falsch");
});

test("kein Erreichungsdatum bei falscher Trendrichtung", () => {
  const projected = calculateProjectedGoalDate(weightGoal, 91, 0.1, "2026-08-12");
  assertEqual(projected.date, null, "Datum darf nicht berechnet werden");
});

test("Ziel bereits erreicht wird erkannt", () => {
  const projected = calculateProjectedGoalDate(weightGoal, 86.8, -0.1, "2026-08-12");
  assert(projected.reached, "Ziel sollte erreicht sein");
});

test("ab heute benötigtes Tempo wird berechnet", () => {
  const result = calculateRemainingRequiredRate(weightGoal, 91.8, "2026-08-12");
  assertClose(result.remainingRequiredWeeklyRate, -0.8, 0.0001, "Resttempo falsch");
});

test("Ausgangswert für Gewicht nutzt bevorzugt 7-Tage-Durchschnitt", () => {
  const result = resolveStartValue({ ...weightGoal, startValue: null }, [
    { date: "2026-06-27", weight: 96 },
    { date: "2026-06-29", weight: 95 },
    { date: "2026-07-01", weight: 94 }
  ]);
  assertEqual(result.method, "7-day-average", "Falsche Startwertmethode");
  assertClose(result.value, 95, 0.01, "Startwert falsch");
});

test("analyzeGoal wählt 14-Tage-Trend als Primärtrend und erkennt Status", () => {
  const entries = Array.from({ length: 15 }, (_, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    weight: 94 - index * 0.08
  }));
  const analysis = analyzeGoal(weightGoal, entries, "2026-08-15");
  assertEqual(analysis.primaryTrend, "days14", "Primärtrend falsch");
  assert([GOAL_STATUS.ON_TRACK, GOAL_STATUS.AHEAD, GOAL_STATUS.SLIGHTLY_BEHIND].includes(analysis.overallStatus), "Unerwarteter Gesamtstatus");
});

test("analyzeGoal erkennt ein zukünftiges Ziel als noch nicht gestartet", () => {
  const futureGoal = {
    ...weightGoal,
    startDate: "2026-09-01",
    targetDate: "2026-10-01"
  };
  const analysis = analyzeGoal(futureGoal, [{ date: "2026-08-15", weight: 95 }], "2026-08-15");
  assertEqual(analysis.overallStatus, GOAL_STATUS.NOT_STARTED, "Zukünftiges Ziel falsch bewertet");
});

test("analyzeGoal erkennt ein vorzeitig erreichtes Ziel", () => {
  const analysis = analyzeGoal(weightGoal, [{ date: "2026-08-12", weight: 86.8 }], "2026-08-12");
  assertEqual(analysis.overallStatus, GOAL_STATUS.COMPLETED, "Erreichtes Ziel falsch bewertet");
});

test("analyzeGoal erkennt überfällige Ziele ohne automatische Abschließung", () => {
  const analysis = analyzeGoal(weightGoal, [{ date: "2026-10-01", weight: 89 }], "2026-10-01");
  assertEqual(analysis.overallStatus, GOAL_STATUS.OVERDUE, "Überfälliges Ziel falsch bewertet");
});

test("analyzeGoal warnt bei alter KFA-Messung", () => {
  const analysis = analyzeGoal(bodyFatGoal, [
    { date: "2026-07-01", bodyFatPercentage: 24 },
    { date: "2026-07-08", bodyFatPercentage: 23.8 }
  ], "2026-08-15");
  assert(analysis.warnings.some((warning) => warning.includes("älteren Messung")), "Warnung für alte KFA-Messung fehlt");
});

export async function runGoalTests() {
  const results = [];

  for (const item of tests) {
    try {
      await item.fn();
      results.push({ name: item.name, passed: true });
    } catch (error) {
      results.push({ name: item.name, passed: false, error });
    }
  }

  return results;
}
