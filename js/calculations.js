export function calculateJacksonPollock3({ age, chest, abdomen, thigh }) {
  const skinfoldSum = chest + abdomen + thigh;
  const bodyDensity =
    1.10938 -
    0.0008267 * skinfoldSum +
    0.0000016 * skinfoldSum ** 2 -
    0.0002574 * age;
  const bodyFatPercentage = 495 / bodyDensity - 450;

  return {
    skinfoldSum: Number(skinfoldSum.toFixed(1)),
    bodyDensity: Number(bodyDensity.toFixed(4)),
    bodyFatPercentage: Number(bodyFatPercentage.toFixed(1))
  };
}

export function getLatestEntry(entries, valueKey) {
  return [...entries]
    .filter((entry) => entry[valueKey] !== null && entry[valueKey] !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

export function calculateWeightChange(entries) {
  const weightEntries = [...entries]
    .filter((entry) => entry.weight !== null && entry.weight !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (weightEntries.length < 2) {
    return null;
  }

  return Number((weightEntries[0].weight - weightEntries[1].weight).toFixed(1));
}

export function calculateAverageWeightLast7Days(entries, today = new Date()) {
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const weights = entries
    .filter((entry) => entry.weight !== null && entry.weight !== undefined)
    .filter((entry) => {
      const date = new Date(`${entry.date}T00:00:00`);
      return date >= start && date <= end;
    })
    .map((entry) => entry.weight);

  if (!weights.length) {
    return null;
  }

  const sum = weights.reduce((total, weight) => total + weight, 0);
  return Number((sum / weights.length).toFixed(1));
}

export function calculateProgress(value, target) {
  if (!target || target <= 0 || value === null || value === undefined) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((value / target) * 100)));
}

export function filterEntriesByRange(entries, range, today = new Date()) {
  if (range === "all") {
    return [...entries];
  }

  const daysByRange = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "6m": 183,
    "1y": 365
  };
  const days = daysByRange[range] || 30;
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  return entries.filter((entry) => {
    const date = new Date(`${entry.date}T00:00:00`);
    return date >= start && date <= end;
  });
}

export function calculateMovingAverage(entries, valueKey, windowSize = 7) {
  const sortedEntries = [...entries]
    .filter((entry) => entry[valueKey] !== null && entry[valueKey] !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));

  return sortedEntries.map((entry, index) => {
    const windowEntries = sortedEntries.slice(Math.max(0, index - windowSize + 1), index + 1);
    const sum = windowEntries.reduce((total, item) => total + item[valueKey], 0);

    return {
      date: entry.date,
      value: Number((sum / windowEntries.length).toFixed(1))
    };
  });
}

export function calculateRolling7DayAverages(allDailyEntries = [], valueKey = "weight", targetDates = null) {
  const validEntries = [...allDailyEntries]
    .filter((entry) => entry[valueKey] !== null && entry[valueKey] !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!validEntries.length) return [];

  const datesToProcess = targetDates && targetDates.length > 0
    ? [...targetDates].sort()
    : validEntries.map((e) => e.date);

  return datesToProcess.map((dateStr) => {
    const targetDate = new Date(`${dateStr}T00:00:00`);
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 6);

    const windowEntries = validEntries.filter((item) => {
      const itemDate = new Date(`${item.date}T00:00:00`);
      return itemDate >= startDate && itemDate <= targetDate;
    });

    if (!windowEntries.length) {
      return {
        date: dateStr,
        value: null,
        count: 0
      };
    }

    const sum = windowEntries.reduce((acc, item) => acc + item[valueKey], 0);
    const precision = valueKey === "proteinPerKg" ? 2 : 1;
    const avg = Number((sum / windowEntries.length).toFixed(precision));

    return {
      date: dateStr,
      value: avg,
      count: windowEntries.length
    };
  });
}

