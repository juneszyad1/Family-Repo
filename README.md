# Fitness Tracker PWA

Mobile-first Fitness-Tracking-App für Gewicht, Tagesdaten, Körperfettmessung, Trends und lokale Datenverwaltung.

Repository: Family-Repo

## Tech-Stack

- HTML5
- CSS3
- Vanilla JavaScript
- IndexedDB
- Chart.js
- Service Worker
- Web App Manifest

## Lokaler Start

Die App ist statisch und kann mit einem einfachen lokalen Server getestet werden:

```bash
python3 -m http.server 8080
```

Danach im Browser `http://localhost:8080` öffnen.

## Test auf dem iPhone im selben WLAN

1. Lokalen Server starten:

```bash
python3 -m http.server 8080
```

2. Lokale WLAN-IP des Macs anzeigen:

```bash
ipconfig getifaddr en0
```

3. Auf dem iPhone in Safari öffnen:

```text
http://DEINE-IP:8080
```

Mac und iPhone müssen im selben WLAN sein. Für eine echte PWA-Installation mit Service Worker ist HTTPS nötig; dafür ist GitHub Pages der empfohlene kostenlose Weg.

## GitHub Pages veröffentlichen

1. In GitHub das Repository öffnen.
2. `Settings` öffnen.
3. `Pages` auswählen.
4. Als Source `Deploy from a branch` wählen.
5. Branch `main` und Ordner `/root` auswählen.
6. Speichern.

Die App ist danach unter einer URL nach diesem Muster erreichbar:

```text
https://BENUTZERNAME.github.io/REPOSITORY-NAME/
```

Alle App-Pfade sind relativ gehalten, damit die App auch in einem GitHub-Pages-Unterverzeichnis funktioniert.

## Installation auf dem iPhone

1. Die GitHub-Pages-URL in Safari öffnen.
2. Teilen-Button antippen.
3. `Zum Home-Bildschirm` wählen.
4. Namen bestätigen und `Hinzufügen` antippen.

Nach dem ersten vollständigen Laden kann die App offline starten. Diagramme werden offline verfügbar, sobald Chart.js einmal geladen und vom Service Worker gecacht wurde.

## App aktualisieren

Nach einem Push auf `main` veröffentlicht GitHub Pages die neue Version automatisch. Der Service Worker nutzt eine Cache-Version und löscht alte Caches beim Aktivieren. Wenn eine neue Version installiert wurde, zeigt die App einen kurzen Hinweis. Beim nächsten Öffnen wird die aktuelle Version verwendet.

## Daten exportieren und wiederherstellen

Die Fitnessdaten liegen lokal im Browser in IndexedDB. Normale App-Updates löschen diese Daten nicht.

- Backup erstellen: `Einstellungen` öffnen und `JSON-Backup` wählen.
- Backup wiederherstellen: `Einstellungen` öffnen, JSON-Datei auswählen und Import starten.
- Vor größeren Änderungen empfiehlt sich ein JSON-Backup.

## Tests

Die Zielberechnungen haben einen browserbasierten Test-Runner:

```text
http://localhost:8080/tests/test-runner.html
```
