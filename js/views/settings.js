import { getSettings, saveSettings } from "../database.js";
import { deleteEverything, exportDailyCsv, exportJsonBackup, importBackup, readJsonFile } from "../export-import.js";
import { seedDemoData } from "../seed-data.js";
import { toNumberOrNull } from "../utils.js";
import { APP_VERSION_LABEL } from "../config.js";

function normalizeSettings(form) {
  const formData = new FormData(form);

  return {
    calorieTarget: toNumberOrNull(formData.get("calorieTarget")) ?? 2400,
    proteinTarget: toNumberOrNull(formData.get("proteinTarget")) ?? 180,
    targetWeight: toNumberOrNull(formData.get("targetWeight")),
    targetBodyFat: toNumberOrNull(formData.get("targetBodyFat")),
    defaultAge: toNumberOrNull(formData.get("defaultAge")),
    theme: formData.get("theme") || "system"
  };
}

function showStatus(container, message, type = "success") {
  const status = container.querySelector("[data-status]");
  status.innerHTML = message ? `<div class="alert ${type}" role="status"><p>${message}</p></div>` : "";
}

function fillForm(form, settings) {
  form.elements.calorieTarget.value = settings.calorieTarget ?? "";
  form.elements.proteinTarget.value = settings.proteinTarget ?? "";
  form.elements.targetWeight.value = settings.targetWeight ?? "";
  form.elements.targetBodyFat.value = settings.targetBodyFat ?? "";
  form.elements.defaultAge.value = settings.defaultAge ?? "";
  form.elements.theme.value = settings.theme || "system";
}

async function initializeSettings(container) {
  const form = container.querySelector("[data-settings-form]");
  const importInput = container.querySelector("[data-import-file]");
  let pendingImport = null;

  try {
    fillForm(form, await getSettings());
  } catch (error) {
    console.error(error);
    showStatus(container, "Einstellungen konnten nicht geladen werden.", "danger");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const settings = await saveSettings(normalizeSettings(form));
      window.dispatchEvent(new CustomEvent("fitness-settings-updated", { detail: settings }));
      showStatus(container, "Einstellungen gespeichert.");
    } catch (error) {
      console.error(error);
      showStatus(container, "Einstellungen konnten nicht gespeichert werden.", "danger");
    }
  });

  container.querySelector("[data-export-json]").addEventListener("click", async () => {
    try {
      await exportJsonBackup();
      showStatus(container, "JSON-Backup wurde erstellt.");
    } catch (error) {
      console.error(error);
      showStatus(container, "JSON-Export konnte nicht erstellt werden.", "danger");
    }
  });

  container.querySelector("[data-export-csv]").addEventListener("click", async () => {
    try {
      await exportDailyCsv();
      showStatus(container, "CSV-Export wurde erstellt.");
    } catch (error) {
      console.error(error);
      showStatus(container, "CSV-Export konnte nicht erstellt werden.", "danger");
    }
  });

  container.querySelector("[data-seed-demo]").addEventListener("click", async () => {
    const confirmed = window.confirm("Umfangreiche Testdaten für Gewicht, KFA und Ziele einfügen?");

    if (!confirmed) {
      return;
    }

    try {
      const result = await seedDemoData();
      showStatus(
        container,
        `Testdaten eingefügt: ${result.dailyEntries} Tagesdaten, ${result.bodyFatEntries} KFA-Messungen, ${result.circumferenceEntries} Umfangmessungen und ${result.goals} Ziele.`
      );
    } catch (error) {
      console.error(error);
      showStatus(container, "Testdaten konnten nicht erstellt werden.", "danger");
    }
  });

  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];

    if (!file) {
      pendingImport = null;
      return;
    }

    try {
      pendingImport = await readJsonFile(file);
      showStatus(
        container,
        `Backup bereit: ${pendingImport.dailyEntries.length} Tagesdaten, ${pendingImport.bodyFatEntries.length} KFA-Messungen und ${(pendingImport.workoutSessions || []).length} Trainingseinheiten.`
      );
    } catch (error) {
      console.error(error);
      pendingImport = null;
      importInput.value = "";
      showStatus(container, error.message || "Importdatei ist ungültig.", "danger");
    }
  });

  container.querySelector("[data-import-json]").addEventListener("click", async () => {
    if (!pendingImport) {
      showStatus(container, "Bitte zuerst eine JSON-Datei auswählen.", "danger");
      return;
    }

    const mode = container.querySelector("[name='importMode']:checked")?.value || "merge";
    const conflictMode = container.querySelector("[name='conflictMode']:checked")?.value || "existing";
    const confirmed = window.confirm(
      mode === "replace"
        ? "Vorhandene Daten werden ersetzt. Import wirklich starten?"
        : "Daten werden zusammengeführt. Import wirklich starten?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await importBackup(pendingImport, { mode, conflictMode });
      fillForm(form, await getSettings());
      window.dispatchEvent(new CustomEvent("fitness-settings-updated", { detail: await getSettings() }));
      showStatus(container, "Import erfolgreich abgeschlossen.");
      importInput.value = "";
      pendingImport = null;
    } catch (error) {
      console.error(error);
      showStatus(container, "Import konnte nicht abgeschlossen werden.", "danger");
    }
  });

  container.querySelector("[data-delete-all]").addEventListener("click", async () => {
    const confirmed = window.confirm("Wirklich alle lokal gespeicherten Fitnessdaten löschen?");

    if (!confirmed) {
      return;
    }

    try {
      await deleteEverything();
      fillForm(form, await getSettings());
      window.dispatchEvent(new CustomEvent("fitness-settings-updated", { detail: await getSettings() }));
      showStatus(container, "Alle Daten wurden gelöscht.");
    } catch (error) {
      console.error(error);
      showStatus(container, "Daten konnten nicht gelöscht werden.", "danger");
    }
  });
}

