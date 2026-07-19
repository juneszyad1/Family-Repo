import {
  clearAllData,
  getBodyFatEntries,
  getCircumferenceEntries,
  getDailyEntries,
  getGoals,
  getProgressPhotos,
  getSettings,
  getCustomExercises,
  getWorkoutPlans,
  getWorkoutSessions,
  getExerciseFavorites,
  replaceBodyFatEntries,
  replaceCircumferenceEntries,
  replaceDailyEntries,
  replaceGoals,
  replaceProgressPhotos,
  replaceCustomExercises,
  replaceWorkoutPlans,
  replaceWorkoutSessions,
  replaceExerciseFavorites,
  saveSettings
} from "./database.js";
import { createId } from "./utils.js";

const EXPORT_VERSION = 2;

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function backupFilename(extension) {
  const date = new Date().toISOString().slice(0, 10);
  return `fitness-tracker-backup-${date}.${extension}`;
}

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function normalizeDailyEntry(entry) {
  return {
    id: entry.id || createId("daily"),
    date: entry.date,
    weight: entry.weight ?? null,
    calories: entry.calories ?? null,
    protein: entry.protein ?? null,
    sleepHours: entry.sleepHours ?? null,
    note: entry.note || "",
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || new Date().toISOString()
  };
}

function normalizeBodyFatEntry(entry) {
  return {
    id: entry.id || createId("body-fat"),
    date: entry.date,
    age: entry.age,
    chest: entry.chest,
    abdomen: entry.abdomen,
    thigh: entry.thigh,
    skinfoldSum: entry.skinfoldSum,
    bodyDensity: entry.bodyDensity,
    bodyFatPercentage: entry.bodyFatPercentage,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || new Date().toISOString()
  };
}

function normalizeCircumferenceEntry(entry) {
  return {
    id: entry.id || createId("circumference"),
    date: entry.date,
    arm: entry.arm ?? null,
    leg: entry.leg ?? null,
    note: entry.note || "",
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || new Date().toISOString()
  };
}

function normalizeGoal(goal) {
  return {
    id: goal.id || createId("goal"),
    type: goal.type,
    startDate: goal.startDate,
    targetDate: goal.targetDate,
    startValue: goal.startValue,
    targetValue: goal.targetValue,
    direction: goal.direction || (goal.targetValue < goal.startValue ? "decrease" : "increase"),
    inputMode: goal.inputMode || "targetValue",
    requestedChange: goal.requestedChange ?? null,
    requestedWeeks: goal.requestedWeeks ?? null,
    status: goal.status || "active",
    createdAt: goal.createdAt || new Date().toISOString(),
    updatedAt: goal.updatedAt || new Date().toISOString(),
    completedAt: goal.completedAt || null
  };
}

async function normalizeProgressPhoto(photo) {
  return {
    id: photo.id || createId("photo"),
    date: photo.date,
    image: photo.image instanceof Blob ? photo.image : await dataUrlToBlob(photo.imageDataUrl),
    imageType: photo.imageType || "image/jpeg",
    imageName: photo.imageName || "",
    imageSize: photo.imageSize || null,
    note: photo.note || "",
    createdAt: photo.createdAt || new Date().toISOString(),
    updatedAt: photo.updatedAt || new Date().toISOString()
  };
}

function validateImportData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Die Datei ist kein gültiges JSON-Backup.");
  }

  if (![1, EXPORT_VERSION].includes(data.version)) {
    throw new Error("Diese Backup-Version wird nicht unterstützt.");
  }

  if (!Array.isArray(data.dailyEntries) || !Array.isArray(data.bodyFatEntries)) {
    throw new Error("Das Backup enthält keine gültigen Datenlisten.");
  }

  if (data.goals !== undefined && !Array.isArray(data.goals)) {
    throw new Error("Das Backup enthält keine gültige Zielliste.");
  }

  if (data.circumferenceEntries !== undefined && !Array.isArray(data.circumferenceEntries)) {
    throw new Error("Das Backup enthält keine gültige Umfangliste.");
  }

  if (data.progressPhotos !== undefined && !Array.isArray(data.progressPhotos)) {
    throw new Error("Das Backup enthält keine gültige Bilderliste.");
  }

  ["customExercises", "workoutPlans", "workoutSessions", "exerciseFavorites"].forEach((key) => {
    if (data[key] !== undefined && !Array.isArray(data[key])) throw new Error(`Das Backup enthält keine gültige Liste für ${key}.`);
  });

  const dailyEntriesValid = data.dailyEntries.every((entry) => entry && typeof entry.date === "string");
  const bodyFatEntriesValid = data.bodyFatEntries.every((entry) => entry && typeof entry.date === "string");
  const circumferenceEntriesValid = (data.circumferenceEntries || []).every((entry) => entry && typeof entry.date === "string");
  const progressPhotosValid = (data.progressPhotos || []).every((photo) => photo && typeof photo.date === "string" && typeof photo.imageDataUrl === "string");

  if (!dailyEntriesValid || !bodyFatEntriesValid || !circumferenceEntriesValid || !progressPhotosValid) {
    throw new Error("Das Backup enthält ungültige Einträge.");
  }

  return data;
}

function mergeByDate(existingEntries, importedEntries, conflictMode) {
  const entriesByDate = new Map(existingEntries.map((entry) => [entry.date, entry]));

  importedEntries.forEach((entry) => {
    if (!entriesByDate.has(entry.date) || conflictMode === "imported") {
      entriesByDate.set(entry.date, entry);
    }
  });

  return [...entriesByDate.values()];
}