export function calculateTrendSummary(dailyEntries, bodyFatEntries, circumferenceEntries = []) {
  const calorieEntries = dailyEntries.filter((entry) => entry.calories !== null && entry.calories !== undefined);
  const proteinEntries = dailyEntries.filter((entry) => entry.protein !== null && entry.protein !== undefined);
  const sleepEntries = dailyEntries.filter((entry) => entry.sleepHours !== null && entry.sleepHours !== undefined);
  const weightEntries = dailyEntries
    .filter((entry) => entry.weight !== null && entry.weight !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));
  const bodyFatTrendEntries = bodyFatEntries
    .filter((entry) => entry.bodyFatPercentage !== null && entry.bodyFatPercentage !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));
  const armEntries = circumferenceEntries
    .filter((entry) => entry.arm !== null && entry.arm !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));
  const legEntries = circumferenceEntries
    .filter((entry) => entry.leg !== null && entry.leg !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));

  const proteinPerKgEntries = dailyEntries.filter((entry) => entry.proteinPerKg !== null && entry.proteinPerKg !== undefined);

  const average = (entries, key) => {
    if (!entries.length) {
      return null;
    }

    const sum = entries.reduce((total, entry) => total + entry[key], 0);
    return Number((sum / entries.length).toFixed(1));
  };

  const change = (entries, key) => {
    if (entries.length < 2) {
      return null;
    }

    return Number((entries[entries.length - 1][key] - entries[0][key]).toFixed(1));
  };

  return {
    averageCalories: average(calorieEntries, "calories"),
    averageProtein: average(proteinEntries, "protein"),
    averageProteinPerKg: proteinPerKgEntries.length
      ? Number((proteinPerKgEntries.reduce((total, e) => total + e.proteinPerKg, 0) / proteinPerKgEntries.length).toFixed(2))
      : null,
    averageSleep: average(sleepEntries, "sleepHours"),
    weightChange: change(weightEntries, "weight"),
    sleepChange: change(sleepEntries.sort((a, b) => a.date.localeCompare(b.date)), "sleepHours"),
    bodyFatChange: change(bodyFatTrendEntries, "bodyFatPercentage"),
    armChange: change(armEntries, "arm"),
    legChange: change(legEntries, "leg"),
    lowestWeight: weightEntries.length ? Math.min(...weightEntries.map((entry) => entry.weight)) : null,
    highestWeight: weightEntries.length ? Math.max(...weightEntries.map((entry) => entry.weight)) : null,
    trackedDays: new Set(dailyEntries.map((entry) => entry.date)).size
  };
}

export function calculateAdaptiveTdee(entries, windowDays = 14, today = new Date()) {
  const windowEntries = filterEntriesByRange(entries, `${windowDays}d`, today);
  const validWeights = windowEntries
    .filter((e) => e.weight !== null && e.weight !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));
  const validCalories = windowEntries
    .filter((e) => e.calories !== null && e.calories !== undefined);

  if (validWeights.length < 5 || validCalories.length < 5) {
    return {
      hasSufficientData: false,
      trackedDaysWithCalories: validCalories.length,
      trackedDaysWithWeight: validWeights.length,
      requiredDays: 5,
      tdee: null,
      averageCalories: validCalories.length ? Math.round(validCalories.reduce((s, e) => s + e.calories, 0) / validCalories.length) : null,
      dailyDeficit: null,
      weeklyWeightChangeRate: null,
      totalWeightDelta: null
    };
  }

  const avgCalories = validCalories.reduce((s, e) => s + e.calories, 0) / validCalories.length;
  const startChunk = validWeights.slice(0, Math.min(3, Math.ceil(validWeights.length / 3)));
  const endChunk = validWeights.slice(Math.max(0, validWeights.length - Math.min(3, Math.ceil(validWeights.length / 3))));
  
  const startWeightAvg = startChunk.reduce((s, e) => s + e.weight, 0) / startChunk.length;
  const endWeightAvg = endChunk.reduce((s, e) => s + e.weight, 0) / endChunk.length;
  
  const firstDate = new Date(`${validWeights[0].date}T00:00:00`);
  const lastDate = new Date(`${validWeights[validWeights.length - 1].date}T00:00:00`);
  const daySpan = Math.max(1, Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24)));
  
  const weightDelta = endWeightAvg - startWeightAvg;
  const dailySurplusOrDeficit = (weightDelta * 7700) / Math.max(7, daySpan);
  const estimatedTdee = Math.round(avgCalories - dailySurplusOrDeficit);
  const weeklyChangeRate = Number(((weightDelta / Math.max(7, daySpan)) * 7).toFixed(2));

  return {
    hasSufficientData: true,
    trackedDaysWithCalories: validCalories.length,
    trackedDaysWithWeight: validWeights.length,
    requiredDays: 5,
    tdee: Math.max(500, Math.min(8000, estimatedTdee)),
    averageCalories: Math.round(avgCalories),
    dailyDeficit: Math.round(-dailySurplusOrDeficit),
    weeklyWeightChangeRate: weeklyChangeRate,
    totalWeightDelta: Number(weightDelta.toFixed(2)),
    windowDays: daySpan
  };
}
