import { deleteBodyFatEntry, getBodyFatEntries, saveBodyFatEntry } from "../database.js";
import { calculateJacksonPollock3 } from "../calculations.js";
import { hasErrors, validateBodyFatForm } from "../validation.js";
import { formatDate, formatNumber, sortByDateDesc, toNumberOrNull, todayIsoDate } from "../utils.js";

function getFormValues(form) {
  const formData = new FormData(form);

  return {
    date: formData.get("date"),
    age: formData.get("age"),
    chest: formData.get("chest"),
    abdomen: formData.get("abdomen"),
    thigh: formData.get("thigh")
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

function normalizeBodyFatEntry(values, existingEntry) {
  const base = {
    id: existingEntry?.id,
    createdAt: existingEntry?.createdAt,
    date: values.date,
    age: toNumberOrNull(values.age),
    chest: toNumberOrNull(values.chest),
    abdomen: toNumberOrNull(values.abdomen),
    thigh: toNumberOrNull(values.thigh)
  };

  return {
    ...base,
    ...calculateJacksonPollock3(base)
  };
}

function renderResult(entry) {
  if (!entry) {
    return "";
  }

  return `
    <section class="card">
      <div class="card-body result-panel">
        <h2 class="section-title">Berechnetes Ergebnis</h2>
        <div class="metric-grid compact">
          <div>
            <p class="metric-label">Hautfaltensumme</p>
            <p class="metric-value">${formatNumber(entry.skinfoldSum, { maximumFractionDigits: 1 })} mm</p>
          </div>
          <div>
            <p class="metric-label">Körperdichte</p>
            <p class="metric-value">${formatNumber(entry.bodyDensity, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
          </div>
          <div>
            <p class="metric-label">Körperfettanteil</p>
            <p class="metric-value">${formatNumber(entry.bodyFatPercentage, { maximumFractionDigits: 1 })} %</p>
          </div>
        </div>
        <p class="muted">Zangenmessungen sind Schätzwerte. Miss möglichst immer unter vergleichbaren Bedingungen.</p>
      </div>
    </section>
  `;
}

function renderHistory(entries) {
  if (!entries.length) {
    return `
      <section class="card empty-state">
        <h2>Noch keine KFA-Messungen</h2>
        <p>Speichere deine erste Messung, dann erscheint sie hier.</p>
      </section>
    `;
  }

  return `
    <section class="card">
      <div class="card-body">
        <h2 class="section-title">Letzte Messungen</h2>
        <div class="entry-list">
          ${sortByDateDesc(entries)
            .map(
              (entry) => `
                <article class="entry-row" data-entry-id="${entry.id}">
                  <div>
                    <p class="entry-date">${formatDate(entry.date)}</p>
                    <p class="entry-meta">
                      ${formatNumber(entry.bodyFatPercentage, { maximumFractionDigits: 1 })} % KFA &middot;
                      ${formatNumber(entry.skinfoldSum, { maximumFractionDigits: 1 })} mm Summe
                    </p>
                    <p class="entry-note">
                      Brust ${formatNumber(entry.chest, { maximumFractionDigits: 1 })} mm &middot;
                      Bauch ${formatNumber(entry.abdomen, { maximumFractionDigits: 1 })} mm &middot;
                      Oberschenkel ${formatNumber(entry.thigh, { maximumFractionDigits: 1 })} mm
                    </p>
                  </div>
                  <div class="entry-actions">
                    <button class="icon-button" type="button" data-action="edit" aria-label="Messung bearbeiten">Bearbeiten</button>
                    <button class="icon-button danger" type="button" data-action="delete" aria-label="Messung löschen">Löschen</button>
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
  form.elements.age.value = entry.age ?? "";
  form.elements.chest.value = entry.chest ?? "";
  form.elements.abdomen.value = entry.abdomen ?? "";
  form.elements.thigh.value = entry.thigh ?? "";
  form.dataset.editingId = entry.id;
  cardBody.querySelector("[data-form-mode]").textContent = "Messung bearbeiten";
  form.querySelector("[data-submit-label]").textContent = "Änderungen speichern";
}

function resetForm(form) {
  const cardBody = form.closest(".card-body");
  form.reset();
  form.elements.date.value = todayIsoDate();
  delete form.dataset.editingId;
  cardBody.querySelector("[data-form-mode]").textContent = "Neue KFA-Messung";
  form.querySelector("[data-submit-label]").textContent = "Berechnen und speichern";
}

async function refreshHistory(container) {
  const history = container.querySelector("[data-history]");
  const entries = await getBodyFatEntries();
  history.innerHTML = renderHistory(entries);
  return entries;
}

function showStatus(container, message, type = "success") {
  const status = container.querySelector("[data-status]");
  status.innerHTML = message ? `<div class="alert ${type}" role="status"><p>${message}</p></div>` : "";
}

function showResult(container, entry) {
  const result = container.querySelector("[data-result]");
  result.innerHTML = renderResult(entry);
}

async function initializeBodyFatView(container) {
  const form = container.querySelector("[data-body-fat-form]");
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
    const errors = validateBodyFatForm(values);
    errorSlot.innerHTML = renderErrorList(errors);

    if (hasErrors(errors)) {
      return;
    }

    const existingEntry = entries.find((entry) => entry.id === form.dataset.editingId);
    const entryData = normalizeBodyFatEntry(values, existingEntry);

    try {
      const savedEntry = await saveBodyFatEntry(entryData);
      showResult(container, savedEntry);
      resetForm(form);
      entries = await refreshHistory(container);
      showStatus(container, "KFA-Messung gespeichert.");
    } catch (error) {
      console.error(error);
      showStatus(container, "Die KFA-Messung konnte nicht gespeichert werden.", "danger");
    }
  });

  form.querySelector("[data-reset-form]").addEventListener("click", () => {
    errorSlot.innerHTML = "";
    showResult(container, null);
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
      showResult(container, entry);
      errorSlot.innerHTML = "";
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (button.dataset.action === "delete") {
      const confirmed = window.confirm(`Messung vom ${formatDate(entry.date)} wirklich löschen?`);

      if (!confirmed) {
        return;
      }

      try {
        await deleteBodyFatEntry(entry.id);
        entries = await refreshHistory(container);
        showStatus(container, "Messung gelöscht.");
        showResult(container, null);
      } catch (error) {
        console.error(error);
        showStatus(container, "Die Messung konnte nicht gelöscht werden.", "danger");
      }
    }
  });
}

