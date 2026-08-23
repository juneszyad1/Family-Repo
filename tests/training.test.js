import { STRENGTH_EXERCISES } from "../js/data/strength-exercises.js";
import { STRETCH_EXERCISES } from "../js/data/stretch-exercises.js";
import { EXERCISE_CATEGORIES, EQUIPMENT_TYPES, STRETCH_CATEGORIES, STRETCH_TYPES } from "../js/training/training-constants.js";
import { filterExercises } from "../js/training/exercise-library.js";
import { calculateSetVolume, calculateStretchPlannedDuration, calculateWorkoutDuration, calculateWorkoutVolume, calculateCompletedSetCount, calculateTotalReps, estimate1RM, detectWorkoutPRs, compareWorkoutWithPrevious, getTrackedStrengthExercises, extractExerciseProgression, getLastPerformanceForExercise } from "../js/training/workout-calculations.js";
import { validateCustomExercise, validateWorkoutPlan } from "../js/training/workout-validation.js";
import { completeSession, createSessionFromPlan } from "../js/training/workout-sessions.js";
import { RestTimer } from "../js/training/rest-timer.js";

const tests=[]; const test=(name,fn)=>tests.push({name,fn});
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const equal=(actual,expected,message)=>{if(actual!==expected)throw new Error(`${message}: erwartet ${expected}, erhalten ${actual}`)};