export function renderSettings() {
  const fragment = document.createDocumentFragment();
  const container = document.createElement("section");
  container.className = "view-stack";
  container.innerHTML = `
    <div class="card template-demo-card">
      <p class="subtitle">It's now or never</p>
      <h1 class="title">Come on , Join us!</h1>

      <form class="form-container" onsubmit="event.preventDefault();">
        <div class="input-group">
          <span class="step-badge">1</span>
          <input type="text" placeholder="Name" />
        </div>

        <div class="input-group">
          <span class="step-badge">2</span>
          <input type="password" placeholder="Password" />
        </div>

        <button type="submit" class="submit-btn">Submit</button>
      </form>
    </div>

    <section class="card">
      <div class="card-body">
        <h2 class="section-title">Tagesziele & Darstellung</h2>
        <div data-status></div>
        <form class="form-grid" data-settings-form novalidate>
          <label class="field">
            <span>Kalorienziel pro Tag</span>
            <input type="text" name="calorieTarget" inputmode="numeric" pattern="[0-9]+" placeholder="2400" required>
          </label>

          <label class="field">
            <span>Proteinziel pro Tag</span>
            <input type="text" name="proteinTarget" inputmode="numeric" pattern="[0-9]+" placeholder="180" required>
          </label>

          <label class="field">
            <span>Zielgewicht in kg</span>
            <input type="text" name="targetWeight" inputmode="decimal" pattern="[0-9]+([,.][0-9]+)?">
          </label>

          <label class="field">
            <span>Ziel-KFA in %</span>
            <input type="text" name="targetBodyFat" inputmode="decimal" pattern="[0-9]+([,.][0-9]+)?">
          </label>

          <label class="field">
            <span>Standardalter für KFA</span>
            <input type="number" name="defaultAge" min="15" max="100" step="1" inputmode="numeric">
          </label>

          <label class="field">
            <span>Darstellung</span>
            <select name="theme">
              <option value="system">Systemeinstellung</option>
              <option value="dark">Dark Mode (Standard)</option>
              <option value="light">Light Mode</option>
            </select>
          </label>

          <div class="form-actions field-full">
            <button class="button" type="submit">Einstellungen speichern</button>
          </div>
        </form>
      </div>
    </section>

    <section class="card">
      <div class="card-body">
        <h2 class="section-title">Datenverwaltung & Backup</h2>
        <p class="muted settings-note">Alle Daten liegen ausschließlich lokal im Browser-Speicher dieses Geräts. Regelmäßige Backups vor OS-Updates oder Cache-Leerung empfohlen.</p>

        <div class="settings-group">
          <h3 class="settings-group-title">Export</h3>
          <div class="button-row">
            <button class="button" type="button" data-export-json>JSON-Backup erstellen</button>
            <button class="button secondary" type="button" data-export-csv>CSV Tagesdaten</button>
          </div>
        </div>

        <div class="settings-group">
          <h3 class="settings-group-title">Import</h3>
          <div class="form-grid">
            <label class="field field-full">
              <span>JSON-Backup auswählen</span>
              <input type="file" accept="application/json,.json" data-import-file>
            </label>

            <fieldset class="choice-group field-full">
              <legend>Importmodus</legend>
              <label><input type="radio" name="importMode" value="merge" checked> Daten zusammenführen</label>
              <label><input type="radio" name="importMode" value="replace"> Vorhandene Daten ersetzen</label>
            </fieldset>

            <fieldset class="choice-group field-full">
              <legend>Bei doppelten Tagesdaten</legend>
              <label><input type="radio" name="conflictMode" value="existing" checked> Vorhandenen Eintrag behalten</label>
              <label><input type="radio" name="conflictMode" value="imported"> Importierten Eintrag übernehmen</label>
            </fieldset>

            <div class="form-actions field-full">
              <button class="button" type="button" data-import-json>Import starten</button>
            </div>
          </div>
        </div>

        <div class="settings-group">
          <h3 class="settings-group-title">Wartung & Reset</h3>
          <div class="button-row">
            <button class="button secondary" type="button" data-seed-demo>Testdaten einfügen</button>
            <button class="button danger" type="button" data-delete-all>Alle lokalen Daten löschen</button>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-body">
        <h2 class="section-title">System & Module</h2>
        <div class="settings-group">
          <h3 class="settings-group-title">Bereiche</h3>
          <div class="button-row">
            <a class="button secondary" href="#/goals">Ziele verwalten</a>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-meta-row">
            <div>
              <h3 class="settings-group-title">App Version</h3>
              <p class="muted settings-note" style="margin: 0;">Fitness Tracker ${APP_VERSION_LABEL}</p>
            </div>
            <button class="button secondary" type="button" id="app-update-button">Updates prüfen</button>
          </div>
        </div>
      </div>
    </section>
  `;
  fragment.append(container);
  initializeSettings(container);
  return fragment;
}
