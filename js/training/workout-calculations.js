import { WORKOUT_STATUS, WORKOUT_TYPES } from "./training-constants.js";

export function calculateSetVolume(reps, weight, completed = true, setType = "normal") {
  if (!completed || setType === "warmup" || !Number.isFinite(Number(reps)) || !Number.isFinite(Number(weight))) return 0;
  return Math.max(0, Number(reps)) * Math.max(0, Number(weight));
}
export function calculateExerciseVolume(sets = []) { return sets.reduce((sum, set) => sum + calculateSetVolume(set.actualReps, set.actualWeight, set.completed, set.setType), 0); }
export function calculateWorkoutVolume(exercises = []) { return exercises.reduce((sum, exercise) => sum + calculateExerciseVolume(exercise.sets), 0); }
export function calculateCompletedSetCount(exercises = []) { return exercises.reduce((sum, exercise) => sum + (exercise.sets || []).filter((set) => set.completed && set.setType !== "warmup").length, 0); }
export function calculateCompletedWarmupSetCount(exercises = []) { return exercises.reduce((sum, exercise) => sum + (exercise.sets || []).filter((set) => set.completed && set.setType === "warmup").length, 0); }
export function calculateTotalReps(exercises = []) { return exercises.reduce((sum, exercise) => sum + (exercise.sets || []).filter((set) => set.completed && set.setType !== "warmup").reduce((setSum, set) => setSum + (Number(set.actualReps) || 0), 0), 0); }
export function calculateWorkoutDuration(startedAt, completedAt) { return Math.max(0, Math.round((new Date(completedAt) - new Date(startedAt)) / 1000)) || 0; }
export function calculateStretchPlannedDuration(exercises = []) { return exercises.reduce((sum, item) => sum + (Array.isArray(item.sets) ? item.sets.length : Number(item.sets) || 0) * (Number(item.durationSeconds) || 0), 0); }
export function calculateWeeklyWorkoutCount(sessions, referenceDate = new Date()) {
  const end = new Date(referenceDate); end.setHours(23,59,59,999); const start = new Date(end); start.setDate(end.getDate() - 6); start.setHours(0,0,0,0);
  return sessions.filter((s) => s.status === WORKOUT_STATUS.COMPLETED && new Date(`${s.date}T12:00:00`) >= start && new Date(`${s.date}T12:00:00`) <= end).length;
}
export function calculateMonthlyWorkoutCount(sessions, referenceDate = new Date()) {
  const prefix = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth()+1).padStart(2,"0")}`;
  return sessions.filter((s) => s.status === WORKOUT_STATUS.COMPLETED && s.date?.startsWith(prefix)).length;
}
export function summarizeWorkout(session) {
  const base = { exerciseCount: session.exercises?.length || 0, durationSeconds: session.durationSeconds || 0 };
  if (session.workoutType === WORKOUT_TYPES.STRENGTH) return { ...base, completedSets: calculateCompletedSetCount(session.exercises), completedWarmupSets: calculateCompletedWarmupSetCount(session.exercises), totalReps: calculateTotalReps(session.exercises), totalVolume: calculateWorkoutVolume(session.exercises) };
  if (session.workoutType === WORKOUT_TYPES.STRETCHING) return { ...base, completedSets: calculateCompletedSetCount(session.exercises), plannedDurationSeconds: calculateStretchPlannedDuration(session.exercises) };
  return base;
}
export function calculateWorkoutStatistics(sessions = [], referenceDate = new Date()) {
  const completed = sessions.filter((s) => s.status === WORKOUT_STATUS.COMPLETED);
  const totalDuration = completed.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
  const strength = completed.filter((s) => s.workoutType === WORKOUT_TYPES.STRENGTH);
  const stretching = completed.filter((s) => s.workoutType === WORKOUT_TYPES.STRETCHING);
  return { weeklyCount: calculateWeeklyWorkoutCount(completed, referenceDate), monthlyCount: calculateMonthlyWorkoutCount(completed, referenceDate), totalDuration, averageDuration: completed.length ? Math.round(totalDuration / completed.length) : 0, strengthCount: strength.length, stretchingCount: stretching.length, totalSets: strength.reduce((sum,s) => sum + calculateCompletedSetCount(s.exercises),0), totalReps: strength.reduce((sum,s) => sum + calculateTotalReps(s.exercises),0), totalVolume: strength.reduce((sum,s) => sum + calculateWorkoutVolume(s.exercises),0) };
}

export const BODYWEIGHT_RATIOS = {
  "push-up": 0.65,
  "close-grip-push-up": 0.65,
  "wide-push-up": 0.65,
  "chest-dip": 0.90,
  "dip": 0.90,
  "triceps-dip": 0.90,
  "pull-up": 1.00,
  "chin-up": 1.00,
  "muscle-up": 1.00,
  "inverted-row": 0.60,
  "trx-row": 0.60,
  "bodyweight-squat": 0.75,
  "jump-squat": 0.75,
  "handstand-push-up": 0.95,
  "pike-push-up": 0.80
};

export function getBodyweightRatio(exerciseId, exerciseName = "") {
  if (exerciseId && BODYWEIGHT_RATIOS[exerciseId] !== undefined) {
    return BODYWEIGHT_RATIOS[exerciseId];
  }
  const norm = String(exerciseName || "").toLowerCase();
  if (norm.includes("liegestütz") || norm.includes("push-up") || norm.includes("pushup")) return 0.65;
  if (norm.includes("klimmzug") || norm.includes("pull-up") || norm.includes("pullup") || norm.includes("chin-up") || norm.includes("chinup")) return 1.0;
  if (norm.includes("dip")) return 0.90;
  if (norm.includes("inverted row") || norm.includes("trx")) return 0.60;
  if (norm.includes("bodyweight squat") || norm.includes("kniebeuge ohne gewicht")) return 0.75;
  return 0.0;
}

export function calculateEffectiveWeight(addedWeight, reps, bodyweight = null, bodyweightRatio = 0) {
  const added = Number(addedWeight) || 0;
  if (bodyweightRatio > 0 && bodyweight != null && bodyweight > 0) {
    return added + (Number(bodyweight) * bodyweightRatio);
  }
  return added;
}

export function estimate1RM(weight, reps, bodyweight = null, bodyweightRatio = 0, rir = 0) {
  let w = Number(weight);
  const r = Number(reps);
  const rirVal = Math.max(0, Number(rir) || 0);
  if (!Number.isFinite(r) || r <= 0) return 0;

  if (bodyweightRatio > 0 && bodyweight != null && bodyweight > 0) {
    w = (Number.isFinite(w) ? w : 0) + (Number(bodyweight) * bodyweightRatio);
  }

  if (!Number.isFinite(w) || w <= 0) return 0;
  const effectiveReps = r + rirVal;
  if (effectiveReps === 1) return Math.round(w * 10) / 10;
  return Math.round((w * (1 + effectiveReps / 30)) * 10) / 10;
}

export function calculateExerciseStats(exercise, sessionBodyweight = null) {
  const bwRatio = getBodyweightRatio(exercise.exerciseId, exercise.exerciseNameSnapshot);
  const completedSets = (exercise.sets || []).filter((s) => s.completed && Number(s.actualReps) > 0);
  const workSets = completedSets.filter((s) => s.setType !== "warmup");
  const warmupSets = completedSets.filter((s) => s.setType === "warmup");

  const effectiveSetsForMetrics = workSets.length > 0 ? workSets : completedSets;
  const totalSets = workSets.length;
  const warmupSetsCount = warmupSets.length;
  const totalReps = workSets.reduce((sum, s) => sum + (Number(s.actualReps) || 0), 0);
  const maxReps = effectiveSetsForMetrics.reduce((max, s) => Math.max(max, Number(s.actualReps) || 0), 0);
  
  const totalVolume = workSets.reduce((sum, s) => {
    const effW = calculateEffectiveWeight(s.actualWeight, s.actualReps, sessionBodyweight, bwRatio);
    return sum + (effW * Number(s.actualReps));
  }, 0);

  const maxWeight = effectiveSetsForMetrics.reduce((max, s) => Math.max(max, Number(s.actualWeight) || 0), 0);
  const best1RM = effectiveSetsForMetrics.reduce((max, s) => {
    return Math.max(max, estimate1RM(s.actualWeight, s.actualReps, sessionBodyweight, bwRatio, s.actualRir));
  }, 0);

  const topSet = effectiveSetsForMetrics.reduce((best, s) => {
    if (!best) return s;
    const s1RM = estimate1RM(s.actualWeight, s.actualReps, sessionBodyweight, bwRatio, s.actualRir);
    const best1RMVal = estimate1RM(best.actualWeight, best.actualReps, sessionBodyweight, bwRatio, best.actualRir);
    return s1RM > best1RMVal ? s : (s1RM === best1RMVal && (Number(s.actualReps) || 0) > (Number(best.actualReps) || 0) ? s : best);
  }, null);

  return {
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseNameSnapshot || "Übung",
    bodyweightRatio: bwRatio,
    isBodyweightExercise: bwRatio > 0,
    totalSets,
    warmupSetsCount,
    totalReps,
    maxReps,
    totalVolume: Math.round(totalVolume * 10) / 10,
    maxWeight: Math.round(maxWeight * 10) / 10,
    best1RM: Math.round(best1RM * 10) / 10,
    topSet: topSet ? { reps: Number(topSet.actualReps) || 0, weight: Number(topSet.actualWeight) || 0, rir: topSet.actualRir != null ? Number(topSet.actualRir) : null, setType: topSet.setType || "normal" } : null,
    sets: completedSets.map((s) => ({ reps: Number(s.actualReps) || 0, weight: Number(s.actualWeight) || 0, rir: s.actualRir != null ? Number(s.actualRir) : null, setType: s.setType || "normal" }))
  };
}

export function detectWorkoutPRs(currentSession, allHistoricalSessions = []) {
  if (currentSession.workoutType !== WORKOUT_TYPES.STRENGTH || !currentSession.exercises) return [];

  const priorSessions = allHistoricalSessions.filter(
    (s) => s.id !== currentSession.id && s.status === WORKOUT_STATUS.COMPLETED && s.workoutType === WORKOUT_TYPES.STRENGTH
  );

  const prs = [];

  currentSession.exercises.forEach((exercise) => {
    const currentStats = calculateExerciseStats(exercise);
    if (currentStats.totalSets === 0 || currentStats.maxWeight === 0) return;

    const historicalSets = priorSessions
      .flatMap((s) => s.exercises || [])
      .filter((ex) => ex.exerciseId === exercise.exerciseId)
      .flatMap((ex) => (ex.sets || []).filter((s) => s.completed && Number(s.actualReps) > 0));

    if (historicalSets.length === 0) {
      prs.push({
        exerciseId: exercise.exerciseId,
        exerciseName: currentStats.exerciseName,
        type: "firstTime",
        label: "Erster Eintrag",
        value: currentStats.maxWeight,
        unit: "kg",
        reps: currentStats.topSet?.reps || 0,
        weight: currentStats.topSet?.weight || 0,
        formatted: `${currentStats.maxWeight} kg (${currentStats.topSet?.reps || 0} Wdh.)`
      });
      return;
    }

    const prevMaxWeight = historicalSets.reduce((max, s) => Math.max(max, Number(s.actualWeight) || 0), 0);
    const prevBest1RM = historicalSets.reduce((max, s) => Math.max(max, estimate1RM(s.actualWeight, s.actualReps)), 0);

    if (currentStats.maxWeight > prevMaxWeight) {
      const diff = Math.round((currentStats.maxWeight - prevMaxWeight) * 10) / 10;
      prs.push({
        exerciseId: exercise.exerciseId,
        exerciseName: currentStats.exerciseName,
        type: "maxWeight",
        label: "Maximalgewicht PR",
        value: currentStats.maxWeight,
        previousValue: prevMaxWeight,
        diff,
        unit: "kg",
        formatted: `${currentStats.maxWeight} kg (+${diff} kg)`
      });
    } else if (currentStats.best1RM > prevBest1RM && prevBest1RM > 0) {
      const diff = Math.round((currentStats.best1RM - prevBest1RM) * 10) / 10;
      prs.push({
        exerciseId: exercise.exerciseId,
        exerciseName: currentStats.exerciseName,
        type: "estimated1RM",
        label: "Geschätztes 1RM PR",
        value: currentStats.best1RM,
        previousValue: prevBest1RM,
        diff,
        unit: "kg",
        formatted: `~${currentStats.best1RM} kg 1RM (+${diff} kg)`
      });
    }
  });

  return prs;
}

export function compareWorkoutWithPrevious(currentSession, allHistoricalSessions = []) {
  const priorSessions = (allHistoricalSessions || [])
    .filter((s) => s && s.id !== currentSession.id && s.status === WORKOUT_STATUS.COMPLETED && s.workoutType === currentSession.workoutType)
    .sort((a, b) => String(b.completedAt || b.date || "").localeCompare(String(a.completedAt || a.date || "")));

  const prevSession = (currentSession.planId ? priorSessions.find((s) => s.planId === currentSession.planId) : null) || priorSessions[0] || null;

  const currentSummary = summarizeWorkout(currentSession);
  const prevSummary = prevSession ? summarizeWorkout(prevSession) : null;

  const calcDiff = (curr, prev) => {
    if (prev === null || prev === undefined || prev === 0) return { diff: null, percent: null };
    const diff = Math.round((curr - prev) * 10) / 10;
    const percent = Math.round(((curr - prev) / prev) * 1000) / 10;
    return { diff, percent };
  };

  const totalComparison = {
    hasPrevious: Boolean(prevSession),
    previousDate: prevSession?.date || null,
    previousPlanName: prevSession?.planNameSnapshot || null,
    volume: {
      current: currentSummary.totalVolume || 0,
      previous: prevSummary?.totalVolume || 0,
      ...calcDiff(currentSummary.totalVolume || 0, prevSummary?.totalVolume || 0)
    },
    reps: {
      current: currentSummary.totalReps || 0,
      previous: prevSummary?.totalReps || 0,
      ...calcDiff(currentSummary.totalReps || 0, prevSummary?.totalReps || 0)
    },
    sets: {
      current: currentSummary.completedSets || 0,
      previous: prevSummary?.completedSets || 0,
      ...calcDiff(currentSummary.completedSets || 0, prevSummary?.completedSets || 0)
    }
  };

  const exerciseComparisons = (currentSession.exercises || []).map((exercise) => {
    const currentStats = calculateExerciseStats(exercise);
    const prevExercise = prevSession?.exercises?.find((x) => x.exerciseId === exercise.exerciseId) || null;
    const prevStats = prevExercise ? calculateExerciseStats(prevExercise) : null;

    return {
      exerciseId: exercise.exerciseId,
      exerciseName: currentStats.exerciseName,
      current: currentStats,
      previous: prevStats,
      hasPrevious: Boolean(prevStats && prevStats.totalSets > 0),
      volumeDiff: calcDiff(currentStats.totalVolume, prevStats?.totalVolume || 0),
      weightDiff: calcDiff(currentStats.maxWeight, prevStats?.maxWeight || 0),
      repsDiff: calcDiff(currentStats.totalReps, prevStats?.totalReps || 0)
    };
  });

  return {
    hasPrevious: Boolean(prevSession),
    previousSession: prevSession,
    totalComparison,
    exerciseComparisons
  };
}

export function getTrackedStrengthExercises(sessions = []) {
  const completed = sessions.filter((s) => s.status === WORKOUT_STATUS.COMPLETED && s.workoutType === WORKOUT_TYPES.STRENGTH);
  const exerciseMap = new Map();

  completed.forEach((session) => {
    (session.exercises || []).forEach((exercise) => {
      const id = exercise.exerciseId || exercise.exerciseNameSnapshot;
      const name = exercise.exerciseNameSnapshot || "Übung";
      const stats = calculateExerciseStats(exercise);
      if (stats.totalSets === 0) return;

      if (!exerciseMap.has(id)) {
        exerciseMap.set(id, {
          id,
          name,
          count: 0,
          lastTrainedDate: session.date,
          allTime1RM: 0,
          allTimeMaxWeight: 0,
          totalVolume: 0
        });
      }

      const item = exerciseMap.get(id);
      item.count += 1;
      if (session.date > item.lastTrainedDate) item.lastTrainedDate = session.date;
      item.allTime1RM = Math.max(item.allTime1RM, stats.best1RM);
      item.allTimeMaxWeight = Math.max(item.allTimeMaxWeight, stats.maxWeight);
      item.totalVolume += stats.totalVolume;
    });
  });

  return [...exerciseMap.values()].sort((a, b) => b.count - a.count || String(b.lastTrainedDate || "").localeCompare(String(a.lastTrainedDate || "")));
}

export function extractExerciseProgression(sessions = [], exerciseIdentifier, dailyEntries = []) {
  if (!exerciseIdentifier) return null;

  const weightEntries = (dailyEntries || [])
    .filter((e) => e && e.weight != null && e.weight > 0)
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

  const getWeightForDate = (date) => {
    if (!weightEntries.length) return 80;
    const exact = weightEntries.find((e) => e.date === date);
    if (exact) return exact.weight;
    const priors = weightEntries.filter((e) => e.date <= date);
    if (priors.length) return priors[priors.length - 1].weight;
    return weightEntries[0].weight;
  };

  const completed = (sessions || [])
    .filter((s) => s && s.status === WORKOUT_STATUS.COMPLETED && s.workoutType === WORKOUT_TYPES.STRENGTH)
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

  const dataPoints = [];
  let exerciseName = "";
  let isBodyweight = false;
  let bodyweightRatio = 0;

  completed.forEach((session) => {
    const foundExercise = (session.exercises || []).find(
      (e) => e.exerciseId === exerciseIdentifier || e.exerciseNameSnapshot === exerciseIdentifier
    );
    if (!foundExercise) return;

    const sessionBw = getWeightForDate(session.date);
    const stats = calculateExerciseStats(foundExercise, sessionBw);
    if (stats.totalSets === 0) return;

    exerciseName = stats.exerciseName;
    isBodyweight = stats.isBodyweightExercise;
    bodyweightRatio = stats.bodyweightRatio;

    dataPoints.push({
      date: session.date,
      sessionId: session.id,
      planName: session.planNameSnapshot || "Training",
      estimated1RM: stats.best1RM,
      topWeight: stats.maxWeight,
      topReps: stats.topSet?.reps || stats.maxReps || 0,
      topRir: stats.topSet?.rir ?? null,
      totalVolume: stats.totalVolume,
      totalReps: stats.totalReps,
      completedSets: stats.totalSets,
      sessionBodyweight: sessionBw,
      sets: (foundExercise.sets || []).filter((s) => s.completed)
    });
  });

  if (!dataPoints.length) return null;

  const firstPoint = dataPoints[0];
  const lastPoint = dataPoints[dataPoints.length - 1];
  const allTime1RM = Math.max(...dataPoints.map((d) => d.estimated1RM));
  const allTimeMaxWeight = Math.max(...dataPoints.map((d) => d.topWeight));
  const allTimeMaxReps = Math.max(...dataPoints.map((d) => d.topReps));
  const totalLifetimeVolume = dataPoints.reduce((sum, d) => sum + d.totalVolume, 0);

  const calcProg = (latest, initial) => {
    if (!initial || initial <= 0) return 0;
    return Math.round(((latest - initial) / initial) * 1000) / 10;
  };

  return {
    exerciseIdentifier,
    exerciseName,
    isBodyweight,
    bodyweightRatio,
    dataPoints,
    firstLoggedDate: firstPoint.date,
    lastLoggedDate: lastPoint.date,
    totalSessionsTracked: dataPoints.length,
    latest1RM: lastPoint.estimated1RM,
    latestTopWeight: lastPoint.topWeight,
    latestTopReps: lastPoint.topReps,
    allTime1RM,
    allTimeMaxWeight,
    allTimeMaxReps,
    totalLifetimeVolume,
    progress1RMPercent: calcProg(lastPoint.estimated1RM, firstPoint.estimated1RM),
    progressWeightPercent: calcProg(lastPoint.topWeight, firstPoint.topWeight),
    progressVolumePercent: calcProg(lastPoint.totalVolume, firstPoint.totalVolume),
    progressRepsPercent: calcProg(lastPoint.topReps, firstPoint.topReps)
  };
}

export function getLastPerformanceForExercise(sessions = [], exerciseIdentifier, currentSessionId = null) {
  if (!exerciseIdentifier) return null;

  const completed = (sessions || [])
    .filter((s) => s && s.status === WORKOUT_STATUS.COMPLETED && s.workoutType === WORKOUT_TYPES.STRENGTH && s.id !== currentSessionId)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  for (const session of completed) {
    const foundExercise = (session.exercises || []).find(
      (e) => e.exerciseId === exerciseIdentifier || e.exerciseNameSnapshot === exerciseIdentifier
    );
    if (!foundExercise) continue;

    const completedSets = (foundExercise.sets || []).filter((s) => s.completed && (Number(s.actualReps) > 0 || Number(s.actualWeight) > 0));
    if (completedSets.length === 0) continue;

    return {
      sessionDate: session.date,
      planName: session.planNameSnapshot || "Training",
      sets: completedSets.map((s, idx) => ({
        setIndex: idx,
        setType: s.setType || "normal",
        actualReps: Number(s.actualReps) || 0,
        actualWeight: Number(s.actualWeight) || 0,
        actualRir: s.actualRir != null ? Number(s.actualRir) : null
      }))
    };
  }

  return null;
}
