import {
  GOAL_STATUS,
  GOAL_TYPES,
  analyzeGoal,
  analyzeMilestones,
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
  getGoalPoints,
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

test("getGoalPoints liefert Start, sortierte Zwischenschritte und Zielpunkt", () => {
  const goalWithMilestones = {
    ...weightGoal,
    startValue: 100,
    targetValue: 92,
    startDate: "2026-07-01",
    targetDate: "2027-01-01",
    milestones: [
      { id: "m2", date: "2026-11-01", targetValue: 93, label: "Zweiter Zwischenschritt" },
      { id: "m1", date: "2026-09-01", targetValue: 95, label: "Erster Zwischenschritt" }
    ]
  };
  const points = getGoalPoints(goalWithMilestones);
  assertEqual(points.length, 4, "Anzahl Punkte falsch");
  assertEqual(points[0].date, "2026-07-01", "Startdatum falsch");
  assertEqual(points[1].date, "2026-09-01", "Erster Zwischenschritt falsch sortiert");
  assertEqual(points[1].value, 95, "Erster Zwischenschritt-Wert falsch");
  assertEqual(points[2].date, "2026-11-01", "Zweiter Zwischenschritt falsch sortiert");
  assertEqual(points[3].date, "2027-01-01", "Zieldatum falsch");
});

test("calculateExpectedValueToday interpoliert stückweise linear mit Zwischenschritten", () => {
  const goalWithMilestones = {
    ...weightGoal,
    startValue: 100,
    targetValue: 92,
    startDate: "2026-07-01",
    targetDate: "2027-01-01",
    milestones: [
      { id: "m1", date: "2026-09-01", targetValue: 95, label: "5kg abgenommen" }
    ]
  };

  // Am Startdatum
  assertEqual(calculateExpectedValueToday(goalWithMilestones, "2026-07-01"), 100, "Startwert falsch");

  // Am Zwischenschritt-Datum (01.09.2026) -> genau 95.0 kg
  assertEqual(calculateExpectedValueToday(goalWithMilestones, "2026-09-01"), 95, "Zwischenschritt-Sollwert falsch");

  // Am Zieldatum (01.01.2027) -> genau 92.0 kg
  assertEqual(calculateExpectedValueToday(goalWithMilestones, "2027-01-01"), 92, "Zieltermin-Sollwert falsch");

  // Vor Startdatum -> Startwert
  assertEqual(calculateExpectedValueToday(goalWithMilestones, "2026-06-15"), 100, "Vor-Startwert falsch");

  // Nach Zieldatum -> Endwert
  assertEqual(calculateExpectedValueToday(goalWithMilestones, "2027-02-01"), 92, "Nach-Zieltermin-Wert falsch");
});

test("analyzeMilestones ermittelt Status, Resttage und nächstes Zwischenziel", () => {
  const goalWithMilestones = {
    ...weightGoal,
    startValue: 100,
    targetValue: 92,
    startDate: "2026-07-01",
    targetDate: "2027-01-01",
    milestones: [
      { id: "m1", date: "2026-09-01", targetValue: 95, label: "5kg weniger" },
      { id: "m2", date: "2026-11-01", targetValue: 93.5, label: "6.5kg weniger" }
    ]
  };

  // Stand 15.08.2026 bei 96 kg: erstes Zwischenziel noch nicht erreicht aber aktiv
  const analysis1 = analyzeMilestones(goalWithMilestones, 96, "2026-08-15");
  assertEqual(analysis1.milestones.length, 2, "Anzahl Milestones falsch");
  assertEqual(analysis1.activeMilestone.id, "m1", "Aktives Zwischenziel falsch");
  assertEqual(analysis1.milestones[0].isCompleted, false, "Erstes Zwischenziel sollte unvollständig sein");
  assertEqual(analysis1.milestones[0].isOverdue, false, "Erstes Zwischenziel sollte nicht überfällig sein");

  // Stand 15.09.2026 bei 94.5 kg: erstes Zwischenziel erreicht (94.5 <= 95), zweites aktiv
  const analysis2 = analyzeMilestones(goalWithMilestones, 94.5, "2026-09-15");
  assertEqual(analysis2.milestones[0].isCompleted, true, "Erstes Zwischenziel sollte abgeschlossen sein");
  assertEqual(analysis2.activeMilestone.id, "m2", "Zweites Zwischenziel sollte aktiv sein");

  // Stand 15.09.2026 bei 96 kg: erstes Zwischenziel überfällig (15.09 > 01.09 und 96 > 95)
  const analysis3 = analyzeMilestones(goalWithMilestones, 96, "2026-09-15");
  assertEqual(analysis3.milestones[0].isOverdue, true, "Erstes Zwischenziel sollte überfällig sein");
});

test("analyzeGoal bindet Milestones und activeMilestone in das Ergebnis ein", () => {
  const goalWithMilestones = {
    ...weightGoal,
    startValue: 100,
    targetValue: 92,
    startDate: "2026-07-01",
    targetDate: "2027-01-01",
    milestones: [
      { id: "m1", date: "2026-09-01", targetValue: 95 }
    ]
  };
  const analysis = analyzeGoal(goalWithMilestones, [{ date: "2026-08-15", weight: 96 }], "2026-08-15");
  assertEqual(analysis.milestones.length, 1, "Milestones im Gesamtergebnis fehlen");
  assertEqual(analysis.activeMilestone.id, "m1", "Aktives Milestone im Gesamtergebnis fehlt");
});

test("calculateAdaptiveTdee berechnet exakten TDEE aus Kalorienaufnahme und 14-Tage-Gewichtsverlust", async () => {
  const { calculateAdaptiveTdee } = await import("../js/calculations.js");

  // 14 Tage: Täglich 2500 kcal, Gewichtsverlust von 90.0 kg auf 89.0 kg (-1.0 kg in 14 Tagen)
  // Delta = -1.0 kg * 7700 kcal / 14 Tage = -550 kcal/Tag
  // TDEE = 2500 - (-550) = 3050 kcal/Tag
  const entries = Array.from({ length: 14 }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    const weight = 90.0 - (i * (1.0 / 13));
    return {
      date: `2026-08-${day}`,
      weight: Number(weight.toFixed(2)),
      calories: 2500
    };
  });

  const res = calculateAdaptiveTdee(entries, 14, new Date("2026-08-14T12:00:00"));
  assertEqual(res.hasSufficientData, true, "Muss genügend Daten haben");
  assertClose(res.tdee, 3050, 50, "TDEE muss ca. 3050 kcal/Tag sein");
  assert(res.dailyDeficit > 0, "Defizit muss positiv sein");
});

test("calculateAdaptiveTdee meldet unzureichende Daten bei weniger als 5 Einträgen", async () => {
  const { calculateAdaptiveTdee } = await import("../js/calculations.js");
  const entries = [
    { date: "2026-08-01", weight: 90, calories: 2000 },
    { date: "2026-08-02", weight: 89.8, calories: 2100 }
  ];
  const res = calculateAdaptiveTdee(entries, 14, new Date("2026-08-02T12:00:00"));
  assertEqual(res.hasSufficientData, false, "Darf bei 2 Tagen keine Berechnung durchführen");
  assertEqual(res.tdee, null, "TDEE muss null sein");
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
