import { getNavigationRoute, getRouteFromHash } from "../js/router.js";
import { applyFormErrors } from "../js/views/daily-entry.js";
import { getNextTrainingTab, getRequestedPlanId } from "../js/views/training-dashboard.js";
import { getRangeLabel } from "../js/views/trends.js";

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const equal = (actual, expected, message) => {
  if (actual !== expected) throw new Error(`${message}: erwartet ${expected}, erhalten ${actual}`);
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

test("Unterseiten werden der richtigen Hauptnavigation zugeordnet", () => {
  equal(getNavigationRoute("body-fat"), "daily", "KFA-Elternavigation falsch");
  equal(getNavigationRoute("progress-photos"), "trends", "Foto-Elternavigation falsch");
  equal(getNavigationRoute("goals"), "settings", "Ziel-Elternavigation falsch");
});

test("Router erkennt Routen mit Query-Parametern", () => {
  equal(getRouteFromHash("#/training?startPlan=plan-42"), "training", "Training-Route falsch");
  equal(getRequestedPlanId("#/training?startPlan=plan-42"), "plan-42", "Planübergabe falsch");
});

test("Training-Tabs unterstützen Pfeile sowie Home und End", () => {
  equal(getNextTrainingTab("plans", "ArrowRight"), "history", "Pfeil rechts falsch");
  equal(getNextTrainingTab("plans", "ArrowLeft"), "stats", "Pfeil links muss umlaufen");
  equal(getNextTrainingTab("history", "Home"), "plans", "Home falsch");
  equal(getNextTrainingTab("history", "End"), "stats", "End falsch");
});

test("Trendzeiträume liefern dynamische Titel", () => {
  equal(getRangeLabel("7d"), "7 Tage", "7-Tage-Titel falsch");
  equal(getRangeLabel("6m"), "6 Monate", "6-Monats-Titel falsch");
  equal(getRangeLabel("all"), "Gesamt", "Gesamt-Titel falsch");
});

test("Formularfehler werden mit ARIA direkt am Feld ausgegeben", () => {
  if (typeof document === "undefined") return;
  const host = document.createElement("div");
  host.innerHTML = `<div data-errors></div><form data-error-scope="test"><label class="field"><span>Datum</span><input name="date"></label></form>`;
  const form = host.querySelector("form");
  applyFormErrors(form, { date: "Bitte ein Datum auswählen." }, host.querySelector("[data-errors]"));
  const input = form.elements.date;
  equal(input.getAttribute("aria-invalid"), "true", "aria-invalid fehlt");
  assert(input.getAttribute("aria-describedby") === "test-date-error", "aria-describedby fehlt");
  assert(host.querySelector("#test-date-error")?.textContent.includes("Datum"), "Feldfehler fehlt");
  assert(document.activeElement === input || !host.isConnected, "Erstes Fehlerfeld wurde nicht fokussiert");
});

test("Desktop-Navigation besitzt ein eigenes Seitenleistenmodell", async () => {
  if (typeof document === "undefined" || typeof fetch === "undefined") return;
  const css = await fetch("../css/layout.css").then((response) => response.text());
  assert(css.includes("@media (min-width: 900px)"), "Desktop-Breakpoint fehlt");
  assert(css.includes("flex-direction: column"), "Desktop-Seitenleiste fehlt");
  assert(css.includes("padding-left: 106px"), "Desktop-Inhaltsabstand fehlt");
});

test("Performance-Journal-Farben sind die Standardtokens", async () => {
  if (typeof document === "undefined" || typeof fetch === "undefined") return;
  const css = await fetch("../css/variables.css").then((response) => response.text());
  assert(css.includes("--background: #0b0e0c"), "Dunkler Hintergrund fehlt");
  assert(css.includes("--surface: #131815"), "Hauptfläche fehlt");
  assert(css.includes("--primary: #b7f34a"), "Akzentfarbe fehlt");
  assert(css.includes("--radius: 14px"), "Kartenradius ist nicht konsolidiert");
});

test("Header enthält keine permanente Versionsanzeige", async () => {
  if (typeof document === "undefined" || typeof fetch === "undefined") return;
  const html = await fetch("../index.html").then((response) => response.text());
  assert(!html.includes("version-pill"), "Versionsanzeige steht noch im Header");
  assert(!html.includes("id=\"app-update-button\""), "Update-Button steht noch im Header");
});

export async function runUiTests() {
  const results = [];
  for (const item of tests) {
    try {
      await item.fn();
      results.push({ name: item.name, passed: true });
    } catch (error) {
      results.push({ name: item.name, passed: false, error });
    }
  }
  return results;
}
