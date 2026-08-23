export const STANDARD_BAR_WEIGHTS = [
  { value: 20, label: "Olympia-Stange (20 kg)" },
  { value: 15, label: "Frauenstange (15 kg)" },
  { value: 10, label: "Technikstange (10 kg)" },
  { value: 7.5, label: "SZ-Stange (7.5 kg)" }
];

export const DEFAULT_AVAILABLE_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];

export const PLATE_COLORS = {
  25: "#ef4444", // Rot
  20: "#3b82f6", // Blau
  15: "#eab308", // Gelb
  10: "#10b981", // Grün
  5: "#f8fafc",  // Weiß
  2.5: "#64748b", // Grau/Schwarz
  1.25: "#a855f7", // Violett
  0.5: "#06b6d4"  // Cyan
};

export function roundToNearest(value, step = 2.5) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value / step) * step;
}

export function calculatePlates(targetWeight, barWeight = 20, availablePlates = DEFAULT_AVAILABLE_PLATES) {
  const target = Math.max(0, Number(targetWeight) || 0);
  const bar = Math.max(0, Number(barWeight) || 0);

  if (target <= bar) {
    return {
      targetWeight: target,
      barWeight: bar,
      weightPerSide: 0,
      platesPerSide: [],
      totalAchieved: bar,
      remainder: 0,
      isExact: true
    };
  }

  const sortedPlates = [...availablePlates].filter((p) => p > 0).sort((a, b) => b - a);
  let remainingWeightPerSide = (target - bar) / 2;
  const platesPerSide = [];

  for (const plate of sortedPlates) {
    if (remainingWeightPerSide <= 0) break;
    const count = Math.floor(remainingWeightPerSide / plate);
    if (count > 0) {
      platesPerSide.push({ plate, count });
      remainingWeightPerSide = Number((remainingWeightPerSide - (count * plate)).toFixed(4));
    }
  }

  const totalPlatesWeightPerSide = platesPerSide.reduce((sum, p) => sum + (p.plate * p.count), 0);
  const totalAchieved = bar + (totalPlatesWeightPerSide * 2);
  const remainder = Number((target - totalAchieved).toFixed(2));

  return {
    targetWeight: target,
    barWeight: bar,
    weightPerSide: totalPlatesWeightPerSide,
    platesPerSide,
    totalAchieved,
    remainder,
    isExact: Math.abs(remainder) < 0.01
  };
}

export function calculateWarmupSets(workWeight, barWeight = 20) {
  const target = Number(workWeight) || 0;
  const bar = Number(barWeight) || 20;

  if (target <= bar + 5) {
    return [
      { plannedReps: 10, plannedWeight: bar, targetRir: null, setType: "warmup" }
    ];
  }

  const sets = [];
  // 1. Nur die Stange
  sets.push({ plannedReps: 10, plannedWeight: bar, targetRir: null, setType: "warmup" });

  // 2. 50%
  const w50 = Math.max(bar, roundToNearest(target * 0.5, 2.5));
  if (w50 > bar && w50 < target - 10) {
    sets.push({ plannedReps: 5, plannedWeight: w50, targetRir: null, setType: "warmup" });
  }

  // 3. 70%
  const w70 = Math.max(w50 + 2.5, roundToNearest(target * 0.7, 2.5));
  if (w70 > w50 && w70 < target - 5) {
    sets.push({ plannedReps: 3, plannedWeight: w70, targetRir: null, setType: "warmup" });
  }

  // 4. 85-90%
  const w90 = Math.max(w70 + 2.5, roundToNearest(target * 0.88, 2.5));
  if (w90 > w70 && w90 < target) {
    sets.push({ plannedReps: 1, plannedWeight: w90, targetRir: null, setType: "warmup" });
  }

  return sets;
}