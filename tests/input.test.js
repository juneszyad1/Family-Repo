import { sanitizeNumericInputValue, validateDailyEntryForm } from "../js/validation.js";

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const equal = (actual, expected, message) => {
  if (actual !== expected) throw new Error(`${message}: erwartet ${expected}, erhalten ${actual}`);
};

test("Ganzzahlfelder entfernen Buchstaben und Dezimalzeichen", () => {
  equal(sanitizeNumericInputValue("21e5 kcal"), "215", "Ganzzahl wurde falsch bereinigt");
});

test("Dezimalfelder erlauben genau ein Komma oder einen Punkt", () => {
  equal(sanitizeNumericInputValue("9a2,4.7kg", true), "92,47", "Dezimalzahl wurde falsch bereinigt");
});

test("Tagesdaten-Validierung akzeptiert bereinigte gültige Werte", () => {
  const errors = validateDailyEntryForm({
    date: "2026-07-19",
    weight: "92,4",
    calories: "2150",
    protein: "154",
    sleepHours: "7,5",
    note: ""
  });
  equal(Object.keys(errors).length, 0, "Gültige Tagesdaten wurden abgelehnt");
});

export async function runInputTests() {
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
