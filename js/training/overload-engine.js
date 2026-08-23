import { WORKOUT_STATUS, WORKOUT_TYPES } from "./training-constants.js";

/**
 * Evaluates performance history for an exercise and generates progressive overload
 * or deload suggestions.
 * 
 * Returns:
 * {
 *   suggestionType: 'increase_weight' | 'increase_reps' | 'deload' | 'maintain',
 *   badgeText: string,
 *   reasonText: string,
 *   suggestedWeight: number,
 *   suggestedReps: number,
 *   deltaWeight: number
 * } or null
 */
export function analyzeExerciseProgression(exerciseIdentifier, sessions = [], currentExercise = null) {
  if (!exerciseIdentifier || !Array.isArray(sessions)) return null;

  const relevantSessions = sessions
    .filter((s) => s && s.status === WORKOUT_STATUS.COMPLETED && s.workoutType === WORKOUT_TYPES.STRENGTH)
    .sort((a, b) => String(b.date || b.completedAt || "").localeCompare(String(a.date || a.completedAt || "")));

  const history = [];
  for (const session of relevantSessions) {
    const ex = (session.exercises || []).find(
      (e) => e.exerciseId === exerciseIdentifier || e.exerciseNameSnapshot === exerciseIdentifier
    );
    if (!ex) continue;
    const workSets = (ex.sets || []).filter(
      (s) => s.completed && s.setType !== "warmup" && (Number(s.actualReps) > 0 || Number(s.actualWeight) > 0)
    );
    if (workSets.length > 0) {
      history.push({
        date: session.date,
        sets: workSets.map((s) => ({
          reps: Number(s.actualReps) || 0,
          weight: Number(s.actualWeight) || 0,
          rir: s.actualRir != null ? Number(s.actualRir) : null,
          plannedReps: Number(s.plannedReps) || 0,
          plannedWeight: Number(s.plannedWeight) || 0
        }))
      });
    }
  }

  if (history.length === 0) return null;

  const lastPerformance = history[0];
  const lastSets = lastPerformance.sets;
  const avgWeight = lastSets.reduce((sum, s) => sum + s.weight, 0) / (lastSets.length || 1);
  const avgRir = lastSets.filter((s) => s.rir != null).reduce((sum, s, _, arr) => sum + s.rir / arr.length, null);

  // 1. Plateau & Deload check (3+ sessions with identical or dropping volume/top weight)
  if (history.length >= 3) {
    const topWeights = history.slice(0, 3).map((h) => Math.max(...h.sets.map((s) => s.weight)));
    const topReps = history.slice(0, 3).map((h) => Math.max(...h.sets.map((s) => s.reps)));
    const isPlateau = topWeights[0] <= topWeights[1] && topWeights[1] <= topWeights[2] &&
                      topReps[0] <= topReps[1] && topReps[1] <= topReps[2];
    if (isPlateau) {
      const deloadWeight = Math.max(0, Math.round((topWeights[0] * 0.9) / 2.5) * 2.5);
      return {
        suggestionType: "deload",
        badgeText: "Deload",
        reasonText: `Plateau über 3 Einheiten erkannt. Empfehlung: 10% Deload auf ${deloadWeight} kg zur Regeneration.`,
        suggestedWeight: deloadWeight,
        suggestedReps: lastSets[0]?.reps || 8,
        deltaWeight: Number((deloadWeight - topWeights[0]).toFixed(1))
      };
    }
  }

  // 2. High RIR check (RIR >= 3 across all sets with >= 6 reps)
  const allHighRir = lastSets.length >= 2 && lastSets.every((s) => s.rir != null && s.rir >= 3);
  if (allHighRir) {
    const step = avgWeight >= 80 ? 5 : 2.5;
    const nextWeight = Number((lastSets[0].weight + step).toFixed(1));
    return {
      suggestionType: "increase_weight",
      badgeText: `+${step} kg Overload`,
      reasonText: `Hohe Reserve in letzter Einheit (Ø ${avgRir?.toFixed(1)} RIR). Gewicht um +${step} kg steigern.`,
      suggestedWeight: nextWeight,
      suggestedReps: lastSets[0].plannedReps || lastSets[0].reps,
      deltaWeight: step
    };
  }

  // 3. Double Progression: Did user hit all target reps?
  const allTargetRepsMet = lastSets.every((s) => s.plannedReps > 0 && s.reps >= s.plannedReps);
  if (allTargetRepsMet) {
    const step = avgWeight >= 70 ? 2.5 : 1.25;
    const nextWeight = Number((lastSets[0].weight + step).toFixed(2));
    return {
      suggestionType: "increase_weight",
      badgeText: `+${step} kg Progression`,
      reasonText: `Alle Sätze im Zielbereich absolviert (${lastSets.map((s) => s.reps).join("/")} Wdh.). Gewicht um +${step} kg steigern.`,
      suggestedWeight: nextWeight,
      suggestedReps: lastSets[0].plannedReps,
      deltaWeight: step
    };
  }

  // 4. Rep Progression (Rep target not fully met on later sets)
  const missedSomeReps = lastSets.some((s) => s.plannedReps > 0 && s.reps < s.plannedReps);
  if (missedSomeReps) {
    return {
      suggestionType: "maintain",
      badgeText: "Wdh. festigen",
      reasonText: `Ziel-Wiederholungen noch nicht in allen Sätzen erreicht. Gewicht (${lastSets[0].weight} kg) halten und Wdh. ausbauen.`,
      suggestedWeight: lastSets[0].weight,
      suggestedReps: lastSets[0].plannedReps || 8,
      deltaWeight: 0
    };
  }

  // Fallback: Maintain
  return {
    suggestionType: "maintain",
    badgeText: "Gewicht halten",
    reasonText: `Aktuelle Last halten (${lastSets[0].weight} kg) und saubere Ausführung anvisieren.`,
    suggestedWeight: lastSets[0].weight,
    suggestedReps: lastSets[0].reps || 8,
    deltaWeight: 0
  };
}