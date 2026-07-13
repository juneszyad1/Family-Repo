export const GOAL_TYPES = {
  WEIGHT: "weight",
  BODY_FAT: "bodyFat"
};

export const GOAL_STATUS = {
  AHEAD: "ahead",
  ON_TRACK: "onTrack",
  SLIGHTLY_BEHIND: "slightlyBehind",
  BEHIND: "behind",
  WRONG_DIRECTION: "wrongDirection",
  INSUFFICIENT_DATA: "insufficientData",
  NOT_STARTED: "notStarted",
  COMPLETED: "completed",
  OVERDUE: "overdue"
};

const TREND_WINDOWS = [
  { key: "days7", days: 7 },
  { key: "days14", days: 14 },
  { key: "days30", days: 30 }
];

function toDate(date) {
  if (date instanceof Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  return new Date(`${date}T00:00:00`);
}

function toIsoDate(date) {
  const localDate = toDate(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const result = toDate(date);
  result.setDate(result.getDate() + days);
  return result;
}

function round(value, digits = 4) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}

export function differenceInCalendarDays(dateLeft, dateRight) {
  const left = toDate(dateLeft);
  const right = toDate(dateRight);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round((left - right) / millisecondsPerDay);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getGoalUnit(goal) {
  return goal.type === GOAL_TYPES.BODY_FAT ? "Prozentpunkte" : "kg";
}

export function getDirectionFactor(goal) {
  return goal.targetValue < goal.startValue ? -1 : 1;
}

export function calculateRequiredRate(goal) {
  const durationDays = differenceInCalendarDays(goal.targetDate, goal.startDate);
  const totalRequiredChange = goal.targetValue - goal.startValue;
  const requiredDailyRate = durationDays > 0 ? totalRequiredChange / durationDays : null;

  return {
    durationDays,
    totalRequiredChange: round(totalRequiredChange),
    requiredDailyRate: round(requiredDailyRate),
    requiredWeeklyRate: round(requiredDailyRate === null ? null : requiredDailyRate * 7)
  };
}

export function calculateExpectedValueToday(goal, today = new Date()) {
  const { durationDays, requiredDailyRate } = calculateRequiredRate(goal);

  if (requiredDailyRate === null) {
    return null;
  }

  const elapsedDays = differenceInCalendarDays(today, goal.startDate);
  const clampedElapsedDays = clamp(elapsedDays, 0, durationDays);

  return round(goal.startValue + requiredDailyRate * clampedElapsedDays, 2);
}

function valueForEntry(entry, valueKey) {
  const value = entry[valueKey];
  return value === null || value === undefined || Number.isNaN(value) ? null : value;
}

export function normalizeMeasurements(entries, valueKey) {
  const byDate = new Map();

  entries.forEach((entry) => {
    const value = valueForEntry(entry, valueKey);
    if (!entry.date || value === null) {
      return;
    }

    if (!byDate.has(entry.date)) {
      byDate.set(entry.date, []);
    }
    byDate.get(entry.date).push({ ...entry, value });
  });

  return [...byDate.entries()]
    .map(([date, items]) => {
      if (valueKey === "bodyFatPercentage") {
        const latest = [...items].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0];
        return { date, value: latest.value };
      }

      const average = items.reduce((sum, item) => sum + item.value, 0) / items.length;
      return { date, value: average };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function calculateCurrentValue(goal, entries, today = new Date()) {
  const valueKey = goal.type === GOAL_TYPES.BODY_FAT ? "bodyFatPercentage" : "weight";
  const measurements = normalizeMeasurements(entries, valueKey)
    .filter((entry) => differenceInCalendarDays(today, entry.date) >= 0);

  if (!measurements.length) {
    return {
      value: null,
      method: "missing",
      measurementCount: 0,
      warning: "Kein aktueller Messwert vorhanden."
    };
  }

  if (goal.type === GOAL_TYPES.BODY_FAT) {
    const latest = measurements[measurements.length - 1];
    const ageDays = differenceInCalendarDays(today, latest.date);

    return {
      value: latest.value,
      method: "latest",
      measurementCount: 1,
      ageDays,
      warning: ageDays > 21 ? "Die aktuelle KFA-Prognose basiert auf einer älteren Messung." : null
    };
  }

  const recent = measurements.filter((entry) => differenceInCalendarDays(today, entry.date) <= 6);

  if (recent.length >= 2) {
    const value = recent.reduce((sum, entry) => sum + entry.value, 0) / recent.length;
    return {
      value: round(value, 2),
      method: "7-day-average",
      measurementCount: recent.length,
      warning: null
    };
  }

  const latest = measurements[measurements.length - 1];
  return {
    value: latest.value,
    method: "latest",
    measurementCount: 1,
    warning: "Weniger zuverlässig: Es liegen weniger als zwei Gewichtswerte in den letzten sieben Tagen vor."
  };
}

export function resolveStartValue(goal, entries) {
  if (goal.startValue !== null && goal.startValue !== undefined) {
    return {
      value: goal.startValue,
      method: "manual",
      description: "Manuell festgelegter Ausgangswert."
    };
  }

  const valueKey = goal.type === GOAL_TYPES.BODY_FAT ? "bodyFatPercentage" : "weight";
  const measurements = normalizeMeasurements(entries, valueKey)
    .filter((entry) => differenceInCalendarDays(goal.startDate, entry.date) >= 0);

  if (!measurements.length) {
    return {
      value: null,
      method: "missing",
      description: "Kein Messwert am oder vor dem Startdatum vorhanden."
    };
  }

  if (goal.type === GOAL_TYPES.WEIGHT) {
    const recent = measurements.filter((entry) => differenceInCalendarDays(goal.startDate, entry.date) <= 6);
    if (recent.length >= 2) {
      const average = recent.reduce((sum, entry) => sum + entry.value, 0) / recent.length;
      return {
        value: round(average, 2),
        method: "7-day-average",
        description: "Ermittelt aus dem durchschnittlichen Gewicht der letzten 7 Tage."
      };
    }
  }

  const latest = measurements[measurements.length - 1];
  return {
    value: latest.value,
    method: "latest",
    description: "Ermittelt aus dem letzten verfügbaren Messwert am oder vor dem Startdatum."
  };
}

export function calculateLinearTrend(entries, { valueKey, startDate, endDate, goalType }) {
  const measurements = normalizeMeasurements(entries, valueKey)
    .filter((entry) => differenceInCalendarDays(entry.date, startDate) >= 0)
    .filter((entry) => differenceInCalendarDays(endDate, entry.date) >= 0);

  if (!measurements.length) {
    return {
      available: false,
      reason: "Keine Messwerte im Zeitraum.",
      measurementCount: 0,
      distinctDayCount: 0,
      spanDays: 0
    };
  }

  const spanDays = differenceInCalendarDays(measurements[measurements.length - 1].date, measurements[0].date);
  const minimumCount = goalType === GOAL_TYPES.BODY_FAT ? 2 : 3;
  const minimumSpan = goalType === GOAL_TYPES.BODY_FAT ? 7 : 3;

  if (measurements.length < minimumCount || spanDays < minimumSpan) {
    return {
      available: false,
      reason: goalType === GOAL_TYPES.BODY_FAT
        ? "Noch nicht genügend KFA-Messwerte für diesen Trend."
        : "Noch nicht genügend Gewichtswerte für diesen Trend.",
      measurementCount: measurements.length,
      distinctDayCount: measurements.length,
      spanDays
    };
  }

  const xValues = measurements.map((entry) => differenceInCalendarDays(entry.date, measurements[0].date));
  const yValues = measurements.map((entry) => entry.value);
  const meanX = xValues.reduce((sum, value) => sum + value, 0) / xValues.length;
  const meanY = yValues.reduce((sum, value) => sum + value, 0) / yValues.length;
  const numerator = xValues.reduce((sum, value, index) => sum + (value - meanX) * (yValues[index] - meanY), 0);
  const denominator = xValues.reduce((sum, value) => sum + (value - meanX) ** 2, 0);

  if (denominator === 0) {
    return {
      available: false,
      reason: "Trend nicht berechenbar, weil alle Messungen am gleichen Tag liegen.",
      measurementCount: measurements.length,
      distinctDayCount: measurements.length,
      spanDays
    };
  }

  const dailyRate = numerator / denominator;

  return {
    available: true,
    measurementCount: measurements.length,
    distinctDayCount: measurements.length,
    spanDays,
    dailyRate: round(dailyRate),
    weeklyRate: round(dailyRate * 7),
    confidence: calculateTrendConfidence(goalType, measurements.length, spanDays)
  };
}

export function calculateTrendConfidence(goalType, measurementCount, spanDays) {
  if (goalType === GOAL_TYPES.BODY_FAT) {
    if (measurementCount >= 4 && spanDays >= 21) {
      return "good";
    }
    if (measurementCount >= 3 && spanDays >= 14) {
      return "medium";
    }
    return "low";
  }

  const coverage = spanDays > 0 ? measurementCount / (spanDays + 1) : 0;
  if (measurementCount >= 10 && coverage >= 0.7) {
    return "good";
  }
  if (measurementCount >= 5 && coverage >= 0.35) {
    return "medium";
  }
  return "low";
}

export function calculatePaceRatio(goal, actualWeeklyRate) {
  const { requiredWeeklyRate } = calculateRequiredRate(goal);
  const directionFactor = getDirectionFactor(goal);
  const requiredProgressRate = requiredWeeklyRate * directionFactor;
  const actualProgressRate = actualWeeklyRate * directionFactor;

  if (requiredProgressRate === 0) {
    return null;
  }

  return round(actualProgressRate / requiredProgressRate);
}

export function evaluateTrendStatus(paceRatio) {
  if (paceRatio === null || paceRatio === undefined || Number.isNaN(paceRatio)) {
    return GOAL_STATUS.INSUFFICIENT_DATA;
  }
  if (paceRatio < 0) {
    return GOAL_STATUS.WRONG_DIRECTION;
  }
  if (paceRatio >= 1.15) {
    return GOAL_STATUS.AHEAD;
  }
  if (paceRatio >= 0.85) {
    return GOAL_STATUS.ON_TRACK;
  }
  if (paceRatio >= 0.6) {
    return GOAL_STATUS.SLIGHTLY_BEHIND;
  }
  return GOAL_STATUS.BEHIND;
}

export function calculateScheduleDeviation(goal, currentValue, today = new Date()) {
  const expectedValueToday = calculateExpectedValueToday(goal, today);
  if (currentValue === null || expectedValueToday === null) {
    return null;
  }

  const rawScheduleDeviation = currentValue - expectedValueToday;
  return round(rawScheduleDeviation * getDirectionFactor(goal), 2);
}

export function calculateProjectedValue(goal, currentValue, trendDailyRate, today = new Date()) {
  const remainingDays = differenceInCalendarDays(goal.targetDate, today);
  if (currentValue === null || trendDailyRate === null || trendDailyRate === undefined) {
    return null;
  }

  return round(currentValue + trendDailyRate * remainingDays, 2);
}

export function calculateProjectedGoalDate(goal, currentValue, trendDailyRate, today = new Date()) {
  if (currentValue === null) {
    return null;
  }

  const directionFactor = getDirectionFactor(goal);
  const remainingChange = goal.targetValue - currentValue;

  if (remainingChange * directionFactor <= 0) {
    return {
      reached: true,
      date: toIsoDate(toDate(today)),
      daysFromTarget: differenceInCalendarDays(today, goal.targetDate)
    };
  }

  if (!trendDailyRate || trendDailyRate * directionFactor <= 0) {
    return {
      reached: false,
      date: null,
      daysFromTarget: null,
      reason: "Mit dem aktuellen Trend ist kein sinnvolles Erreichungsdatum berechenbar."
    };
  }

  const daysUntilGoal = remainingChange / trendDailyRate;
  if (!Number.isFinite(daysUntilGoal) || daysUntilGoal < 0) {
    return {
      reached: false,
      date: null,
      daysFromTarget: null,
      reason: "Mit dem aktuellen Trend ist kein sinnvolles Erreichungsdatum berechenbar."
    };
  }

  const projectedDate = addDays(today, Math.ceil(daysUntilGoal));
  return {
    reached: false,
    date: toIsoDate(projectedDate),
    daysFromTarget: differenceInCalendarDays(projectedDate, goal.targetDate)
  };
}

export function calculateRemainingRequiredRate(goal, currentValue, today = new Date()) {
  const remainingDays = differenceInCalendarDays(goal.targetDate, today);
  if (currentValue === null || remainingDays <= 0) {
    return {
      remainingDays,
      remainingRequiredDailyRate: null,
      remainingRequiredWeeklyRate: null
    };
  }

  const remainingRequiredDailyRate = (goal.targetValue - currentValue) / remainingDays;

  return {
    remainingDays,
    remainingRequiredDailyRate: round(remainingRequiredDailyRate),
    remainingRequiredWeeklyRate: round(remainingRequiredDailyRate * 7)
  };
}

export function calculateGoalProgress(goal, currentValue, today = new Date()) {
  const durationDays = differenceInCalendarDays(goal.targetDate, goal.startDate);
  const elapsedDays = differenceInCalendarDays(today, goal.startDate);
  const totalChange = goal.targetValue - goal.startValue;
  const actualChange = currentValue === null ? null : currentValue - goal.startValue;
  const valueProgress = totalChange === 0 || actualChange === null ? null : actualChange / totalChange;
  const timeProgress = durationDays > 0 ? elapsedDays / durationDays : null;

  return {
    valueProgress: valueProgress === null ? null : round(clamp(valueProgress, 0, 1)),
    timeProgress: timeProgress === null ? null : round(clamp(timeProgress, 0, 1))
  };
}

export function evaluateOverallStatus(goal, analysis) {
  const today = analysis.today;
  if (differenceInCalendarDays(goal.startDate, today) > 0) {
    return GOAL_STATUS.NOT_STARTED;
  }

  const targetReached = analysis.currentValue !== null &&
    (goal.targetValue - analysis.currentValue) * getDirectionFactor(goal) <= 0;

  if (targetReached) {
    return GOAL_STATUS.COMPLETED;
  }

  if (differenceInCalendarDays(today, goal.targetDate) > 0) {
    return GOAL_STATUS.OVERDUE;
  }

  const primaryTrend = analysis.trends[analysis.primaryTrend];
  if (!primaryTrend || !primaryTrend.available) {
    return analysis.scheduleDeviation < 0 ? GOAL_STATUS.BEHIND : GOAL_STATUS.INSUFFICIENT_DATA;
  }

  if (analysis.scheduleDeviation !== null && analysis.scheduleDeviation < 0 && primaryTrend.status === GOAL_STATUS.ON_TRACK) {
    return GOAL_STATUS.SLIGHTLY_BEHIND;
  }

  return primaryTrend.status;
}

function analyzeTrendWindow(goal, entries, currentValue, today, windowDays) {
  const valueKey = goal.type === GOAL_TYPES.BODY_FAT ? "bodyFatPercentage" : "weight";
  const startDate = toIsoDate(addDays(today, -windowDays + 1));
  const trend = calculateLinearTrend(entries, {
    valueKey,
    startDate,
    endDate: toIsoDate(toDate(today)),
    goalType: goal.type
  });

  if (!trend.available) {
    return {
      ...trend,
      paceRatio: null,
      status: GOAL_STATUS.INSUFFICIENT_DATA,
      projectedValueAtTargetDate: null,
      projectedGoalDate: null
    };
  }

  const paceRatio = calculatePaceRatio(goal, trend.weeklyRate);
  return {
    ...trend,
    paceRatio,
    status: evaluateTrendStatus(paceRatio),
    projectedValueAtTargetDate: calculateProjectedValue(goal, currentValue, trend.dailyRate, today),
    projectedGoalDate: calculateProjectedGoalDate(goal, currentValue, trend.dailyRate, today)
  };
}

export function choosePrimaryTrend(trends) {
  if (trends.days14?.available) {
    return "days14";
  }
  if (trends.days30?.available) {
    return "days30";
  }
  if (trends.days7?.available) {
    return "days7";
  }
  return null;
}

export function analyzeGoal(goal, entries, todayInput = new Date()) {
  const today = toDate(todayInput);
  const current = calculateCurrentValue(goal, entries, today);
  const required = calculateRequiredRate(goal);
  const expectedValueToday = calculateExpectedValueToday(goal, today);
  const progress = calculateGoalProgress(goal, current.value, today);
  const scheduleDeviation = calculateScheduleDeviation(goal, current.value, today);
  const trendEntries = entries;
  const trends = TREND_WINDOWS.reduce((result, trendWindow) => {
    result[trendWindow.key] = analyzeTrendWindow(goal, trendEntries, current.value, today, trendWindow.days);
    return result;
  }, {});
  const primaryTrend = choosePrimaryTrend(trends);
  const remainingRequired = calculateRemainingRequiredRate(goal, current.value, today);
  const warnings = [];

  if (current.warning) {
    warnings.push(current.warning);
  }
  if (goal.type === GOAL_TYPES.WEIGHT && Math.abs(required.requiredWeeklyRate || 0) > 1) {
    warnings.push("Dieses Ziel erfordert eine Gewichtsveränderung von mehr als 1 kg pro Woche. Prüfe, ob der gewählte Zeitraum realistisch und für dich geeignet ist.");
  }
  if (goal.type === GOAL_TYPES.BODY_FAT) {
    warnings.push("Körperfettmessungen mit einer Zange sind Schätzwerte. Große kurzfristige Veränderungen können durch Messabweichungen entstehen.");
  }

  const analysis = {
    goalId: goal.id,
    goalType: goal.type,
    today: toIsoDate(today),
    currentValue: current.value,
    currentValueMethod: current.method,
    currentValueAgeDays: current.ageDays ?? null,
    durationDays: required.durationDays,
    elapsedDays: differenceInCalendarDays(today, goal.startDate),
    remainingDays: differenceInCalendarDays(goal.targetDate, today),
    requiredDailyRate: required.requiredDailyRate,
    requiredWeeklyRate: required.requiredWeeklyRate,
    expectedValueToday,
    scheduleDeviation,
    valueProgress: progress.valueProgress,
    timeProgress: progress.timeProgress,
    trends,
    primaryTrend,
    remainingRequiredDailyRate: remainingRequired.remainingRequiredDailyRate,
    remainingRequiredWeeklyRate: remainingRequired.remainingRequiredWeeklyRate,
    warnings
  };

  return {
    ...analysis,
    overallStatus: evaluateOverallStatus(goal, analysis)
  };
}