test("mindestens 100 eindeutige Kraftübungen",()=>{assert(STRENGTH_EXERCISES.length>=100,"Zu wenige Kraftübungen");equal(new Set(STRENGTH_EXERCISES.map(x=>x.id)).size,STRENGTH_EXERCISES.length,"Doppelte IDs")});
test("Kraftübungen besitzen vollständige gültige Kerndaten",()=>{const categories=new Set(Object.values(EXERCISE_CATEGORIES)),equipment=new Set(Object.values(EQUIPMENT_TYPES));STRENGTH_EXERCISES.forEach(x=>{assert(x.name&&categories.has(x.category),`Ungültige Übung ${x.id}`);assert(x.equipment.length&&x.equipment.every(e=>equipment.has(e)),`Ungültige Ausrüstung ${x.id}`);assert(x.instructions===null&&x.videoUrl===null&&x.imageUrl===null,"Zukunftsfelder fehlen")})});
test("mindestens 40 eindeutige Stretch-Übungen",()=>{assert(STRETCH_EXERCISES.length>=40,"Zu wenige Stretch-Übungen");equal(new Set(STRETCH_EXERCISES.map(x=>x.id)).size,STRETCH_EXERCISES.length,"Doppelte Stretch-IDs")});
test("Stretch-Übungen besitzen gültige Kategorien, Zielbereiche und Typen",()=>{const categories=new Set(Object.values(STRETCH_CATEGORIES)),types=new Set(Object.values(STRETCH_TYPES));STRETCH_EXERCISES.forEach(x=>{assert(x.name&&categories.has(x.category),`Ungültige Stretch-Übung ${x.id}`);assert(x.targetAreas.length&&types.has(x.stretchType),`Ungültige Stretch-Daten ${x.id}`)})});
test("Suche ignoriert Großschreibung und Umlaute",()=>{assert(filterExercises(STRENGTH_EXERCISES,{query:"KLIMMZUGE"}).some(x=>x.id==="pull-up"),"Umlautsuche fehlgeschlagen")});
test("Suchfilter nach Ausrüstung und Kategorie",()=>{const result=filterExercises(STRENGTH_EXERCISES,{category:"chest",equipment:"barbell"});assert(result.length>0&&result.every(x=>x.category==="chest"&&x.equipment.includes("barbell")),"Filter falsch")});
test("Bewegungsmuster- und Favoritenfilter",()=>{const result=filterExercises(STRENGTH_EXERCISES,{movementPattern:"squat",favoriteOnly:true,favoriteIds:new Set(["barbell-back-squat"])});equal(result.length,1,"Kombinierter Filter falsch")});
test("10 × 50 kg ergeben 500 kg",()=>equal(calculateSetVolume(10,50),500,"Satzvolumen falsch"));
test("mehrere Sätze ergeben 1400 kg",()=>equal(calculateWorkoutVolume([{sets:[{actualReps:10,actualWeight:50,completed:true},{actualReps:8,actualWeight:60,completed:true},{actualReps:6,actualWeight:70,completed:true}]}]),1400,"Volumen falsch"));
test("offene, fehlende und Null-Sätze zählen nicht zum Volumen",()=>equal(calculateWorkoutVolume([{sets:[{actualReps:10,actualWeight:50,completed:false},{actualReps:10,actualWeight:null,completed:true},{actualReps:0,actualWeight:100,completed:true}]}]),0,"Randfall falsch"));
test("teilweise Einheit zählt nur abgeschlossene Sätze",()=>{const ex=[{sets:[{actualReps:8,actualWeight:50,completed:true},{actualReps:9,actualWeight:50,completed:false}]}];equal(calculateCompletedSetCount(ex),1,"Satzanzahl falsch");equal(calculateTotalReps(ex),8,"Wiederholungen falsch")});
test("Training über Mitternacht berechnet Dauer",()=>equal(calculateWorkoutDuration("2026-07-16T23:50:00Z","2026-07-17T00:10:00Z"),1200,"Dauer falsch"));
test("Stretch-Gesamtdauer",()=>equal(calculateStretchPlannedDuration([{sets:2,durationSeconds:30},{sets:3,durationSeconds:20}]),120,"Stretchdauer falsch"));
test("Stretch-Gesamtdauer funktioniert auch in einer laufenden Einheit",()=>equal(calculateStretchPlannedDuration([{sets:[{completed:true},{completed:false}],durationSeconds:30}]),60,"Session-Stretchdauer falsch"));
test("Kraftplan unterstützt unterschiedliche Satzwerte und Validierung",()=>{const p={name:"Push",workoutType:"strength",exercises:[{exerciseId:"barbell-bench-press",sets:[{targetReps:10,targetWeight:60},{targetReps:8,targetWeight:70},{targetReps:6,targetWeight:75}]}]};equal(validateWorkoutPlan(p,new Set(["barbell-bench-press"])).length,0,"Plan ungültig");equal(p.exercises[0].sets[1].targetWeight,70,"Individuelles Gewicht verloren")});
test("Stretchplan wird validiert",()=>equal(validateWorkoutPlan({name:"Morgen",workoutType:"stretching",exercises:[{exerciseId:"doorway-chest-stretch",sets:2,durationSeconds:30,sideMode:"eachSide"}]},new Set(["doorway-chest-stretch"])).length,0,"Stretchplan ungültig"));
test("Eigene Übungen prüfen Kategorie und Ausrüstung",()=>{equal(validateCustomExercise({name:"Eigen",workoutType:"strength",category:"chest",equipment:["dumbbell"]}).length,0,"Eigene Kraftübung ungültig");assert(validateCustomExercise({name:"Fehler",workoutType:"strength",category:"upperBack",equipment:[]}).length>0,"Ungültige Daten akzeptiert")});
test("Krafteinheit erstellt unabhängige Snapshots und lässt sich abschließen",()=>{const plan={id:"p",name:"Push",workoutType:"strength",exercises:[{exerciseId:"barbell-bench-press",sets:[{targetReps:8,targetWeight:80}],notes:""}]};const session=createSessionFromPlan(plan,[],new Date("2026-07-16T10:00:00Z"));plan.name="Geändert";equal(session.planNameSnapshot,"Push","Snapshot verändert");session.exercises[0].sets[0].completed=true;const done=completeSession(session,"2026-07-16T11:00:00Z");equal(done.durationSeconds,3600,"Abschlussdauer falsch");equal(done.status,"completed","Status falsch")});
test("Stretch-Einheit enthält unabhängige Durchgänge",()=>{const session=createSessionFromPlan({id:"s",name:"Stretch",workoutType:"stretching",exercises:[{exerciseId:"doorway-chest-stretch",sets:2,durationSeconds:30,sideMode:"eachSide"}]},[],new Date());equal(session.exercises[0].sets.length,2,"Durchgänge falsch");assert(session.exercises[0].sets[0].id!==session.exercises[0].sets[1].id,"IDs nicht eindeutig")});

