export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function createId(prefix = "id") {
  if (typeof globalThis !== "undefined" && globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function toNumberOrNull(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const parsed = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatDate(date) {
  if (!date) {
    return "--";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

export function formatShortDate(date) {
  if (!date) {
    return "--";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(`${date}T00:00:00`));
}

export function formatNumber(value, options = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return new Intl.NumberFormat("de-DE", options).format(value);
}

export function sortByDateDesc(entries) {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date));
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function triggerHaptic(type = "light") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    if (type === "light") {
      navigator.vibrate(15);
    } else if (type === "medium") {
      navigator.vibrate(30);
    } else if (type === "success") {
      navigator.vibrate([20, 35, 20]);
    } else if (type === "timer-finished") {
      navigator.vibrate([100, 60, 100, 60, 250]);
    }
  } catch {
    // Vibration safely ignored
  }
}

export function playChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio synthesis safely ignored
  }
}
