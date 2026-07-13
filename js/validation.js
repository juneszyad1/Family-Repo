const DAILY_LIMITS = {
  weight: { min: 20, max: 400, label: "Gewicht" },
  calories: { min: 0, max: 15000, label: "Kalorien" },
  protein: { min: 0, max: 1000, label: "Protein" }
};

const BODY_FAT_LIMITS = {
  age: { min: 15, max: 100, label: "Alter" },
  chest: { min: 1, max: 100, label: "Brustfalte" },
  abdomen: { min: 1, max: 100, label: "Bauchfalte" },
  thigh: { min: 1, max: 100, label: "Oberschenkelfalte" }
};

function isEmpty(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function validateOptionalNumber(value, field) {
  if (isEmpty(value)) {
    return null;
  }

  const number = Number(value);
  const limits = DAILY_LIMITS[field];

  if (!Number.isFinite(number)) {
    return `${limits.label} muss eine Zahl sein.`;
  }

  if (number < limits.min || number > limits.max) {
    return `${limits.label} muss zwischen ${limits.min} und ${limits.max} liegen.`;
  }

  return null;
}

function validateRequiredNumber(value, field, limitsMap) {
  const limits = limitsMap[field];

  if (isEmpty(value)) {
    return `${limits.label} ist erforderlich.`;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return `${limits.label} muss eine Zahl sein.`;
  }

  if (number < limits.min || number > limits.max) {
    return `${limits.label} muss zwischen ${limits.min} und ${limits.max} liegen.`;
  }

  return null;
}

export function validateDailyEntryForm(formData) {
  const errors = {};

  if (isEmpty(formData.date)) {
    errors.date = "Bitte ein Datum auswaehlen.";
  }

  ["weight", "calories", "protein"].forEach((field) => {
    const error = validateOptionalNumber(formData[field], field);
    if (error) {
      errors[field] = error;
    }
  });

  if (
    isEmpty(formData.weight) &&
    isEmpty(formData.calories) &&
    isEmpty(formData.protein) &&
    isEmpty(formData.note)
  ) {
    errors.form = "Bitte mindestens einen Wert oder eine Notiz eintragen.";
  }

  return errors;
}

export function validateBodyFatForm(formData) {
  const errors = {};

  if (isEmpty(formData.date)) {
    errors.date = "Bitte ein Datum auswaehlen.";
  }

  ["age", "chest", "abdomen", "thigh"].forEach((field) => {
    const error = validateRequiredNumber(formData[field], field, BODY_FAT_LIMITS);
    if (error) {
      errors[field] = error;
    }
  });

  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