test("1RM-Berechnung nach Epley-Formel", () => {
  equal(estimate1RM(100, 1), 100, "1 Wdh. muss exakt Gewicht entsprechen");
  equal(estimate1RM(100, 10), 133.3, "10 Wdh. @ 100 kg = 133.3 kg 1RM");
  equal(estimate1RM(80, 8), 101.3, "8 Wdh. @ 80 kg = 101.3 kg 1RM");
  equal(estimate1RM(0, 10), 0, "0 kg ohne Körpergewicht muss 0 ergeben");
});

test("Effective Load Model für Bodyweight-Übungen", () => {
  // Liegestütze: 65% von 80 kg = 52 kg. 20 Wdh. -> 52 * (1 + 20/30) = 86.7 kg e1RM
  equal(estimate1RM(0, 20, 80, 0.65), 86.7, "20 Liegestütze @ 80 kg BW = 86.7 kg 1RM");
  // Liegestütze mit +10 kg: 52 + 10 = 62 kg. 6 Wdh. -> 62 * (1 + 6/30) = 74.4 kg e1RM
  equal(estimate1RM(10, 6, 80, 0.65), 74.4, "6 Liegestütze +10 kg @ 80 kg BW = 74.4 kg 1RM");
  // Klimmzüge: 100% von 80 kg = 80 kg. 10 Wdh. -> 80 * (1 + 10/30) = 106.7 kg e1RM
  equal(estimate1RM(0, 10, 80, 1.0), 106.7, "10 Klimmzüge @ 80 kg BW = 106.7 kg 1RM");
});

test("1RM-Berechnung mit RIR (Reps in Reserve)", () => {
  // 100 kg x 8 Wdh. @ 0 RIR -> 100 * (1 + 8/30) = 126.7 kg 1RM
  equal(estimate1RM(100, 8, null, 0, 0), 126.7, "8 Wdh. @ 0 RIR = 126.7 kg 1RM");
  // 100 kg x 8 Wdh. @ 2 RIR -> 100 * (1 + (8+2)/30) = 100 * (1 + 10/30) = 133.3 kg 1RM
  equal(estimate1RM(100, 8, null, 0, 2), 133.3, "8 Wdh. @ 2 RIR = 133.3 kg 1RM");
  // 100 kg x 1 Wdh. @ 0 RIR -> 100 kg
  equal(estimate1RM(100, 1, null, 0, 0), 100, "1 Wdh. @ 0 RIR = 100 kg");
  // 100 kg x 1 Wdh. @ 1 RIR -> 100 * (1 + 2/30) = 106.7 kg
  equal(estimate1RM(100, 1, null, 0, 1), 106.7, "1 Wdh. @ 1 RIR = 106.7 kg");
});

