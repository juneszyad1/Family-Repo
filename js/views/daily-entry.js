import {
  deleteCircumferenceEntry,
  deleteDailyEntry,
  getCircumferenceEntries,
  getDailyEntries,
  saveCircumferenceEntry,
  saveDailyEntry
} from "../database.js";
import { hasErrors, sanitizeNumericInputValue, validateCircumferenceForm, validateDailyEntryForm } from "../validation.js";
import { escapeHtml, formatDate, formatNumber, sortByDateDesc, toNumberOrNull, todayIsoDate } from "../utils.js";

function getFormValues(form) {
  const formData = new FormData(form);

  return {
    date: formData.get("date"),
    weight: formData.get("weight"),
    calories: formData.get("calories"),
    protein: formData.get("protein"),
    sleepHours: formData.get("sleepHours"),
    note: formData.get("note")?.trim() || ""
  };
}

function normalizeDailyEntry(values) {
  return {
    date: values.date,
    weight: toNumberOrNull(values.weight),
    calories: toNumberOrNull(values.calories),
    protein: toNumberOrNull(values.protein),
    sleepHours: toNumberOrNull(values.sleepHours),
    note: values.note
  };
}

function getCircumferenceFormValues(form) {
  const formData = new FormData(form);

  return {
    date: formData.get("date"),
    arm: formData.get("arm"),
    leg: formData.get("leg"),
    note: formData.get("note")?.trim() || ""
  };
}

function normalizeCircumferenceEntry(values) {
  return {
    date: values.date,
    arm: toNumberOrNull(values.arm),
    leg: toNumberOrNull(values.leg),
    note: values.note
  };
}

function clearFormErrors(form, errorSlot) {
  errorSlot.innerHTML = "";
  form.querySelectorAll("[aria-invalid]").forEach((field) => {
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
  });
  form.querySelectorAll(".field-error").forEach((error) => error.remove());
}

export function applyFormErrors(form, errors, errorSlot) {
  clearFormErrors(form, errorSlot);
  let firstInvalidField = null;

  Object.entries(errors).forEach(([fieldName, message]) => {
    if (fieldName === "form") {
      errorSlot.innerHTML = `<div class="alert danger" role="alert"><p>${escapeHtml(message)}</p></div>`;
      return;
    }

    const field = form.elements.namedItem(fieldName);
    const wrapper = field?.closest(".field, .grouped-input-row");
    if (!field || !wrapper) return;
    const errorId = `${form.dataset.errorScope}-${fieldName}-error`;
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", errorId);
    wrapper.insertAdjacentHTML("beforeend", `<span class="field-error" id="${errorId}">${escapeHtml(message)}</span>`);
    firstInvalidField ||= field;
  });

  (firstInvalidField || (errors.form ? form.querySelector("input, textarea, select") : null))?.focus();
}