export function renderBodyFat() {
  const fragment = document.createDocumentFragment();
  const container = document.createElement("section");
  container.className = "view-stack";
  container.innerHTML = `
    <section class="card">
      <div class="card-body">
        <h2 class="section-title" data-form-mode>Neue KFA-Messung</h2>
        <div data-errors></div>
        <div data-status></div>
        <form class="form-grid" data-body-fat-form novalidate>
          <label class="field">
            <span>Datum</span>
            <input type="date" name="date" required>
          </label>

          <label class="field">
            <span>Alter</span>
            <input type="number" name="age" min="15" max="100" step="1" inputmode="numeric" placeholder="35" required>
          </label>

          <label class="field">
            <span>Brustfalte in mm</span>
            <input type="text" name="chest" inputmode="decimal" pattern="[0-9]+([,.][0-9]+)?" placeholder="12" required>
          </label>

          <label class="field">
            <span>Bauchfalte in mm</span>
            <input type="text" name="abdomen" inputmode="decimal" pattern="[0-9]+([,.][0-9]+)?" placeholder="24" required>
          </label>

          <label class="field">
            <span>Oberschenkelfalte in mm</span>
            <input type="text" name="thigh" inputmode="decimal" pattern="[0-9]+([,.][0-9]+)?" placeholder="18" required>
          </label>

          <div class="form-actions field-full">
            <button class="button" type="submit" data-submit-label>Berechnen und speichern</button>
            <button class="button secondary" type="button" data-reset-form>Zurücksetzen</button>
          </div>
        </form>
      </div>
    </section>

    <div data-result></div>

    <div data-history>
      <section class="card empty-state">
        <h2>Messungen werden geladen</h2>
        <p>Einen Moment bitte.</p>
      </section>
    </div>
  `;
  fragment.append(container);
  initializeBodyFatView(container);
  return fragment;
}
