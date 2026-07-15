import { deleteProgressPhoto, getProgressPhotos, saveProgressPhoto } from "../database.js";
import { escapeHtml, formatDate, todayIsoDate } from "../utils.js";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

function showStatus(container, message, type = "success") {
  const status = container.querySelector("[data-status]");
  status.innerHTML = message ? `<div class="alert ${type}" role="status"><p>${message}</p></div>` : "";
}

function formatFileSize(size) {
  if (!size) {
    return "";
  }

  return `${(size / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function renderPhotoList(photos) {
  if (!photos.length) {
    return `
      <section class="card empty-state">
        <h2>Noch keine Fortschrittsbilder</h2>
        <p>Lade dein erstes Bild hoch, um visuelle Veränderungen pro Tag festzuhalten.</p>
      </section>
    `;
  }

  return `
    <section class="photo-grid">
      ${[...photos]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
        .map((photo) => {
          const imageUrl = URL.createObjectURL(photo.image);

          return `
            <article class="card photo-card" data-photo-id="${photo.id}">
              <img src="${imageUrl}" alt="Fortschrittsbild vom ${formatDate(photo.date)}" loading="lazy">
              <div class="card-body">
                <p class="entry-date">${formatDate(photo.date)}</p>
                <p class="entry-meta">${escapeHtml(photo.imageName || "Bild")} ${formatFileSize(photo.imageSize)}</p>
                ${photo.note ? `<p class="entry-note">${escapeHtml(photo.note)}</p>` : ""}
                <button class="button danger" type="button" data-delete-photo>Bild löschen</button>
              </div>
            </article>
          `;
        })
        .join("")}
    </section>
  `;
}

function validatePhotoForm(values) {
  const errors = [];

  if (!values.date) {
    errors.push("Bitte ein Datum auswählen.");
  }

  if (!values.file) {
    errors.push("Bitte ein Bild auswählen.");
  } else if (!values.file.type.startsWith("image/")) {
    errors.push("Bitte eine Bilddatei auswählen.");
  } else if (values.file.size > MAX_IMAGE_SIZE) {
    errors.push("Das Bild darf maximal 8 MB groß sein.");
  }

  return errors;
}

function renderErrors(errors) {
  if (!errors.length) {
    return "";
  }

  return `
    <div class="alert danger" role="alert">
      ${errors.map((error) => `<p>${error}</p>`).join("")}
    </div>
  `;
}

async function refreshPhotos(container) {
  const photos = await getProgressPhotos();
  container.querySelector("[data-photo-list]").innerHTML = renderPhotoList(photos);
  return photos;
}

async function initializeProgressPhotos(container) {
  const form = container.querySelector("[data-photo-form]");
  const errorSlot = container.querySelector("[data-errors]");
  let photos = [];

  form.elements.date.value = todayIsoDate();

  try {
    photos = await refreshPhotos(container);
  } catch (error) {
    console.error(error);
    showStatus(container, "Fortschrittsbilder konnten nicht geladen werden.", "danger");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const file = formData.get("image");
    const values = {
      date: formData.get("date"),
      file: file instanceof File && file.size ? file : null,
      note: formData.get("note")?.trim() || ""
    };
    const errors = validatePhotoForm(values);
    errorSlot.innerHTML = renderErrors(errors);

    if (errors.length) {
      return;
    }

    try {
      await saveProgressPhoto({
        date: values.date,
        image: values.file,
        imageType: values.file.type,
        imageName: values.file.name,
        imageSize: values.file.size,
        note: values.note
      });
      form.reset();
      form.elements.date.value = todayIsoDate();
      photos = await refreshPhotos(container);
      showStatus(container, "Fortschrittsbild gespeichert.");
    } catch (error) {
      console.error(error);
      showStatus(container, "Fortschrittsbild konnte nicht gespeichert werden.", "danger");
    }
  });

  container.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-photo]");
    const card = event.target.closest("[data-photo-id]");

    if (!button || !card) {
      return;
    }

    const photo = photos.find((item) => item.id === card.dataset.photoId);
    const confirmed = window.confirm(`Fortschrittsbild vom ${formatDate(photo?.date)} wirklich löschen?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteProgressPhoto(card.dataset.photoId);
      photos = await refreshPhotos(container);
      showStatus(container, "Fortschrittsbild gelöscht.");
    } catch (error) {
      console.error(error);
      showStatus(container, "Fortschrittsbild konnte nicht gelöscht werden.", "danger");
    }
  });
}

export function renderProgressPhotos() {
  const fragment = document.createDocumentFragment();
  const container = document.createElement("section");
  container.className = "view-stack";
  container.innerHTML = `
    <section class="card">
      <div class="card-body">
        <h2 class="section-title">Fortschrittsbild hochladen</h2>
        <p class="muted settings-note">Bilder werden lokal auf diesem Gerät gespeichert und im JSON-Backup mitgesichert.</p>
        <div data-errors></div>
        <div data-status></div>
        <form class="form-grid" data-photo-form novalidate>
          <label class="field">
            <span>Datum</span>
            <input type="date" name="date" required>
          </label>

          <label class="field field-full">
            <span>Bild</span>
            <input type="file" name="image" accept="image/*" required>
          </label>

          <label class="field field-full">
            <span>Notiz</span>
            <textarea name="note" rows="2" placeholder="Optional"></textarea>
          </label>

          <div class="form-actions field-full">
            <button class="button" type="submit">Bild speichern</button>
            <a class="button secondary" href="#/trends">Zurück zu Trends</a>
          </div>
        </form>
      </div>
    </section>

    <div data-photo-list>
      <section class="card empty-state">
        <h2>Bilder werden geladen</h2>
        <p>Einen Moment bitte.</p>
      </section>
    </div>
  `;
  fragment.append(container);
  initializeProgressPhotos(container);
  return fragment;
}
