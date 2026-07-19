import { WORKOUT_STATUS, WORKOUT_TYPES } from "./training-constants.js";

export function calculateSetVolume(reps, weight, completed = true) {
  if (!completed || !Number.isFinite(Number(reps)) || !Number.isFinite(Number(weight))) return 0;
  return Math.max(0, Number(reps)) * Math.max(0, Number(weight));
}
export function calculateExerciseVolume(sets = []) { return sets.reduce((sum, set) => sum + calculateSetVolume(set.actualReps, set.actualWeight, set.completed), 0); }
export function calculateWorkoutVolume(exercises = []) { return exercises.reduce((sum, exercise) => sum + calculateExerciseVolume(exercise.sets), 0); }
export function calculateCompletedSetCount(exercises = []) { return exercises.reduce((sum, exercise) => sum + (exercise.sets || []).filter((set) => set.completed).length, 0); }
export function calculateTotalReps(exercises = []) { return exercises.reduce((sum, exercise) => sum + (exercise.sets || []).filter((set) => set.completed).reduce((setSum, set) => setSum + (Number(set.actualReps) || 0), 0), 0); }
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
  if (session.workoutType === WORKOUT_TYPES.STRENGTH) return { ...base, completedSets: calculateCompletedSetCount(session.exercises), totalReps: calculateTotalReps(session.exercises), totalVolume: calculateWorkoutVolume(session.exercises) };
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
