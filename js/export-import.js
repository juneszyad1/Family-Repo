import {
  clearAllData,
  getBodyFatEntries,
  getDailyEntries,
  getGoals,
  getSettings,
  replaceBodyFatEntries,
  replaceDailyEntries,
  replaceGoals,
  saveSettings
} from "./database.js";
import { createId } from "./utils.js";

const EXPORT_VERSION = 1;

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

function validateImportData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Die Datei ist kein gültiges JSON-Backup.");
  }

  if (data.version !== EXPORT_VERSION) {
    throw new Error("Diese Backup-Version wird nicht unterstützt.");
  }

  if (!Array.isArray(data.dailyEntries) || !Array.isArray(data.bodyFatEntries)) {
    throw new Error("Das Backup enthält keine gültigen Datenlisten.");
  }

  if (data.goals !== undefined && !Array.isArray(data.goals)) {
    throw new Error("Das Backup enthält keine gültige Zielliste.");
  }

  const dailyEntriesValid = data.dailyEntries.every((entry) => entry && typeof entry.date === "string");
  const bodyFatEntriesValid = data.bodyFatEntries.every((entry) => entry && typeof entry.date === "string");

  if (!dailyEntriesValid || !bodyFatEntriesValid) {
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

export async function exportJsonBackup() {
  const [settings, dailyEntries, bodyFatEntries, goals] = await Promise.all([
    getSettings(),
    getDailyEntries(),
    getBodyFatEntries(),
    getGoals()
  ]);
  const payload = {
    version: EXPORT_VERSION,
    exportDate: new Date().toISOString(),
    settings,
    dailyEntries,
    bodyFatEntries,
    goals
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, backupFilename("json"));
}

export async function exportDailyCsv() {
  const dailyEntries = await getDailyEntries();
  const header = "Datum,Gewicht,Kalorien,Protein,Notiz";
  const rows = dailyEntries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) =>
      [
        entry.date,
        entry.weight,
        entry.calories,
        entry.protein,
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
  const importedGoals = (validatedData.goals || []).map(normalizeGoal);

  if (options.mode === "replace") {
    await replaceDailyEntries(importedDaily);
    await replaceBodyFatEntries(importedBodyFat);
    await replaceGoals(importedGoals);
    await saveSettings(settings);
    return;
  }

  const [existingDaily, existingBodyFat, existingGoals] = await Promise.all([
    getDailyEntries(),
    getBodyFatEntries(),
    getGoals()
  ]);
  const mergedDaily = mergeByDate(existingDaily, importedDaily, options.conflictMode);
  const mergedBodyFat = options.conflictMode === "imported"
    ? [...existingBodyFat, ...importedBodyFat]
    : [...importedBodyFat, ...existingBodyFat];

  await replaceDailyEntries(mergedDaily);
  await replaceBodyFatEntries(mergedBodyFat);
  await replaceGoals([...existingGoals, ...importedGoals]);
  await saveSettings(settings);
}

export async function deleteEverything() {
  await clearAllData();
}