test("PR-Erkennung erkennt Maximalgewicht- und 1RM-Steigerungen", () => {
  const session1 = {
    id: "s1",
    status: "completed",
    workoutType: "strength",
    date: "2026-08-01",
    completedAt: "2026-08-01T11:00:00Z",
    exercises: [
      { exerciseId: "barbell-bench-press", exerciseNameSnapshot: "Bankdrücken", sets: [{ actualReps: 8, actualWeight: 80, completed: true }] }
    ]
  };
  const session2 = {
    id: "s2",
    status: "completed",
    workoutType: "strength",
    date: "2026-08-08",
    completedAt: "2026-08-08T11:00:00Z",
    exercises: [
      { exerciseId: "barbell-bench-press", exerciseNameSnapshot: "Bankdrücken", sets: [{ actualReps: 8, actualWeight: 85, completed: true }] }
    ]
  };

  const prs1 = detectWorkoutPRs(session1, []);
  equal(prs1.length, 1, "Erstmalige Übung muss als PR/Erst-Eintrag erkannt werden");
  equal(prs1[0].type, "firstTime", "Typ muss firstTime sein");

  const prs2 = detectWorkoutPRs(session2, [session1]);
  equal(prs2.length, 1, "Gewichtssteigerung muss als MaxWeight-PR erkannt werden");
  equal(prs2[0].type, "maxWeight", "Typ muss maxWeight sein");
  equal(prs2[0].diff, 5, "Differenz muss +5 kg sein");
});

test("Vergleich mit vorherigem Training berechnet prozentuale Differenzen", () => {
  const prevSession = {
    id: "s1",
    planId: "p1",
    status: "completed",
    workoutType: "strength",
    date: "2026-08-01",
    completedAt: "2026-08-01T11:00:00Z",
    exercises: [
      { exerciseId: "barbell-bench-press", exerciseNameSnapshot: "Bankdrücken", sets: [{ actualReps: 10, actualWeight: 50, completed: true }] }
    ]
  };
  const currentSession = {
    id: "s2",
    planId: "p1",
    status: "completed",
    workoutType: "strength",
    date: "2026-08-08",
    completedAt: "2026-08-08T11:00:00Z",
    exercises: [
      { exerciseId: "barbell-bench-press", exerciseNameSnapshot: "Bankdrücken", sets: [{ actualReps: 10, actualWeight: 60, completed: true }] }
    ]
  };

  const comparison = compareWorkoutWithPrevious(currentSession, [prevSession]);
  assert(comparison.hasPrevious, "Vorheriges Training muss gefunden werden");
  equal(comparison.totalComparison.volume.percent, 20, "Volumen-Steigerung muss +20% sein (500 kg -> 600 kg)");
  equal(comparison.exerciseComparisons[0].volumeDiff.percent, 20, "Übungs-Volumensteigerung muss +20% sein");
  equal(comparison.exerciseComparisons[0].weightDiff.percent, 20, "Übungs-Gewichtssteigerung muss +20% sein");
});

test("getTrackedStrengthExercises aggregiert eindeutige Kraftübungen und PRs", () => {
  const sessions = [
    {
      id: "s1",
      status: "completed",
      workoutType: "strength",
      date: "2026-08-01",
      exercises: [
        { exerciseId: "bench-press", exerciseNameSnapshot: "Bankdrücken", sets: [{ actualReps: 10, actualWeight: 80, completed: true }] }
      ]
    },
    {
      id: "s2",
      status: "completed",
      workoutType: "strength",
      date: "2026-08-05",
      exercises: [
        { exerciseId: "bench-press", exerciseNameSnapshot: "Bankdrücken", sets: [{ actualReps: 8, actualWeight: 90, completed: true }] },
        { exerciseId: "squat", exerciseNameSnapshot: "Kniebeugen", sets: [{ actualReps: 5, actualWeight: 120, completed: true }] }
      ]
    }
  ];

  const tracked = getTrackedStrengthExercises(sessions);
  equal(tracked.length, 2, "2 Übungen müssen gefunden werden");
  equal(tracked[0].id, "bench-press", "Bankdrücken muss an 1. Stelle sein (2x trainiert)");
  equal(tracked[0].allTimeMaxWeight, 90, "All-Time Max Weight muss 90 kg sein");
  equal(tracked[0].allTime1RM, 114, "All-Time 1RM (90kg x 8) muss 114 kg sein");
});