function renderHistory(entries, expanded = false) {
  if (!entries.length) {
    return `
      <section class="card empty-state">
        <h2>Noch keine Einträge</h2>
        <p>Speichere deinen ersten Tagesdatensatz, dann erscheint er hier.</p>
      </section>
    `;
  }

  const sortedEntries = sortByDateDesc(entries);
  const visibleEntries = expanded ? sortedEntries : sortedEntries.slice(0, 3);
  return `
    <section class="card">
      <div class="card-body">
        <h2 class="section-title">Letzte Einträge</h2>
        <div class="entry-list">
          ${visibleEntries
            .map(
              (entry) => `
                <article class="entry-row" data-entry-id="${entry.id}">
                  <div>
                    <p class="entry-date">${formatDate(entry.date)}</p>
                    <p class="entry-meta">
                      ${formatNumber(entry.weight, { maximumFractionDigits: 1 })} kg &middot;
                      ${formatNumber(entry.calories, { maximumFractionDigits: 0 })} kcal &middot;
                      ${formatNumber(entry.protein, { maximumFractionDigits: 0 })} g Protein &middot;
                      ${formatNumber(entry.sleepHours, { maximumFractionDigits: 1 })} h Schlaf
                    </p>
                    ${entry.note ? `<p class="entry-note">${escapeHtml(entry.note)}</p>` : ""}
                  </div>
                  <div class="entry-actions">
                    <button class="icon-button" type="button" data-action="edit" aria-label="Eintrag bearbeiten">Bearbeiten</button>
                    <button class="icon-button danger" type="button" data-action="delete" aria-label="Eintrag löschen">Löschen</button>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
        ${entries.length > 3 ? `<button class="button secondary history-toggle" type="button" data-toggle-history>${expanded ? "Weniger anzeigen" : `Alle ${entries.length} anzeigen`}</button>` : ""}
      </div>
    </section>
  `;
}

function renderCircumferenceHistory(entries, expanded = false) {
  if (!entries.length) {
    return `
      <section class="card empty-state">
        <h2>Noch keine Umfangmessungen</h2>
        <p>Speichere Arm- oder Beinumfang, dann erscheint der Verlauf hier.</p>
      </section>
    `;
  }

  const sortedEntries = sortByDateDesc(entries);
  const visibleEntries = expanded ? sortedEntries : sortedEntries.slice(0, 3);
  return `
    <section class="card">
      <div class="card-body">
        <h2 class="section-title">Letzte Umfangmessungen</h2>
        <div class="entry-list">
          ${visibleEntries
            .map(
              (entry) => `
                <article class="entry-row" data-circumference-id="${entry.id}">
                  <div>
                    <p class="entry-date">${formatDate(entry.date)}</p>
                    <p class="entry-meta">
                      Arm ${formatNumber(entry.arm, { maximumFractionDigits: 1 })} cm &middot;
                      Bein ${formatNumber(entry.leg, { maximumFractionDigits: 1 })} cm
                    </p>
                    ${entry.note ? `<p class="entry-note">${escapeHtml(entry.note)}</p>` : ""}
                  </div>
                  <div class="entry-actions">
                    <button class="icon-button" type="button" data-circumference-action="edit" aria-label="Umfangmessung bearbeiten">Bearbeiten</button>
                    <button class="icon-button danger" type="button" data-circumference-action="delete" aria-label="Umfangmessung löschen">Löschen</button>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
        ${entries.length > 3 ? `<button class="button secondary history-toggle" type="button" data-toggle-circumference-history>${expanded ? "Weniger anzeigen" : `Alle ${entries.length} anzeigen`}</button>` : ""}
      </div>
    </section>
  `;
}

function setFormEntry(form, entry) {
  const cardBody = form.closest(".card-body");
  form.elements.date.value = entry.date;
  form.elements.weight.value = entry.weight ?? "";
  form.elements.calories.value = entry.calories ?? "";
  form.elements.protein.value = entry.protein ?? "";
  form.elements.sleepHours.value = entry.sleepHours ?? "";
  form.elements.note.value = entry.note ?? "";
  form.dataset.editingDate = entry.date;
  cardBody.querySelector("[data-form-mode]").textContent = "Eintrag bearbeiten";
  form.querySelector("[data-submit-label]").textContent = "Änderungen speichern";
}

function resetForm(form) {
  const cardBody = form.closest(".card-body");
  form.reset();
  form.elements.date.value = todayIsoDate();
  delete form.dataset.editingDate;
  cardBody.querySelector("[data-form-mode]").textContent = "Neuer Tagesdatensatz";
  form.querySelector("[data-submit-label]").textContent = "Speichern";
}

function setCircumferenceFormEntry(form, entry) {
  const cardBody = form.closest(".card-body");
  form.elements.date.value = entry.date;
  form.elements.arm.value = entry.arm ?? "";
  form.elements.leg.value = entry.leg ?? "";
  form.elements.note.value = entry.note ?? "";
  form.dataset.editingId = entry.id;
  cardBody.querySelector("[data-circumference-form-mode]").textContent = "Umfangmessung bearbeiten";
  form.querySelector("[data-circumference-submit-label]").textContent = "Änderungen speichern";
}

function resetCircumferenceForm(form) {
  const cardBody = form.closest(".card-body");
  form.reset();
  form.elements.date.value = todayIsoDate();
  delete form.dataset.editingId;
  cardBody.querySelector("[data-circumference-form-mode]").textContent = "Neue Umfangmessung";
  form.querySelector("[data-circumference-submit-label]").textContent = "Umfang speichern";
}

async function refreshHistory(container, expanded = false) {
  const history = container.querySelector("[data-history]");
  const entries = await getDailyEntries();
  history.innerHTML = renderHistory(entries, expanded);
  return entries;
}

async function refreshCircumferenceHistory(container, expanded = false) {
  const history = container.querySelector("[data-circumference-history]");
  const entries = await getCircumferenceEntries();
  history.innerHTML = renderCircumferenceHistory(entries, expanded);
  return entries;
}

function showStatus(container, message, type = "success") {
  const status = container.querySelector("[data-status]");
  status.innerHTML = message ? `<div class="alert ${type}" role="status"><p>${message}</p></div>` : "";
}

function sanitizeNumericInput(input) {
  const cursorPosition = input.selectionStart ?? input.value.length;
  const allowDecimal = input.dataset.numeric === "decimal";
  const prefix = input.value.slice(0, cursorPosition);
  const sanitizedValue = sanitizeNumericInputValue(input.value, allowDecimal);
  const sanitizedPrefix = sanitizeNumericInputValue(prefix, allowDecimal);

  if (sanitizedValue === input.value) {
    return;
  }

  input.value = sanitizedValue;
  input.setSelectionRange(sanitizedPrefix.length, sanitizedPrefix.length);
}

async function initializeDailyView(container) {
  const form = container.querySelector("[data-daily-form]");
  const circumferenceForm = container.querySelector("[data-circumference-form]");
  const errorSlot = container.querySelector("[data-errors]");
  const circumferenceErrorSlot = container.querySelector("[data-circumference-errors]");
  let entries = [];
  let circumferenceEntries = [];
  let historyExpanded = false;
  let circumferenceHistoryExpanded = false;

  form.elements.date.value = todayIsoDate();
  circumferenceForm.elements.date.value = todayIsoDate();

  container.addEventListener("input", (event) => {
    if (event.target.matches("[data-numeric]")) {
      sanitizeNumericInput(event.target);
    }
  });

  try {
    entries = await refreshHistory(container);
    circumferenceEntries = await refreshCircumferenceHistory(container);
  } catch (error) {
    console.error(error);
    showStatus(container, "Die lokale Datenbank konnte nicht geöffnet werden.", "danger");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = getFormValues(form);
    const errors = validateDailyEntryForm(values);
    applyFormErrors(form, errors, errorSlot);

    if (hasErrors(errors)) {
      return;
    }

    try {
      const previousDate = form.dataset.editingDate;
      const savedEntry = await saveDailyEntry(normalizeDailyEntry(values));

      if (previousDate && previousDate !== savedEntry.date) {
        const previousEntry = entries.find((entry) => entry.date === previousDate);
        if (previousEntry) {
          await deleteDailyEntry(previousEntry.id);
        }
      }

      resetForm(form);
      clearFormErrors(form, errorSlot);
      entries = await refreshHistory(container, historyExpanded);
      showStatus(container, "Tagesdaten gespeichert.");
    } catch (error) {
      console.error(error);
      showStatus(container, "Die Tagesdaten konnten nicht gespeichert werden.", "danger");
    }
  });

  circumferenceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = getCircumferenceFormValues(circumferenceForm);
    const errors = validateCircumferenceForm(values);
    applyFormErrors(circumferenceForm, errors, circumferenceErrorSlot);

    if (hasErrors(errors)) {
      return;
    }

    try {
      await saveCircumferenceEntry(normalizeCircumferenceEntry(values));
      resetCircumferenceForm(circumferenceForm);
      clearFormErrors(circumferenceForm, circumferenceErrorSlot);
      circumferenceEntries = await refreshCircumferenceHistory(container, circumferenceHistoryExpanded);
      showStatus(container, "Umfangmessung gespeichert.");
    } catch (error) {
      console.error(error);
      showStatus(container, "Die Umfangmessung konnte nicht gespeichert werden.", "danger");
    }
  });

  circumferenceForm.querySelector("[data-reset-circumference-form]").addEventListener("click", () => {
    clearFormErrors(circumferenceForm, circumferenceErrorSlot);
    resetCircumferenceForm(circumferenceForm);
    showStatus(container, "");
  });

  form.querySelector("[data-reset-form]").addEventListener("click", () => {
    clearFormErrors(form, errorSlot);
    resetForm(form);
    showStatus(container, "");
  });

  container.addEventListener("click", async (event) => {
    if (event.target.closest("[data-toggle-history]")) {
      historyExpanded = !historyExpanded;
      await refreshHistory(container, historyExpanded);
      return;
    }
    if (event.target.closest("[data-toggle-circumference-history]")) {
      circumferenceHistoryExpanded = !circumferenceHistoryExpanded;
      await refreshCircumferenceHistory(container, circumferenceHistoryExpanded);
      return;
    }
    const button = event.target.closest("[data-action]");
    const row = event.target.closest("[data-entry-id]");

    if (!button || !row) {
      return;
    }

    const entry = entries.find((item) => item.id === row.dataset.entryId);

    if (!entry) {
      return;
    }

    if (button.dataset.action === "edit") {
      setFormEntry(form, entry);
      clearFormErrors(form, errorSlot);
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (button.dataset.action === "delete") {
      const confirmed = window.confirm(`Eintrag vom ${formatDate(entry.date)} wirklich löschen?`);

      if (!confirmed) {
        return;
      }

      try {
        await deleteDailyEntry(entry.id);
        entries = await refreshHistory(container, historyExpanded);
        showStatus(container, "Eintrag gelöscht.");
      } catch (error) {
        console.error(error);
        showStatus(container, "Der Eintrag konnte nicht gelöscht werden.", "danger");
      }
    }
  });

  container.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-circumference-action]");
    const row = event.target.closest("[data-circumference-id]");

    if (!button || !row) {
      return;
    }

    const entry = circumferenceEntries.find((item) => item.id === row.dataset.circumferenceId);

    if (!entry) {
      return;
    }

    if (button.dataset.circumferenceAction === "edit") {
      circumferenceForm.closest("details").open = true;
      setCircumferenceFormEntry(circumferenceForm, entry);
      clearFormErrors(circumferenceForm, circumferenceErrorSlot);
      circumferenceForm.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (button.dataset.circumferenceAction === "delete") {
      const confirmed = window.confirm(`Umfangmessung vom ${formatDate(entry.date)} wirklich löschen?`);

      if (!confirmed) {
        return;
      }

      try {
        await deleteCircumferenceEntry(entry.id);
        circumferenceEntries = await refreshCircumferenceHistory(container, circumferenceHistoryExpanded);
        showStatus(container, "Umfangmessung gelöscht.");
      } catch (error) {
        console.error(error);
        showStatus(container, "Die Umfangmessung konnte nicht gelöscht werden.", "danger");
      }
    }
  });
}

