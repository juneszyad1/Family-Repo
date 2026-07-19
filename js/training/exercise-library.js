import { STRENGTH_EXERCISES } from "../data/strength-exercises.js";
import { STRETCH_EXERCISES } from "../data/stretch-exercises.js";

export function normalizeSearchText(value = "") {
  return String(value).toLocaleLowerCase("de").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").trim();
}

export function getBuiltInExercises(type) {
  return type === "stretching" ? STRETCH_EXERCISES : STRENGTH_EXERCISES;
}

export function filterExercises(exercises, filters = {}) {
  const query = normalizeSearchText(filters.query);
  return exercises.filter((exercise) => {
    const searchable = normalizeSearchText([
      exercise.name, exercise.englishName, exercise.category, exercise.movementPattern,
      ...(exercise.primaryMuscles || []), ...(exercise.secondaryMuscles || []),
      ...(exercise.targetAreas || []), ...(exercise.equipment || [])
    ].join(" "));
    return (!query || searchable.includes(query))
      && (!filters.category || exercise.category === filters.category)
      && (!filters.equipment || exercise.equipment?.includes(filters.equipment))
      && (!filters.movementPattern || exercise.movementPattern === filters.movementPattern)
      && (!filters.customOnly || exercise.isCustom)
      && (!filters.favoriteOnly || filters.favoriteIds?.has(exercise.id))
      && (!filters.recentOnly || filters.recentIds?.has(exercise.id));
  });
}

export function findExercise(id, customExercises = []) {
  return [...STRENGTH_EXERCISES, ...STRETCH_EXERCISES, ...customExercises].find((item) => item.id === id) || null;
}
