# Backlog & Zukünftige Erweiterungen

Strukturierte Übersicht geplanter Features und Optimierungen für spätere Entwicklungszyklen.

---

## 1. Gym-Ergonomie & Trainingsablauf

* **[ERLEDIGT] Auto-Fill / Ghosting aus der vorherigen Einheit:**
  * Tatsächlich absolvierte Gewichte und Wiederholungen des letzten Trainings werden als dezente Ghost-Pills und Platzhalter angezeigt.
  * Schnelle 1-Klick-Übernahme aller Werte der letzten Einheit via "Werte aus letzter Einheit".
* **[ERLEDIGT] Integrierter Satzpausen-Timer:**
  * Automatischer Rest-Timer (Default 90s) in der Session-Leiste beim Abhaken eines Kraftsatzes.
  * Schnelltasten `+30s` / `-30s`, Pause, Start, Stop.
  * Doppel-Chime (Web Audio API) und Vibrationsmuster bei Ablauf.
* **[ERLEDIGT] Haptisches Feedback (Web Vibration API):**
  * Taktile Bestätigung (`triggerHaptic("light")`) beim Abhaken von Sätzen und Runden.
  * PR- und Workout-Abschluss-Impuls (`triggerHaptic("success")`).
  * Vibrationsmuster (`triggerHaptic("timer-finished")`) beim Ablauf von Satzpausen- und Stretching-Timern.
* **Swipe-Gesten in Listen:**
  * Wischgesten zum schnellen Löschen oder Bearbeiten von Einträgen und Sätzen auf Touchscreens.

---

## 2. Datensicherheit & Synchronisation

* **Automatisches Cloud-Backup / Sync:**
  * Optionale, verschlüsselte Synchronisation der IndexedDB-Datenbank über WebDAV, private GitHub Gists oder Google Drive.
  * Nahtlose Wiederherstellung beim Gerätewechsel ohne manuellen JSON-Dateidownload.
* **Erweiterte Export-Formate:**
  * Ergänzender CSV-Export für Trainings- und Ernährungsdaten zur weiteren Analyse in externen Tools (z. B. Excel, Google Sheets).

---

## 3. Visuelle & Technische Verfeinerungen

* **Service Worker Auto-Update Banner:**
  * Subtiler In-App-Hinweis, wenn im Hintergrund eine neue Cache-Version bereitsteht, mit "Neu laden"-Aktion.
* **Foto-Vergleichs-Slider (Vorher / Nachher):**
  * Split-Screen-Slider für Fortschrittsfotos mit Datumsauswahl und Ausrichtungshilfe.
