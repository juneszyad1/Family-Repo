import { getSettings, saveSettings } from "../database.js";
import { deleteEverything, exportDailyCsv, exportJsonBackup, importBackup, readJsonFile } from "../export-import.js";
import { toNumberOrNull } from "../utils.js";

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
        `Backup bereit: ${pendingImport.dailyEntries.length} Tagesdaten und ${pendingImport.bodyFatEntries.length} KFA-Messungen.`
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
    <section class="card">
      <div class="card-body">
        <h2 class="section-title">Persönliche Ziele</h2>
        <div data-status></div>
        <form class="form-grid" data-settings-form>
          <label class="field">
            <span>Kalorienziel pro Tag</span>
            <input type="number" name="calorieTarget" min="0" max="15000" step="1" inputmode="numeric" required>
          </label>

          <label class="field">
            <span>Proteinziel pro Tag</span>
            <input type="number" name="proteinTarget" min="0" max="1000" step="1" inputmode="numeric" required>
          </label>

          <label class="field">
            <span>Zielgewicht in kg</span>
            <input type="number" name="targetWeight" min="20" max="400" step="0.1" inputmode="decimal">
          </label>

          <label class="field">
            <span>Ziel-KFA in %</span>
            <input type="number" name="targetBodyFat" min="1" max="80" step="0.1" inputmode="decimal">
          </label>

          <label class="field">
            <span>Standardalter für KFA</span>
            <input type="number" name="defaultAge" min="15" max="100" step="1" inputmode="numeric">
          </label>

          <label class="field">
            <span>Darstellung</span>
            <select name="theme">
              <option value="system">Systemeinstellung</option>
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
              <option value="pink">Pink Fancy</option>
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
        <h2 class="section-title">Daten exportieren</h2>
        <div class="button-row">
          <button class="button" type="button" data-export-json>JSON-Backup</button>
          <button class="button secondary" type="button" data-export-csv>CSV Tagesdaten</button>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-body">
        <h2 class="section-title">Daten importieren</h2>
        <p class="muted settings-note">Importiere nur Backups, die von dieser App exportiert wurden.</p>
        <div class="form-grid">
          <label class="field field-full">
            <span>JSON-Datei</span>
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
    </section>

    <section class="card">
      <div class="card-body">
        <h2 class="section-title">Alle Daten löschen</h2>
        <p class="muted settings-note">Diese Aktion entfernt alle lokalen Tagesdaten, KFA-Messungen und Einstellungen auf diesem Gerät.</p>
        <button class="button danger" type="button" data-delete-all>Alles löschen</button>
      </div>
    </section>
  `;
  fragment.append(container);
  initializeSettings(container);
  return fragment;
}
