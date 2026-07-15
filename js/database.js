import { createId } from "./utils.js";

const DB_NAME = "fitness-tracker-db";
const DB_VERSION = 4;
const STORES = {
  dailyEntries: "dailyEntries",
  bodyFatEntries: "bodyFatEntries",
  circumferenceEntries: "circumferenceEntries",
  progressPhotos: "progressPhotos",
  settings: "settings",
  goals: "goals"
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
      reject(new Error("IndexedDB wird von diesem Browser nicht unterstützt."));
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

      if (!db.objectStoreNames.contains(STORES.circumferenceEntries)) {
        const circumferenceStore = db.createObjectStore(STORES.circumferenceEntries, { keyPath: "id" });
        circumferenceStore.createIndex("date", "date", { unique: true });
      }

      if (!db.objectStoreNames.contains(STORES.progressPhotos)) {
        const photosStore = db.createObjectStore(STORES.progressPhotos, { keyPath: "id" });
        photosStore.createIndex("date", "date", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORES.goals)) {
        const goalsStore = db.createObjectStore(STORES.goals, { keyPath: "id" });
        goalsStore.createIndex("type", "type", { unique: false });
        goalsStore.createIndex("status", "status", { unique: false });
        goalsStore.createIndex("typeStatus", ["type", "status"], { unique: false });
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

export async function getCircumferenceEntries() {
  const store = await getStore(STORES.circumferenceEntries);
  return requestToPromise(store.getAll());
}

export async function getCircumferenceEntryByDate(date) {
  const store = await getStore(STORES.circumferenceEntries);
  const index = store.index("date");
  return requestToPromise(index.get(date));
}

export async function saveCircumferenceEntry(entryData) {
  const existingEntry = await getCircumferenceEntryByDate(entryData.date);
  const now = new Date().toISOString();
  const entry = {
    id: existingEntry?.id || createId("circumference"),
    date: entryData.date,
    arm: entryData.arm,
    leg: entryData.leg,
    note: entryData.note || "",
    createdAt: existingEntry?.createdAt || now,
    updatedAt: now
  };
  const store = await getStore(STORES.circumferenceEntries, "readwrite");

  await requestToPromise(store.put(entry));
  return entry;
}

export async function deleteCircumferenceEntry(id) {
  const store = await getStore(STORES.circumferenceEntries, "readwrite");
  return requestToPromise(store.delete(id));
}

export async function replaceCircumferenceEntries(entries) {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.circumferenceEntries, "readwrite");
  const store = transaction.objectStore(STORES.circumferenceEntries);

  store.clear();
  entries.forEach((entry) => store.put(entry));
  await transactionDone(transaction);
}

export async function putCircumferenceEntries(entries) {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.circumferenceEntries, "readwrite");
  const store = transaction.objectStore(STORES.circumferenceEntries);

  entries.forEach((entry) => store.put(entry));
  await transactionDone(transaction);
}

export async function getProgressPhotos() {
  const store = await getStore(STORES.progressPhotos);
  return requestToPromise(store.getAll());
}

export async function saveProgressPhoto(photoData) {
  const now = new Date().toISOString();
  const photo = {
    id: photoData.id || createId("photo"),
    date: photoData.date,
    image: photoData.image,
    imageType: photoData.imageType,
    imageName: photoData.imageName || "",
    imageSize: photoData.imageSize || photoData.image?.size || null,
    note: photoData.note || "",
    createdAt: photoData.createdAt || now,
    updatedAt: now
  };
  const store = await getStore(STORES.progressPhotos, "readwrite");

  await requestToPromise(store.put(photo));
  return photo;
}

export async function deleteProgressPhoto(id) {
  const store = await getStore(STORES.progressPhotos, "readwrite");
  return requestToPromise(store.delete(id));
}

export async function replaceProgressPhotos(photos) {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.progressPhotos, "readwrite");
  const store = transaction.objectStore(STORES.progressPhotos);

  store.clear();
  photos.forEach((photo) => store.put(photo));
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

export async function getGoals() {
  const store = await getStore(STORES.goals);
  return requestToPromise(store.getAll());
}

export async function getGoalById(id) {
  const store = await getStore(STORES.goals);
  return requestToPromise(store.get(id));
}

export async function getActiveGoals() {
  const store = await getStore(STORES.goals);
  const index = store.index("status");
  return requestToPromise(index.getAll("active"));
}

export async function saveGoal(goalData) {
  const now = new Date().toISOString();
  const existingGoal = goalData.id ? await getGoalById(goalData.id) : null;
  const goal = {
    id: goalData.id || createId("goal"),
    type: goalData.type,
    startDate: goalData.startDate,
    targetDate: goalData.targetDate,
    startValue: goalData.startValue,
    targetValue: goalData.targetValue,
    direction: goalData.targetValue < goalData.startValue ? "decrease" : "increase",
    inputMode: goalData.inputMode,
    requestedChange: goalData.requestedChange ?? null,
    requestedWeeks: goalData.requestedWeeks ?? null,
    status: goalData.status || "active",
    createdAt: existingGoal?.createdAt || goalData.createdAt || now,
    updatedAt: now,
    completedAt: goalData.completedAt || null
  };
  const activeGoals = goal.status === "active" ? await getActiveGoals() : [];
  const db = await openDatabase();
  const transaction = db.transaction(STORES.goals, "readwrite");
  const store = transaction.objectStore(STORES.goals);

  if (goal.status === "active") {
    activeGoals
      .filter((activeGoal) => activeGoal.type === goal.type && activeGoal.id !== goal.id)
      .forEach((activeGoal) => {
        store.put({
          ...activeGoal,
          status: "cancelled",
          updatedAt: now
        });
      });
  }

  store.put(goal);
  await transactionDone(transaction);
  return goal;
}

export async function updateGoalStatus(id, status) {
  const goal = await getGoalById(id);
  if (!goal) {
    throw new Error("Ziel wurde nicht gefunden.");
  }

  return saveGoal({
    ...goal,
    status,
    completedAt: status === "completed" ? new Date().toISOString() : goal.completedAt
  });
}

export async function replaceGoals(goals) {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.goals, "readwrite");
  const store = transaction.objectStore(STORES.goals);

  store.clear();
  goals.forEach((goal) => store.put(goal));
  await transactionDone(transaction);
}

export async function putGoals(goals) {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.goals, "readwrite");
  const store = transaction.objectStore(STORES.goals);

  goals.forEach((goal) => store.put(goal));
  await transactionDone(transaction);
}

export async function clearAllData() {
  const db = await openDatabase();
  const transaction = db.transaction(Object.values(STORES), "readwrite");

  Object.values(STORES).forEach((storeName) => {
    transaction.objectStore(storeName).clear();
  });

  await transactionDone(transaction);
}
