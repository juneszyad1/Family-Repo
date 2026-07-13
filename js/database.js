import { createId } from "./utils.js";

const DB_NAME = "fitness-tracker-db";
const DB_VERSION = 1;
const STORES = {
  dailyEntries: "dailyEntries",
  bodyFatEntries: "bodyFatEntries",
  settings: "settings"
};

let databasePromise;

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

function openDatabase() {
  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB wird von diesem Browser nicht unterstuetzt."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.addEventListener("upgradeneeded", () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORES.dailyEntries)) {
        const dailyStore = db.createObjectStore(STORES.dailyEntries, { keyPath: "id" });
        dailyStore.createIndex("date", "date", { unique: true });
      }

      if (!db.objectStoreNames.contains(STORES.bodyFatEntries)) {
        const bodyFatStore = db.createObjectStore(STORES.bodyFatEntries, { keyPath: "id" });
        bodyFatStore.createIndex("date", "date", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: "id" });
      }
    });

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });

  return databasePromise;
}

async function getStore(storeName, mode = "readonly") {
  const db = await openDatabase();
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("error", () => reject(transaction.error));
    transaction.addEventListener("abort", () => reject(transaction.error));
  });
}

export async function getDailyEntries() {
  const store = await getStore(STORES.dailyEntries);
  return requestToPromise(store.getAll());
}

export async function getDailyEntryByDate(date) {
  const store = await getStore(STORES.dailyEntries);
  const index = store.index("date");
  return requestToPromise(index.get(date));
}

export async function saveDailyEntry(entryData) {
  const existingEntry = await getDailyEntryByDate(entryData.date);
  const now = new Date().toISOString();
  const entry = {
    id: existingEntry?.id || createId("daily"),
    date: entryData.date,
    weight: entryData.weight,
    calories: entryData.calories,
    protein: entryData.protein,
    note: entryData.note || "",
    createdAt: existingEntry?.createdAt || now,
    updatedAt: now
  };
  const store = await getStore(STORES.dailyEntries, "readwrite");

  await requestToPromise(store.put(entry));
  return entry;
}

export async function deleteDailyEntry(id) {
  const store = await getStore(STORES.dailyEntries, "readwrite");
  return requestToPromise(store.delete(id));
}

export async function replaceDailyEntries(entries) {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.dailyEntries, "readwrite");
  const store = transaction.objectStore(STORES.dailyEntries);

  store.clear();
  entries.forEach((entry) => store.put(entry));
  await transactionDone(transaction);
}

export async function putDailyEntries(entries) {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.dailyEntries, "readwrite");
  const store = transaction.objectStore(STORES.dailyEntries);

  entries.forEach((entry) => store.put(entry));
  await transactionDone(transaction);
}

export async function getBodyFatEntries() {
  const store = await getStore(STORES.bodyFatEntries);
  return requestToPromise(store.getAll());
}

export async function saveBodyFatEntry(entryData) {
  const now = new Date().toISOString();
  const entry = {
    id: entryData.id || createId("body-fat"),
    date: entryData.date,
    age: entryData.age,
    chest: entryData.chest,
    abdomen: entryData.abdomen,
    thigh: entryData.thigh,
    skinfoldSum: entryData.skinfoldSum,
    bodyDensity: entryData.bodyDensity,
    bodyFatPercentage: entryData.bodyFatPercentage,
    createdAt: entryData.createdAt || now,
    updatedAt: now
  };
  const store = await getStore(STORES.bodyFatEntries, "readwrite");

  await requestToPromise(store.put(entry));
  return entry;
}

export async function deleteBodyFatEntry(id) {
  const store = await getStore(STORES.bodyFatEntries, "readwrite");
  return requestToPromise(store.delete(id));
}

export async function replaceBodyFatEntries(entries) {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.bodyFatEntries, "readwrite");
  const store = transaction.objectStore(STORES.bodyFatEntries);

  store.clear();
  entries.forEach((entry) => store.put(entry));
  await transactionDone(transaction);
}

export async function putBodyFatEntries(entries) {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.bodyFatEntries, "readwrite");
  const store = transaction.objectStore(STORES.bodyFatEntries);

  entries.forEach((entry) => store.put(entry));
  await transactionDone(transaction);
}

export function getDefaultSettings() {
  return {
    id: "settings",
    calorieTarget: 2400,
    proteinTarget: 180,
    targetWeight: null,
    targetBodyFat: null,
    defaultAge: null,
    theme: "system"
  };
}

export async function getSettings() {
  const store = await getStore(STORES.settings);
  const savedSettings = await requestToPromise(store.get("settings"));

  return {
    ...getDefaultSettings(),
    ...(savedSettings || {})
  };
}

export async function saveSettings(settingsData) {
  const settings = {
    ...getDefaultSettings(),
    ...settingsData,
    id: "settings"
  };
  const store = await getStore(STORES.settings, "readwrite");

  await requestToPromise(store.put(settings));
  return settings;
}

export async function clearAllData() {
  const db = await openDatabase();
  const transaction = db.transaction(Object.values(STORES), "readwrite");

  Object.values(STORES).forEach((storeName) => {
    transaction.objectStore(storeName).clear();
  });

  await transactionDone(transaction);
}
