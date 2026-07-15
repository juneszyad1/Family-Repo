import { deleteDailyEntry, getDailyEntries, saveDailyEntry } from "../database.js";
import { hasErrors, validateDailyEntryForm } from "../validation.js";
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

async function refreshHistory(container) {
  const history = container.querySelector("[data-history]");
  const entries = await getDailyEntries();
  history.innerHTML = renderHistory(entries);
  return entries;
}

function showStatus(container, message, type = "success") {
  const status = container.querySelector("[data-status]");
  status.innerHTML = message ? `<div class="alert ${type}" role="status"><p>${message}</p></div>` : "";
}

async function initializeDailyView(container) {
  const form = container.querySelector("[data-daily-form]");
  const errorSlot = container.querySelector("[data-errors]");
  let entries = [];

  form.elements.date.value = todayIsoDate();

  try {
    entries = await refreshHistory(container);
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
}

export function renderDailyEntry() {
  const fragment = document.createDocumentFragment();
  const container = document.createElement("section");
  container.className = "view-stack";
  container.innerHTML = `
    <section class="card">
      <div class="card-body">
        <h2 class="section-title" data-form-mode>Neuer Tagesdatensatz</h2>
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

    <div data-history>
      <section class="card empty-state">
        <h2>Einträge werden geladen</h2>
        <p>Einen Moment bitte.</p>
      </section>
    </div>
  `;
  fragment.append(container);
  initializeDailyView(container);
  return fragment;
}
