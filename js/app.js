import { initRouter } from "./router.js";
import { getSettings } from "./database.js";

function applyTheme(theme) {
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
    return;
  }

  delete document.documentElement.dataset.theme;
}

async function initializeTheme() {
  try {
    const settings = await getSettings();
    applyTheme(settings.theme);
  } catch (error) {
    console.warn("Theme konnte nicht geladen werden.", error);
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("./service-worker.js");
  } catch (error) {
    console.warn("Service Worker konnte nicht registriert werden.", error);
  }
}

function showConnectionStatus(message, type = "info") {
  const status = document.querySelector("#app-status");

  if (!status) {
    return;
  }

  status.textContent = message;
  status.dataset.type = type;
  status.hidden = false;

  window.clearTimeout(showConnectionStatus.timeout);
  showConnectionStatus.timeout = window.setTimeout(() => {
    status.hidden = true;
  }, 3500);
}

function initializeConnectionStatus() {
  if (!navigator.onLine) {
    showConnectionStatus("Offline-Modus aktiv. Gespeicherte Daten bleiben verfuegbar.", "warning");
  }

  window.addEventListener("offline", () => {
    showConnectionStatus("Offline-Modus aktiv. Die App laeuft lokal weiter.", "warning");
  });

  window.addEventListener("online", () => {
    showConnectionStatus("Verbindung wiederhergestellt.", "success");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  initializeConnectionStatus();
  initRouter();
  registerServiceWorker();
});

window.addEventListener("fitness-settings-updated", (event) => {
  applyTheme(event.detail?.theme || "system");
});
