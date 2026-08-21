# Backlog & Zukünftige Erweiterungen

Strukturierte Übersicht geplanter Features und Optimierungen für spätere Entwicklungszyklen.

---

## 1. Gym-Ergonomie & Trainingsablauf

* **Auto-Fill / Ghosting aus der vorherigen Einheit:**
  * Beim Öffnen einer Übung im Training werden die tatsächlich absolvierten Gewichte und Wiederholungen des letzten Trainings als dezente Platzhalter (Ghost-Text) angezeigt.
  * Schnelle Übernahme per Klick oder Antippen, um Tipparbeit zwischen den Sätzen zu minimieren.
* **Integrierter Satzpausen-Timer:**
  * Konfigurierbarer Rest-Timer (z. B. 60s, 90s, 120s, 180s), der automatisch nach dem Abhaken eines Kraftsatzes in der Sticky-Leiste startet.
  * Akustischer Signalton und haptisches Feedback bei Ablauf.
* **Haptisches Feedback (Web Vibration API):**
  * Taktile Bestätigung (`navigator.vibrate(15)`) beim Abhaken von Sätzen und Runden.
  * Vibrationsmuster beim Ablauf von Satzpausen- und Stretching-Timern.
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