test("extractExerciseProgression berechnet korrekte 1RM- und Gewichtssteigerung", () => {
  const sessions = [
    {
      id: "s1",
      status: "completed",
      workoutType: "strength",
      date: "2026-08-01",
      planNameSnapshot: "Push A",
      exercises: [
        { exerciseId: "bench-press", exerciseNameSnapshot: "Bankdrücken", sets: [{ actualReps: 10, actualWeight: 80, completed: true }] }
      ]
    },
    {
      id: "s2",
      status: "completed",
      workoutType: "strength",
      date: "2026-08-15",
      planNameSnapshot: "Push A",
      exercises: [
        { exerciseId: "bench-press", exerciseNameSnapshot: "Bankdrücken", sets: [{ actualReps: 10, actualWeight: 100, completed: true }] }
      ]
    }
  ];

  const prog = extractExerciseProgression(sessions, "bench-press");
  assert(prog !== null, "Progression darf nicht null sein");
  equal(prog.totalSessionsTracked, 2, "2 Einheiten getrackt");
  equal(prog.progressWeightPercent, 25, "+25% Maximalgewicht-Steigerung (80 kg -> 100 kg)");
  equal(prog.allTimeMaxWeight, 100, "100 kg All-Time Max");
});

test("getLastPerformanceForExercise liefert korrekte Sätze aus der vorherigen Einheit", () => {
  const sessions = [
    {
      id: "s1",
      status: "completed",
      workoutType: "strength",
      date: "2026-08-01",
      planNameSnapshot: "Push A",
      exercises: [
        { exerciseId: "bench-press", exerciseNameSnapshot: "Bankdrücken", sets: [{ actualReps: 10, actualWeight: 80, completed: true }, { actualReps: 8, actualWeight: 85, completed: true }] }
      ]
    },
    {
      id: "s2",
      status: "completed",
      workoutType: "strength",
      date: "2026-08-10",
      planNameSnapshot: "Push B",
      exercises: [
        { exerciseId: "bench-press", exerciseNameSnapshot: "Bankdrücken", sets: [{ actualReps: 10, actualWeight: 85, completed: true }, { actualReps: 6, actualWeight: 90, completed: true }] }
      ]
    }
  ];

  const lastPerf = getLastPerformanceForExercise(sessions, "bench-press", "current-session-id");
  assert(lastPerf !== null, "Vorherige Leistung muss gefunden werden");
  equal(lastPerf.sessionDate, "2026-08-10", "Muss die jüngste Einheit vom 10.08. nehmen");
  equal(lastPerf.sets.length, 2, "2 Sätze müssen vorhanden sein");
  equal(lastPerf.sets[0].actualWeight, 85, "1. Satz: 85 kg");
  equal(lastPerf.sets[1].actualWeight, 90, "2. Satz: 90 kg");
});

test("RestTimer startet, pausiert und passt Restzeit an", () => {
  let tickCount = 0;
  const timer = new RestTimer(90, () => {
    tickCount++;
  });

  equal(timer.status, "ready", "Status muss ready sein");
  equal(timer.remainingSeconds, 90, "90 Sekunden Startwert");

  timer.start();
  equal(timer.status, "running", "Status muss running sein");

  timer.addTime(30);
  equal(timer.remainingSeconds, 120, "+30s muss 120s ergeben");

  timer.addTime(-60);
  equal(timer.remainingSeconds, 60, "-60s muss 60s ergeben");

  timer.pause();
  equal(timer.status, "paused", "Status muss paused sein");

  timer.reset(90);
  equal(timer.status, "ready", "Reset muss status ready herstellen");
  equal(timer.remainingSeconds, 90, "Reset muss 90s herstellen");
  timer.destroy();
});

export async function runTrainingTests(){const results=[];for(const item of tests){try{await item.fn();results.push({name:item.name,passed:true})}catch(error){results.push({name:item.name,passed:false,error})}}return results;}
