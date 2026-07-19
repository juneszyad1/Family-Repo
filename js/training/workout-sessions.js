import { createId } from "../utils.js";
import { findExercise } from "./exercise-library.js";
import { WORKOUT_STATUS, WORKOUT_TYPES } from "./training-constants.js";
import { calculateWorkoutDuration } from "./workout-calculations.js";

export function createSessionFromPlan(plan, customExercises = [], now = new Date()) {
  const iso = now.toISOString();
  const exercises = (plan.exercises || []).map((item, index) => {
    const source = findExercise(item.exerciseId, customExercises);
    const common = { id: createId("session-exercise"), exerciseId: item.exerciseId, exerciseNameSnapshot: source?.name || "Gelöschte Übung", order: index + 1, notes: item.notes || "" };
    if (plan.workoutType === WORKOUT_TYPES.STRENGTH) return { ...common, sets: item.sets.map((set) => ({ id: createId("session-set"), plannedReps: Number(set.targetReps), plannedWeight: Number(set.targetWeight), actualReps: Number(set.targetReps), actualWeight: Number(set.targetWeight), completed: false })) };
    return { ...common, sets: Array.from({ length: Number(item.sets) }, () => ({ id: createId("session-set"), completed: false })), durationSeconds: Number(item.durationSeconds), sideMode: item.sideMode };
  });
  return { id: createId("workout-session"), planId: plan.id || null, planNameSnapshot: plan.name, workoutType: plan.workoutType, date: iso.slice(0,10), startedAt: iso, completedAt: null, durationSeconds: plan.workoutType === WORKOUT_TYPES.OTHER ? Number(plan.durationSeconds) || 0 : null, status: WORKOUT_STATUS.IN_PROGRESS, exercises, notes: "", createdAt: iso, updatedAt: iso };
}
export function completeSession(session, completedAt = new Date().toISOString()) { return { ...session, completedAt, durationSeconds: calculateWorkoutDuration(session.startedAt, completedAt), status: WORKOUT_STATUS.COMPLETED, updatedAt: completedAt }; }
