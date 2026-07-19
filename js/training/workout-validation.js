import { EXERCISE_CATEGORIES, EQUIPMENT_TYPES, SIDE_MODES, STRETCH_CATEGORIES, STRETCH_TYPES, WORKOUT_TYPES } from "./training-constants.js";

const inRange = (value, min, max) => Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max;
export function validateWorkoutPlan(plan, validExerciseIds = null) {
  const errors = [];
  if (!plan.name?.trim()) errors.push("Der Plan benötigt einen Namen.");
  if (plan.workoutType !== WORKOUT_TYPES.OTHER && !plan.exercises?.length) errors.push("Wähle mindestens eine Übung.");
  if (validExerciseIds && plan.exercises?.some((item) => !validExerciseIds.has(item.exerciseId))) errors.push("Der Plan enthält eine ungültige Übung.");
  if (plan.workoutType === WORKOUT_TYPES.STRENGTH) plan.exercises?.forEach((item) => {
    if (!inRange(item.sets?.length, 1, 20)) errors.push("Pro Übung sind 1 bis 20 Sätze erlaubt.");
    item.sets?.forEach((set) => { if (!inRange(set.targetReps, 0, 1000) || !inRange(set.targetWeight, 0, 1000)) errors.push("Wiederholungen und Gewicht liegen außerhalb des erlaubten Bereichs."); });
  });
  if (plan.workoutType === WORKOUT_TYPES.STRETCHING) plan.exercises?.forEach((item) => {
    if (!inRange(item.sets, 1, 20) || !inRange(item.durationSeconds, 5, 3600)) errors.push("Durchgänge oder Dauer liegen außerhalb des erlaubten Bereichs.");
    if (!Object.values(SIDE_MODES).includes(item.sideMode)) errors.push("Ungültige Seitenangabe.");
  });
  if (plan.workoutType === WORKOUT_TYPES.OTHER && plan.durationSeconds != null && !inRange(plan.durationSeconds, 0, 86400)) errors.push("Die Dauer darf höchstens 24 Stunden betragen.");
  return [...new Set(errors)];
}

export function validateCustomExercise(exercise) {
  const errors = [];
  if (!exercise.name?.trim()) errors.push("Name ist erforderlich.");
  if (!exercise.category) errors.push(exercise.workoutType === "stretching" ? "Zielbereich ist erforderlich." : "Kategorie ist erforderlich.");
  if (exercise.workoutType === "strength" && !Object.values(EXERCISE_CATEGORIES).includes(exercise.category)) errors.push("Wähle eine gültige Kraftkategorie.");
  if (exercise.workoutType === "strength" && (!exercise.equipment?.length || exercise.equipment.some((x)=>!Object.values(EQUIPMENT_TYPES).includes(x)))) errors.push("Ausrüstung ist erforderlich.");
  if (exercise.workoutType === "stretching" && !Object.values(STRETCH_CATEGORIES).includes(exercise.category)) errors.push("Wähle einen gültigen Zielbereich.");
  if (exercise.workoutType === "stretching" && !Object.values(STRETCH_TYPES).includes(exercise.stretchType)) errors.push("Stretching-Typ ist erforderlich.");
  return errors;
}