function mergeById(existingEntries, importedEntries, conflictMode) {
  const byId = new Map(existingEntries.map((entry) => [entry.id, entry]));
  importedEntries.forEach((entry) => { if (!byId.has(entry.id) || conflictMode === "imported") byId.set(entry.id, entry); });
  return [...byId.values()];
}

export async function exportJsonBackup() {
  const [settings, dailyEntries, bodyFatEntries, circumferenceEntries, progressPhotos, goals, customExercises, workoutPlans, workoutSessions, exerciseFavorites] = await Promise.all([
    getSettings(),
    getDailyEntries(),
    getBodyFatEntries(),
    getCircumferenceEntries(),
    getProgressPhotos(),
    getGoals(), getCustomExercises(), getWorkoutPlans(), getWorkoutSessions(), getExerciseFavorites()
  ]);
  const exportedProgressPhotos = await Promise.all(
    progressPhotos.map(async (photo) => ({
      id: photo.id,
      date: photo.date,
      imageDataUrl: await blobToDataUrl(photo.image),
      imageType: photo.imageType,
      imageName: photo.imageName,
      imageSize: photo.imageSize,
      note: photo.note || "",
      createdAt: photo.createdAt,
      updatedAt: photo.updatedAt
    }))
  );
  const payload = {
    version: EXPORT_VERSION,
    exportDate: new Date().toISOString(),
    settings,
    dailyEntries,
    bodyFatEntries,
    circumferenceEntries,
    progressPhotos: exportedProgressPhotos,
    goals,
    customExercises,
    workoutPlans,
    workoutSessions,
    exerciseFavorites
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, backupFilename("json"));
}

export async function exportDailyCsv() {
  const dailyEntries = await getDailyEntries();
  const header = "Datum,Gewicht,Kalorien,Protein,Schlafdauer,Notiz";
  const rows = dailyEntries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) =>
      [
        entry.date,
        entry.weight,
        entry.calories,
        entry.protein,
        entry.sleepHours,
        entry.note
      ].map(csvEscape).join(",")
    );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, backupFilename("csv"));
}

export async function readJsonFile(file) {
  const text = await file.text();
  return validateImportData(JSON.parse(text));
}

export async function importBackup(data, options) {
  const validatedData = validateImportData(data);
  const settings = validatedData.settings || {};
  const importedDaily = validatedData.dailyEntries.map(normalizeDailyEntry);
  const importedBodyFat = validatedData.bodyFatEntries.map(normalizeBodyFatEntry);
  const importedCircumference = (validatedData.circumferenceEntries || []).map(normalizeCircumferenceEntry);
  const importedProgressPhotos = await Promise.all((validatedData.progressPhotos || []).map(normalizeProgressPhoto));
  const importedGoals = (validatedData.goals || []).map(normalizeGoal);
  const importedCustomExercises = validatedData.customExercises || [];
  const importedWorkoutPlans = validatedData.workoutPlans || [];
  const importedWorkoutSessions = validatedData.workoutSessions || [];
  const importedExerciseFavorites = validatedData.exerciseFavorites || [];

  if (options.mode === "replace") {
    await replaceDailyEntries(importedDaily);
    await replaceBodyFatEntries(importedBodyFat);
    await replaceCircumferenceEntries(importedCircumference);
    await replaceProgressPhotos(importedProgressPhotos);
    await replaceGoals(importedGoals);
    await replaceCustomExercises(importedCustomExercises);
    await replaceWorkoutPlans(importedWorkoutPlans);
    await replaceWorkoutSessions(importedWorkoutSessions);
    await replaceExerciseFavorites(importedExerciseFavorites);
    await saveSettings(settings);
    return;
  }

  const [existingDaily, existingBodyFat, existingCircumference, existingProgressPhotos, existingGoals, existingCustomExercises, existingWorkoutPlans, existingWorkoutSessions, existingExerciseFavorites] = await Promise.all([
    getDailyEntries(),
    getBodyFatEntries(),
    getCircumferenceEntries(),
    getProgressPhotos(),
    getGoals(), getCustomExercises(), getWorkoutPlans(), getWorkoutSessions(), getExerciseFavorites()
  ]);
  const mergedDaily = mergeByDate(existingDaily, importedDaily, options.conflictMode);
  const mergedCircumference = mergeByDate(existingCircumference, importedCircumference, options.conflictMode);
  const mergedBodyFat = options.conflictMode === "imported"
    ? [...existingBodyFat, ...importedBodyFat]
    : [...importedBodyFat, ...existingBodyFat];

  await replaceDailyEntries(mergedDaily);
  await replaceBodyFatEntries(mergedBodyFat);
  await replaceCircumferenceEntries(mergedCircumference);
  await replaceProgressPhotos([...existingProgressPhotos, ...importedProgressPhotos]);
  await replaceGoals([...existingGoals, ...importedGoals]);
  await replaceCustomExercises(mergeById(existingCustomExercises, importedCustomExercises, options.conflictMode));
  await replaceWorkoutPlans(mergeById(existingWorkoutPlans, importedWorkoutPlans, options.conflictMode));
  await replaceWorkoutSessions(mergeById(existingWorkoutSessions, importedWorkoutSessions, options.conflictMode));
  await replaceExerciseFavorites(mergeById(existingExerciseFavorites, importedExerciseFavorites, options.conflictMode));
  await saveSettings(settings);
}

export async function deleteEverything() {
  await clearAllData();
}