export function renderDailyEntry() {
  const fragment = document.createDocumentFragment();
  const container = document.createElement("section");
  container.className = "view-stack";
  container.innerHTML = `
    <section class="card entry-composer">
      <div class="card-body">
        <div class="entry-composer-heading">
          <div><p class="metric-label">Daily check-in</p><h2 class="section-title" data-form-mode>Neuer Tagesdatensatz</h2></div>
          <p>Halte deine wichtigsten Werte in weniger als einer Minute fest.</p>
        </div>
        <div class="inline-action-panel">
          <p class="muted">KFA-Messungen erfasst du separat mit der 3-Falten-Methode.</p>
          <a class="button secondary" href="#/body-fat">KFA eintragen</a>
        </div>
        <div data-errors></div>
        <div data-status role="status" aria-live="polite" aria-atomic="true"></div>
        <form data-daily-form data-error-scope="daily" novalidate>
          <label class="field date-field-row">
            <span>Datum</span>
            <input type="date" name="date" required>
          </label>

          <div class="grouped-input-section">
            <label class="grouped-input-row">
              <span class="grouped-input-label">
                <span class="dot-indicator dot-primary"></span>
                Gewicht
              </span>
              <span class="grouped-input-control">
                <input type="text" name="weight" inputmode="decimal" pattern="[0-9]+([,.][0-9]+)?" data-numeric="decimal" placeholder="–">
                <span class="input-unit">kg</span>
              </span>
            </label>

            <label class="grouped-input-row">
              <span class="grouped-input-label">
                <span class="dot-indicator dot-warning"></span>
                Kalorien
              </span>
              <span class="grouped-input-control">
                <input type="text" name="calories" inputmode="numeric" pattern="[0-9]+" data-numeric="integer" placeholder="–">
                <span class="input-unit">kcal</span>
              </span>
            </label>

            <label class="grouped-input-row">
              <span class="grouped-input-label">
                <span class="dot-indicator dot-success"></span>
                Protein
              </span>
              <span class="grouped-input-control">
                <input type="text" name="protein" inputmode="numeric" pattern="[0-9]+" data-numeric="integer" placeholder="–">
                <span class="input-unit">g</span>
              </span>
            </label>

            <label class="grouped-input-row">
              <span class="grouped-input-label">
                <span class="dot-indicator dot-violet"></span>
                Schlafdauer
              </span>
              <span class="grouped-input-control">
                <input type="text" name="sleepHours" inputmode="decimal" pattern="[0-9]+([,.][0-9]+)?" data-numeric="decimal" placeholder="–">
                <span class="input-unit">Std.</span>
              </span>
            </label>
          </div>

          <label class="field note-field">
            <span>Notiz</span>
            <textarea name="note" rows="2" placeholder="Optional"></textarea>
          </label>

          <div class="form-actions">
            <button class="button" type="submit" data-submit-label>Speichern</button>
            <button class="button secondary" type="button" data-reset-form>Zurücksetzen</button>
          </div>
        </form>
      </div>
    </section>

    <div data-history>
      <section class="card skeleton" aria-label="Einträge werden geladen"></section>
    </div>

    <details class="secondary-section">
      <summary>Umfang messen und Verlauf anzeigen</summary>
      <section class="card entry-composer secondary-composer">
      <div class="card-body">
        <h2 class="section-title" data-circumference-form-mode>Neue Umfangmessung</h2>
        <p class="muted settings-note">Arm- und Beinumfang zählen nur als Progress-Tracking und werden nicht für die KFA-Berechnung verwendet.</p>
        <div data-circumference-errors></div>
        <form data-circumference-form data-error-scope="circumference" novalidate>
          <label class="field date-field-row">
            <span>Datum</span>
            <input type="date" name="date" required>
          </label>

          <div class="grouped-input-section">
            <label class="grouped-input-row">
              <span class="grouped-input-label">
                <span class="dot-indicator dot-primary"></span>
                Armumfang
              </span>
              <span class="grouped-input-control">
                <input type="text" name="arm" inputmode="decimal" pattern="[0-9]+([,.][0-9]+)?" data-numeric="decimal" placeholder="–">
                <span class="input-unit">cm</span>
              </span>
            </label>

            <label class="grouped-input-row">
              <span class="grouped-input-label">
                <span class="dot-indicator dot-success"></span>
                Beinumfang
              </span>
              <span class="grouped-input-control">
                <input type="text" name="leg" inputmode="decimal" pattern="[0-9]+([,.][0-9]+)?" data-numeric="decimal" placeholder="–">
                <span class="input-unit">cm</span>
              </span>
            </label>
          </div>

          <label class="field note-field">
            <span>Notiz</span>
            <textarea name="note" rows="2" placeholder="Optional"></textarea>
          </label>

          <div class="form-actions">
            <button class="button" type="submit" data-circumference-submit-label>Umfang speichern</button>
            <button class="button secondary" type="button" data-reset-circumference-form>Zurücksetzen</button>
          </div>
        </form>
      </div>
      </section>

      <div data-circumference-history>
        <section class="card skeleton" aria-label="Umfangmessungen werden geladen"></section>
      </div>
    </details>
  `;
  fragment.append(container);
  initializeDailyView(container);
  return fragment;
}
