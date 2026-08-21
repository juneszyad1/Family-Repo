import { initRouter } from "./router.js";
import { getSettings } from "./database.js";

let serviceWorkerRegistration = null;

function applyTheme(theme) {
  const supportedThemes = ["light", "dark"];

  if (supportedThemes.includes(theme)) {
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
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController && !reloading) {
        reloading = true;
        window.location.reload();
      }
    });
    const registration = await navigator.serviceWorker.register("./service-worker.js", { updateViaCache: "none" });
    serviceWorkerRegistration = registration;

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;

      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          showConnectionStatus("Eine neue App-Version ist verfügbar.", "success");
        }
      });
    });
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
  initializeTheme();
  initializeConnectionStatus();
  initRouter();
  registerServiceWorker();
});

document.addEventListener("click", async (event) => {
  if (!event.target.closest("#app-update-button")) return;
  if (!serviceWorkerRegistration) {
    showConnectionStatus("Update-Prüfung ist in diesem Browser nicht verfügbar.", "warning");
    return;
  }
  showConnectionStatus("Update wird geprüft ...", "info");
  try {
    await serviceWorkerRegistration?.update();
    showConnectionStatus("Update-Prüfung abgeschlossen.", "success");
  } catch (error) {
    console.warn("Update-Prüfung fehlgeschlagen.", error);
    showConnectionStatus("Update konnte gerade nicht geprüft werden.", "warning");
  }
});

window.addEventListener("fitness-settings-updated", (event) => {
  applyTheme(event.detail?.theme || "system");
});
