import { calculateJacksonPollock3 } from "./calculations.js";
import { getBodyFatEntries, getDailyEntries, getGoals, putBodyFatEntries, putDailyEntries, putGoals } from "./database.js";

function dateDaysAgo(daysAgo) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function round(value, digits = 1) {
  return Number(value.toFixed(digits));
}

function createDailyEntries() {
  return Array.from({ length: 90 }, (_, index) => {
    const daysAgo = 89 - index;
    const weeklyWave = Math.sin(index / 4) * 0.35;
    const weekendLift = index % 7 >= 5 ? 180 : 0;
    const weight = 94.2 - index * 0.055 + weeklyWave;

    return {
      id: `seed-daily-${index + 1}`,
      date: dateDaysAgo(daysAgo),
      weight: round(weight),
      calories: Math.round(2240 + Math.sin(index / 5) * 170 + weekendLift),
      protein: Math.round(166 + Math.cos(index / 6) * 12),
      note: index % 18 === 0 ? "Seed-Daten: Vergleichstag mit mehr Bewegung." : "",
      createdAt: `${dateDaysAgo(daysAgo)}T10:00:00.000Z`,
      updatedAt: `${dateDaysAgo(daysAgo)}T10:00:00.000Z`
    };
  });
}

function createBodyFatEntries() {
  return Array.from({ length: 14 }, (_, index) => {
    const daysAgo = 91 - index * 7;
    const chest = round(18.5 - index * 0.32 + Math.sin(index) * 0.2);
    const abdomen = round(31.5 - index * 0.58 + Math.cos(index / 2) * 0.35);
    const thigh = round(22.4 - index * 0.28 + Math.sin(index / 3) * 0.2);
    const base = {
      id: `seed-body-fat-${index + 1}`,
      date: dateDaysAgo(daysAgo),
      age: 31,
      chest,
      abdomen,
      thigh,
      createdAt: `${dateDaysAgo(daysAgo)}T10:30:00.000Z`,
      updatedAt: `${dateDaysAgo(daysAgo)}T10:30:00.000Z`
    };

    return {
      ...base,
      ...calculateJacksonPollock3(base)
    };
  });
}

function createGoals() {
  return [
    {
      id: "seed-goal-weight-active",
      type: "weight",
      startDate: dateDaysAgo(89),
      targetDate: dateDaysAgo(-35),
      startValue: 94.2,
      targetValue: 87.5,
      direction: "decrease",
      inputMode: "targetValue",
      requestedChange: null,
      requestedWeeks: null,
      status: "active",
      createdAt: `${dateDaysAgo(89)}T11:00:00.000Z`,
      updatedAt: `${dateDaysAgo(89)}T11:00:00.000Z`,
      completedAt: null
    },
    {
      id: "seed-goal-body-fat-active",
      type: "bodyFat",
      startDate: dateDaysAgo(89),
      targetDate: dateDaysAgo(-56),
      startValue: 24.8,
      targetValue: 19.5,
      direction: "decrease",
      inputMode: "targetValue",
      requestedChange: null,
      requestedWeeks: null,
      status: "active",
      createdAt: `${dateDaysAgo(89)}T11:05:00.000Z`,
      updatedAt: `${dateDaysAgo(89)}T11:05:00.000Z`,
      completedAt: null
    },
    {
      id: "seed-goal-weight-completed",
      type: "weight",
      startDate: dateDaysAgo(150),
      targetDate: dateDaysAgo(92),
      startValue: 97,
      targetValue: 94.5,
      direction: "decrease",
      inputMode: "targetValue",
      requestedChange: null,
      requestedWeeks: null,
      status: "completed",
      createdAt: `${dateDaysAgo(150)}T11:10:00.000Z`,
      updatedAt: `${dateDaysAgo(92)}T11:10:00.000Z`,
      completedAt: `${dateDaysAgo(92)}T11:10:00.000Z`
    }
  ];
}

export async function seedDemoData() {
  const [existingDailyEntries, existingBodyFatEntries, existingGoals] = await Promise.all([
    getDailyEntries(),
    getBodyFatEntries(),
    getGoals()
  ]);
  const dailyEntries = createDailyEntries().filter((entry) => !existingDailyEntries.some((existing) => existing.id === entry.id || existing.date === entry.date));
  const bodyFatEntries = createBodyFatEntries().filter((entry) => !existingBodyFatEntries.some((existing) => existing.id === entry.id));
  const goals = createGoals().filter((goal) => !existingGoals.some((existing) => existing.id === goal.id));

  await putDailyEntries(dailyEntries);
  await putBodyFatEntries(bodyFatEntries);
  await putGoals(goals);

  return {
    dailyEntries: dailyEntries.length,
    bodyFatEntries: bodyFatEntries.length,
    goals: goals.length
  };
}
