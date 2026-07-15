import {
  deleteCircumferenceEntry,
  deleteDailyEntry,
  getCircumferenceEntries,
  getDailyEntries,
  saveCircumferenceEntry,
  saveDailyEntry
} from "../database.js";
import { hasErrors, validateCircumferenceForm, validateDailyEntryForm } from "../validation.js";
import { escapeHtml, formatDate, formatNumber, sortByDateDesc, toNumberOrNull, todayIsoDate } from "../utils.js";

function getFormValues(form) {
  const formData = new FormData(form);

  return {
    date: formData.get("date"),
    weight: formData.get("weight"),
    calories: formData.get("calories"),
    protein: formData.get("protein"),
    note: formData.get("note")?.trim() || ""
  };
}

function normalizeDailyEntry(values) {
  return {
    date: values.date,
    weight: toNumberOrNull(values.weight),
    calories: toNumberOrNull(values.calories),
    protein: toNumberOrNull(values.protein),
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

function renderErrorList(errors) {
  const messages = Object.values(errors);

  if (!messages.length) {
    return "";
  }

  return `
    <div class="alert danger" role="alert">
      ${messages.map((message) => `<p>${message}</p>`).join("")}
    </div>
  `;
}

function renderHistory(entries) {
  if (!entries.length) {
    return `
      <section class="card empty-state">
        <h2>Noch keine Einträge</h2>
        <p>Speichere deinen ersten Tagesdatensatz, dann erscheint er hier.</p>
      </section>
    `;
  }

  return `
    <section class="card">
      <div class="card-body">
        <h2 class="section-title">Letzte Einträge</h2>
        <div class="entry-list">
          ${sortByDateDesc(entries)
            .map(
              (entry) => `
                <article class="entry-row" data-entry-id="${entry.id}">
                  <div>
                    <p class="entry-date">${formatDate(entry.date)}</p>
                    <p class="entry-meta">
                      ${formatNumber(entry.weight, { maximumFractionDigits: 1 })} kg &middot;
                      ${formatNumber(entry.calories, { maximumFractionDigits: 0 })} kcal &middot;
                      ${formatNumber(entry.protein, { maximumFractionDigits: 0 })} g Protein
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
      </div>
    </section>
  `;
}

function renderCircumferenceHistory(entries) {
  if (!entries.length) {
    return `
      <section class="card empty-state">
        <h2>Noch keine Umfangmessungen</h2>
        <p>Speichere Arm- oder Beinumfang, dann erscheint der Verlauf hier.</p>
      </section>
    `;
  }

  return `
    <section class="card">
      <div class="card-body">
        <h2 class="section-title">Letzte Umfangmessungen</h2>
        <div class="entry-list">
          ${sortByDateDesc(entries)
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

async function refreshHistory(container) {
  const history = container.querySelector("[data-history]");
  const entries = await getDailyEntries();
  history.innerHTML = renderHistory(entries);
  return entries;
}

async function refreshCircumferenceHistory(container) {
  const history = container.querySelector("[data-circumference-history]");
  const entries = await getCircumferenceEntries();
  history.innerHTML = renderCircumferenceHistory(entries);
  return entries;
}

function showStatus(container, message, type = "success") {
  const status = container.querySelector("[data-status]");
  status.innerHTML = message ? `<div class="alert ${type}" role="status"><p>${message}</p></div>` : "";
}

async function initializeDailyView(container) {
  const form = container.querySelector("[data-daily-form]");
  const circumferenceForm = container.querySelector("[data-circumference-form]");
  const errorSlot = container.querySelector("[data-errors]");
  const circumferenceErrorSlot = container.querySelector("[data-circumference-errors]");
  let entries = [];
  let circumferenceEntries = [];

  form.elements.date.value = todayIsoDate();
  circumferenceForm.elements.date.value = todayIsoDate();

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
    errorSlot.innerHTML = renderErrorList(errors);

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
      entries = await refreshHistory(container);
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
    circumferenceErrorSlot.innerHTML = renderErrorList(errors);

    if (hasErrors(errors)) {
      return;
    }

    try {
      await saveCircumferenceEntry(normalizeCircumferenceEntry(values));
      resetCircumferenceForm(circumferenceForm);
      circumferenceEntries = await refreshCircumferenceHistory(container);
      showStatus(container, "Umfangmessung gespeichert.");
    } catch (error) {
      console.error(error);
      showStatus(container, "Die Umfangmessung konnte nicht gespeichert werden.", "danger");
    }
  });

  circumferenceForm.querySelector("[data-reset-circumference-form]").addEventListener("click", () => {
    circumferenceErrorSlot.innerHTML = "";
    resetCircumferenceForm(circumferenceForm);
    showStatus(container, "");
  });

  form.querySelector("[data-reset-form]").addEventListener("click", () => {
    errorSlot.innerHTML = "";
    resetForm(form);
    showStatus(container, "");
  });

  container.addEventListener("click", async (event) => {
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
      errorSlot.innerHTML = "";
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
        entries = await refreshHistory(container);
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
      setCircumferenceFormEntry(circumferenceForm, entry);
      circumferenceErrorSlot.innerHTML = "";
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
        circumferenceEntries = await refreshCircumferenceHistory(container);
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
    <section class="card">
      <div class="card-body">
        <h2 class="section-title" data-form-mode>Neuer Tagesdatensatz</h2>
        <div class="inline-action-panel">
          <p class="muted">KFA-Messungen erfasst du separat mit der 3-Falten-Methode.</p>
          <a class="button secondary" href="#/body-fat">KFA eintragen</a>
        </div>
        <div data-errors></div>
        <div data-status></div>
        <form class="form-grid" data-daily-form novalidate>
          <label class="field">
            <span>Datum</span>
            <input type="date" name="date" required>
          </label>

          <label class="field">
            <span>Gewicht in kg</span>
            <input type="text" name="weight" inputmode="decimal" pattern="[0-9]+([,.][0-9]+)?" placeholder="92,4">
          </label>

          <label class="field">
            <span>Kalorien in kcal</span>
            <input type="number" name="calories" min="0" max="15000" step="1" inputmode="numeric" placeholder="2150">
          </label>

          <label class="field">
            <span>Protein in g</span>
            <input type="number" name="protein" min="0" max="1000" step="1" inputmode="numeric" placeholder="154">
          </label>

          <label class="field field-full">
            <span>Notiz</span>
            <textarea name="note" rows="3" placeholder="Optional"></textarea>
          </label>

          <div class="form-actions field-full">
            <button class="button" type="submit" data-submit-label>Speichern</button>
            <button class="button secondary" type="button" data-reset-form>Zurücksetzen</button>
          </div>
        </form>
      </div>
    </section>

    <section class="card">
      <div class="card-body">
        <h2 class="section-title" data-circumference-form-mode>Neue Umfangmessung</h2>
        <p class="muted settings-note">Arm- und Beinumfang zählen nur als Progress-Tracking und werden nicht für die KFA-Berechnung verwendet.</p>
        <div data-circumference-errors></div>
        <form class="form-grid" data-circumference-form novalidate>
          <label class="field">
            <span>Datum</span>
            <input type="date" name="date" required>
          </label>

          <label class="field">
            <span>Armumfang in cm</span>
            <input type="text" name="arm" inputmode="decimal" pattern="[0-9]+([,.][0-9]+)?" placeholder="34,5">
          </label>

          <label class="field">
            <span>Beinumfang in cm</span>
            <input type="text" name="leg" inputmode="decimal" pattern="[0-9]+([,.][0-9]+)?" placeholder="58,0">
          </label>

          <label class="field field-full">
            <span>Notiz</span>
            <textarea name="note" rows="2" placeholder="Optional"></textarea>
          </label>

          <div class="form-actions field-full">
            <button class="button" type="submit" data-circumference-submit-label>Umfang speichern</button>
            <button class="button secondary" type="button" data-reset-circumference-form>Zurücksetzen</button>
          </div>
        </form>
      </div>
    </section>

    <div data-history>
      <section class="card empty-state">
        <h2>Einträge werden geladen</h2>
        <p>Einen Moment bitte.</p>
      </section>
    </div>

    <div data-circumference-history>
      <section class="card empty-state">
        <h2>Umfangmessungen werden geladen</h2>
        <p>Einen Moment bitte.</p>
      </section>
    </div>
  `;
  fragment.append(container);
  initializeDailyView(container);
  return fragment;
}
