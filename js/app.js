import { initRouter } from "./router.js";
import { getSettings } from "./database.js";
import { APP_VERSION_LABEL } from "./config.js";

function applyTheme(theme) {
  if (theme === "light" || theme === "dark" || theme === "pink") {
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
    const registration = await navigator.serviceWorker.register("./service-worker.js");
    const updateButton = document.querySelector("#app-update-button");

    updateButton?.addEventListener("click", async () => {
      showConnectionStatus("Update wird geprüft ...", "info");
      try {
        await registration.update();
        window.setTimeout(() => window.location.reload(), 700);
      } catch (error) {
        console.warn("Update-Prüfung fehlgeschlagen.", error);
        showConnectionStatus("Update konnte gerade nicht geprüft werden.", "warning");
      }
    });

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;

      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          showConnectionStatus("Neue App-Version installiert. Tippe auf Update oder öffne die App neu.", "success");
        }
      });
    });
  } catch (error) {
    console.warn("Service Worker konnte nicht registriert werden.", error);
  }
}

function initializeVersionLabel() {
  const version = document.querySelector("#app-version");

  if (version) {
    version.textContent = APP_VERSION_LABEL;
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
    showConnectionStatus("Offline-Modus aktiv. Gespeicherte Daten bleiben verfügbar.", "warning");
  }

  window.addEventListener("offline", () => {
    showConnectionStatus("Offline-Modus aktiv. Die App läuft lokal weiter.", "warning");
  });

  window.addEventListener("online", () => {
    showConnectionStatus("Verbindung wiederhergestellt.", "success");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializeVersionLabel();
  initializeTheme();
  initializeConnectionStatus();
  initRouter();
  registerServiceWorker();
});

window.addEventListener("fitness-settings-updated", (event) => {
  applyTheme(event.detail?.theme || "system");
});
