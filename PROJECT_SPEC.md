# Projektauftrag: Mobile Fitness-Tracking-PWA

## 1. Ziel des Projekts

Erstelle eine benutzerfreundliche, mobile Web-App zur privaten Erfassung und Auswertung von Fitnessdaten.

Die App soll als **Progressive Web App (PWA)** funktionieren. Sie wird über eine Webadresse geöffnet und kann auf iPhone und Android über „Zum Home-Bildschirm“ wie eine App installiert werden.

Die erste Version benötigt:

- kein Backend
- keinen Server
- keinen Login
- keine Benutzerkonten
- keine Bezahlfunktion
- keine externe Datenbank
- keine Food-Datenbank

Alle Daten werden ausschließlich lokal auf dem jeweiligen Gerät gespeichert.

---

# 2. Technischer Rahmen

Verwende eine einfache und wartbare Architektur.

## Bevorzugter Tech-Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Chart.js für Diagramme
- IndexedDB zur lokalen Datenspeicherung
- Service Worker für Offline-Nutzung
- Web App Manifest für die PWA-Installation

Verwende keine unnötig großen Frameworks.

React, Vue, Angular oder ein Backend sollen für die erste Version nicht eingesetzt werden.

Die App soll direkt über einen einfachen statischen Webhoster veröffentlicht werden können, zum Beispiel:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

---

# 3. Grundanforderungen

Die App muss für Smartphones optimiert sein.

Sie soll insbesondere auf aktuellen iPhones mit Safari gut funktionieren.

## Allgemeine Anforderungen

- Mobile-First-Design
- große, gut bedienbare Schaltflächen
- übersichtliche Navigation
- klare Eingabefelder
- responsive Darstellung
- verständliche Fehlermeldungen
- keine horizontale Scrollleiste
- gute Darstellung bei kleinen Displays
- Unterstützung für Dark Mode
- Offline-Nutzung nach dem ersten Laden
- installierbar als PWA
- Daten bleiben nach dem Schließen der App gespeichert

---

# 4. Hauptnavigation

Erstelle eine untere mobile Navigationsleiste mit folgenden Bereichen:

1. Dashboard
2. Tagesdaten
3. KFA-Messung
4. Trends
5. Einstellungen

Die aktuell geöffnete Seite soll deutlich markiert sein.

Die Navigation soll auf dem Smartphone dauerhaft am unteren Bildschirmrand sichtbar bleiben.

---

# 5. Dashboard

Das Dashboard ist die Startseite der App.

Es soll einen schnellen Überblick über die wichtigsten aktuellen Daten bieten.

## Anzuzeigende Werte

- aktuelles Gewicht
- Veränderung des Gewichts gegenüber der letzten Messung
- durchschnittliches Gewicht der letzten 7 Tage
- zuletzt berechneter Körperfettanteil
- heutige Kalorien
- heutiges Protein
- Erreichung des Kalorienziels
- Erreichung des Proteinziels

## Darstellungsform

Verwende übersichtliche Karten.

Beispiele:

- Gewicht: 92,4 kg
- Veränderung: −0,6 kg
- Körperfett: 21,3 %
- Kalorien: 2.150 / 2.400 kcal
- Protein: 154 / 180 g

Für Kalorien und Protein sollen Fortschrittsbalken angezeigt werden.

## Schnellaktionen

Das Dashboard soll folgende Schaltflächen enthalten:

- Tagesdaten eintragen
- KFA messen
- Trends öffnen

Falls für den aktuellen Tag noch keine Daten vorhanden sind, soll die App darauf hinweisen.

---

# 6. Tagesdaten

In diesem Bereich können tägliche Fitnessdaten eingetragen werden.

## Eingabefelder

- Datum
- Gewicht in kg
- gegessene Kalorien in kcal
- Protein in Gramm
- optionale Notiz

Das Datum soll standardmäßig auf den heutigen Tag gesetzt werden.

## Regeln

- pro Datum darf nur ein Tagesdatensatz existieren
- vorhandene Daten eines Datums müssen bearbeitet werden können
- Nutzer sollen bestehende Einträge löschen können
- vor dem Löschen muss eine Bestätigung erscheinen
- alle Zahlenfelder müssen validiert werden

## Plausible Wertebereiche

Die App soll bei offensichtlich unrealistischen Eingaben warnen.

Beispielhafte Grenzen:

- Gewicht: 20 bis 400 kg
- Kalorien: 0 bis 15.000 kcal
- Protein: 0 bis 1.000 g

Diese Grenzen dienen nur der Eingabevalidierung.

## Tageshistorie

Unter dem Eingabeformular soll eine Liste der letzten Einträge angezeigt werden.

Jeder Eintrag zeigt:

- Datum
- Gewicht
- Kalorien
- Protein
- Bearbeiten-Schaltfläche
- Löschen-Schaltfläche

Sortiere die Einträge absteigend nach Datum.

---

# 7. KFA-Messung

Die App soll den Körperfettanteil anhand von Hautfaltenmessungen mit einer Körperfettzange berechnen.

## Erste unterstützte Methode

Implementiere zunächst:

**Jackson-Pollock-3-Punkt-Methode für Männer**

## Eingabefelder

- Datum
- Alter
- Brustfalte in mm
- Bauchfalte in mm
- Oberschenkelfalte in mm

## Berechnung

Berechne zuerst die Summe der drei Hautfalten:

```text
S = Brust + Bauch + Oberschenkel
```

Berechne anschließend die Körperdichte:

```text
Körperdichte =
1,10938
− 0,0008267 × S
+ 0,0000016 × S²
− 0,0002574 × Alter
```

Berechne danach den Körperfettanteil mit der Siri-Formel:

```text
KFA in Prozent = 495 / Körperdichte − 450
```

Runde das Ergebnis auf eine Nachkommastelle.

## Anzeige des Ergebnisses

Zeige nach der Berechnung:

- Summe der Hautfalten
- berechnete Körperdichte
- berechneten Körperfettanteil
- Hinweis, dass Zangenmessungen Schätzwerte sind
- Hinweis, möglichst immer unter vergleichbaren Bedingungen zu messen

## Speicherung

Speichere folgende Werte:

- Datum
- Alter
- Brustfalte
- Bauchfalte
- Oberschenkelfalte
- Summe der Hautfalten
- berechneter KFA

KFA-Einträge müssen bearbeitet und gelöscht werden können.

## Validierung

Messwerte dürfen nicht negativ sein.

Nutze einen plausiblen Bereich, zum Beispiel:

- einzelne Hautfalte: 1 bis 100 mm
- Alter: 15 bis 100 Jahre

---

# 8. Trends und Diagramme

Erstelle einen eigenen Bereich für statistische Auswertungen.

Verwende Chart.js.

## Zeitraumfilter

Der Nutzer soll zwischen folgenden Zeiträumen wählen können:

- 7 Tage
- 30 Tage
- 90 Tage
- 6 Monate
- 1 Jahr
- gesamter Zeitraum

## Diagramm 1: Gewicht

Liniendiagramm mit:

- Datum auf der X-Achse
- Gewicht in kg auf der Y-Achse
- einzelnen Messwerten
- gleitendem 7-Tage-Durchschnitt

Der gleitende Durchschnitt soll nur aus vorhandenen Gewichtseinträgen berechnet werden.

## Diagramm 2: Körperfettanteil

Liniendiagramm mit:

- Datum auf der X-Achse
- KFA in Prozent auf der Y-Achse

## Diagramm 3: Kalorien

Balken- oder Liniendiagramm mit:

- Kalorien pro Tag
- horizontaler Linie für das eingestellte Kalorienziel

## Diagramm 4: Protein

Balken- oder Liniendiagramm mit:

- Protein pro Tag
- horizontaler Linie für das eingestellte Proteinziel

## Diagramm 5: Hautfalten

Optionales Liniendiagramm mit:

- Summe aller Hautfalten
- Brustfalte
- Bauchfalte
- Oberschenkelfalte

## Zusammenfassungen

Zeige für den ausgewählten Zeitraum zusätzlich:

- durchschnittliche Kalorien pro Tag
- durchschnittliches Protein pro Tag
- Gewichtsveränderung
- KFA-Veränderung
- niedrigstes Gewicht
- höchstes Gewicht
- Anzahl erfasster Tage

Wenn nicht genug Daten vorhanden sind, soll eine verständliche Meldung erscheinen.

---

# 9. Einstellungen

Erstelle einen Einstellungsbereich.

## Persönliche Ziele

Speichere lokal:

- Kalorienziel pro Tag
- Proteinziel pro Tag
- Zielgewicht
- optional Ziel-KFA
- Standardalter für KFA-Berechnungen

## Darstellung

- Dark Mode automatisch
- Dark Mode manuell aktivieren
- Light Mode manuell aktivieren
- Systemeinstellung verwenden

## Datenverwaltung

Folgende Funktionen müssen vorhanden sein:

- Daten exportieren
- Daten importieren
- alle Daten löschen

---

# 10. Datenexport

Der Nutzer soll alle gespeicherten Daten als JSON-Datei exportieren können.

Die Datei soll enthalten:

```json
{
  "version": 1,
  "exportDate": "ISO-DATUM",
  "settings": {},
  "dailyEntries": [],
  "bodyFatEntries": []
}
```

Der Dateiname soll beispielsweise lauten:

```text
fitness-tracker-backup-2026-07-13.json
```

Zusätzlich soll ein CSV-Export für die Tagesdaten angeboten werden.

Die CSV-Datei soll folgende Spalten enthalten:

```text
Datum,Gewicht,Kalorien,Protein,Notiz
```

---

# 11. Datenimport

Der Nutzer soll eine zuvor exportierte JSON-Datei importieren können.

## Anforderungen

- Dateiformat prüfen
- Version prüfen
- ungültige Dateien ablehnen
- vor dem Import erklären, was passiert
- Auswahl anbieten:

  - vorhandene Daten ersetzen
  - Daten zusammenführen

Bei doppelten Datumswerten soll der Nutzer entscheiden können, ob:

- der vorhandene Eintrag behalten wird
- der importierte Eintrag übernommen wird

Nach erfolgreichem Import soll eine Bestätigung erscheinen.

---

# 12. Lokale Datenspeicherung

Nutze IndexedDB.

Erstelle mindestens folgende Datensammlungen:

## `dailyEntries`

```javascript
{
  id: string,
  date: "YYYY-MM-DD",
  weight: number | null,
  calories: number | null,
  protein: number | null,
  note: string,
  createdAt: string,
  updatedAt: string
}
```

## `bodyFatEntries`

```javascript
{
  id: string,
  date: "YYYY-MM-DD",
  age: number,
  chest: number,
  abdomen: number,
  thigh: number,
  skinfoldSum: number,
  bodyDensity: number,
  bodyFatPercentage: number,
  createdAt: string,
  updatedAt: string
}
```

## `settings`

```javascript
{
  calorieTarget: number,
  proteinTarget: number,
  targetWeight: number | null,
  targetBodyFat: number | null,
  defaultAge: number | null,
  theme: "system" | "light" | "dark"
}
```

Verwende eine eigene Datenbank-Hilfsdatei und kapsle alle IndexedDB-Zugriffe in klar benannten Funktionen.

---

# 13. Projektstruktur

Nutze eine übersichtliche Dateistruktur.

```text
fitness-tracker/
│
├── index.html
├── manifest.json
├── service-worker.js
├── README.md
│
├── css/
│   ├── reset.css
│   ├── variables.css
│   ├── layout.css
│   ├── components.css
│   └── responsive.css
│
├── js/
│   ├── app.js
│   ├── router.js
│   ├── database.js
│   ├── state.js
│   ├── validation.js
│   ├── calculations.js
│   ├── charts.js
│   ├── export-import.js
│   ├── utils.js
│   │
│   └── views/
│       ├── dashboard.js
│       ├── daily-entry.js
│       ├── body-fat.js
│       ├── trends.js
│       └── settings.js
│
└── assets/
    └── icons/
        ├── icon-192.png
        ├── icon-512.png
        └── apple-touch-icon.png
```

Die genaue Struktur darf sinnvoll angepasst werden. Vermeide jedoch eine einzelne sehr große JavaScript-Datei.

---

# 14. Designvorgaben

Das Design soll modern, ruhig und funktional wirken.

## Stil

- minimalistisch
- hochwertige Fitness-App-Optik
- klare Karten
- runde Ecken
- dezente Schatten
- gute Abstände
- verständliche Typografie
- keine überladenen Animationen

## Farben

Verwende CSS-Variablen.

Beispiel:

```css
:root {
  --background: #f4f6f8;
  --surface: #ffffff;
  --text-primary: #18212b;
  --text-secondary: #64748b;
  --primary: #2563eb;
  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;
  --border: #e2e8f0;
}
```

Für Dark Mode sollen passende alternative Variablen definiert werden.

## Bedienbarkeit

- Mindesthöhe für Buttons: 44 Pixel
- gut lesbare Schriftgrößen
- ausreichende Kontraste
- Fokuszustände für Tastaturbedienung
- Labels immer sichtbar
- keine ausschließliche Kommunikation über Farben

---

# 15. PWA-Anforderungen

Erstelle ein gültiges `manifest.json`.

Es soll mindestens enthalten:

```json
{
  "name": "Fitness Tracker",
  "short_name": "Fitness",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#f4f6f8",
  "theme_color": "#2563eb",
  "orientation": "portrait-primary",
  "icons": []
}
```

## Service Worker

Der Service Worker soll:

- zentrale App-Dateien cachen
- die App nach dem ersten Laden offline verfügbar machen
- eine Cache-Version verwenden
- alte Cache-Versionen entfernen
- bei Updates nicht dauerhaft alte Dateien ausliefern

Die App darf bei fehlender Internetverbindung nicht abstürzen.

---

# 16. Fehlerbehandlung

Behandle mindestens folgende Fälle:

- IndexedDB kann nicht geöffnet werden
- Daten können nicht gespeichert werden
- Importdatei ist beschädigt
- Formular enthält ungültige Werte
- Diagramm enthält keine Daten
- Chart.js wurde nicht geladen
- Service Worker kann nicht registriert werden
- Nutzer löscht Daten versehentlich
- doppelter Eintrag für ein Datum

Fehler sollen als verständliche Meldung innerhalb der Oberfläche angezeigt werden.

Verwende keine unnötigen `alert()`-Fenster.

Für Bestätigungen können modale Dialoge verwendet werden.

---

# 17. Barrierefreiheit

Beachte grundlegende Accessibility-Regeln.

- semantisches HTML
- korrekte Labels für Formulare
- Buttons statt klickbarer `div`-Elemente
- ARIA nur dort verwenden, wo es notwendig ist
- sichtbare Fokusrahmen
- ausreichende Farbkontraste
- Diagramme benötigen zusätzliche Textzusammenfassungen
- Fehlermeldungen müssen Screenreadern zugänglich sein

---

# 18. Datenschutz

Da alle Daten lokal gespeichert werden:

- keine Analytics integrieren
- keine Tracking-Cookies setzen
- keine Werbenetzwerke verwenden
- keine Daten an externe Server senden
- keine externen Schriftarten laden
- keine personenbezogenen Daten übertragen

Chart.js darf nach Möglichkeit lokal eingebunden werden, damit die App auch vollständig offline funktioniert.

---

# 19. Tests

Teste mindestens folgende Funktionen manuell oder automatisiert:

## Tagesdaten

- neuen Eintrag erstellen
- bestehenden Eintrag bearbeiten
- Eintrag löschen
- doppeltes Datum erkennen
- leere optionale Felder
- ungültige Zahlenwerte

## KFA

- Berechnung mit gültigen Werten
- negative Messwerte ablehnen
- unrealistische Werte ablehnen
- Ergebnis korrekt runden
- Eintrag bearbeiten
- Eintrag löschen

## Speicherung

- Daten bleiben nach Neuladen erhalten
- mehrere Einträge werden korrekt sortiert
- Einstellungen werden gespeichert
- IndexedDB-Fehler werden behandelt

## Diagramme

- korrekte zeitliche Sortierung
- Zeitraumfilter
- leere Datensätze
- nur ein vorhandener Messwert
- gleitender 7-Tage-Durchschnitt
- Zielwerte werden angezeigt

## Import und Export

- JSON exportieren
- JSON wieder importieren
- beschädigte JSON-Datei ablehnen
- CSV exportieren
- Zusammenführen von Daten
- Überschreiben von Daten

## PWA

- Installation auf dem Home-Bildschirm
- Standalone-Darstellung
- Offline-Start
- Aktualisierung des Service Workers
- Darstellung auf iPhone und Android

---

# 20. Vorgehensweise für die Implementierung

Arbeite in klaren Phasen.

## Phase 1: Grundgerüst

- Projektstruktur erstellen
- HTML-Grundlayout erstellen
- Navigation implementieren
- responsive Grundgestaltung
- Theme-System aufbauen

## Phase 2: Datenmodell

- IndexedDB initialisieren
- CRUD-Funktionen erstellen
- Einstellungen speichern
- Fehlerbehandlung ergänzen

## Phase 3: Tagesdaten

- Formular erstellen
- Validierung
- Speichern
- Bearbeiten
- Löschen
- Historie

## Phase 4: KFA

- Formular erstellen
- Jackson-Pollock-Berechnung
- Ergebnisdarstellung
- Speicherung
- Bearbeiten und Löschen

## Phase 5: Dashboard

- aktuelle Werte ermitteln
- Zielwerte darstellen
- Fortschrittsbalken
- 7-Tage-Durchschnitt
- Schnellaktionen

## Phase 6: Diagramme

- Chart.js integrieren
- Gewicht
- KFA
- Kalorien
- Protein
- Zeitraumfilter
- Zusammenfassungen

## Phase 7: Datenverwaltung

- JSON-Export
- JSON-Import
- CSV-Export
- Löschfunktion
- Bestätigungsdialoge

## Phase 8: PWA

- Manifest
- Icons
- Service Worker
- Offline-Cache
- Installationshinweise

## Phase 9: Qualitätsprüfung

- Fehlerfälle testen
- mobile Darstellung verbessern
- iPhone-Safari testen
- Datenverlust vermeiden
- README schreiben

---

# 21. Akzeptanzkriterien

Die erste Version gilt als fertig, wenn:

- die App auf einem Smartphone vollständig bedienbar ist
- sie über „Zum Home-Bildschirm“ installiert werden kann
- Tagesdaten gespeichert werden
- Tagesdaten bearbeitet und gelöscht werden können
- KFA-Messungen berechnet und gespeichert werden
- Gewicht, KFA, Kalorien und Protein als Diagramme dargestellt werden
- Kalorien- und Proteinziele gespeichert werden
- die Daten nach einem Neustart erhalten bleiben
- ein JSON-Backup exportiert werden kann
- ein JSON-Backup importiert werden kann
- die App nach dem ersten Laden offline funktioniert
- keine Daten an einen externen Server übertragen werden
- keine schwerwiegenden Fehler in der Browser-Konsole auftreten

---

# 22. Nicht Bestandteil der ersten Version

Folgende Funktionen ausdrücklich nicht implementieren:

- Login
- Registrierung
- Benutzerkonten
- Cloud-Synchronisierung
- Backend
- Server-Datenbank
- Bezahlfunktion
- Abonnements
- Food-Datenbank
- Barcode-Scanner
- Mahlzeitentracking
- Apple-Health-Integration
- Google-Fit-Integration
- App-Store-Veröffentlichung
- Push-Benachrichtigungen
- Social Features
- Vergleich zwischen Familienmitgliedern

Die Architektur soll spätere Erweiterungen nicht unnötig erschweren, aber die erste Version soll nicht für hypothetische Funktionen überentwickelt werden.

---

# 23. Arbeitsanweisung an Codex

1. Analysiere zuerst die Anforderungen.
2. Erstelle anschließend einen kurzen Implementierungsplan.
3. Implementiere die App schrittweise.
4. Halte die Dateien klein und logisch getrennt.
5. Verwende aussagekräftige Funktions- und Variablennamen.
6. Kommentiere nur Stellen, deren Zweck nicht unmittelbar verständlich ist.
7. Vermeide unnötige Abhängigkeiten.
8. Prüfe jede Phase auf Fehler, bevor die nächste Phase begonnen wird.
9. Führe nach der Implementierung einen vollständigen Funktionstest durch.
10. Dokumentiere im README:
   - Projektstart
   - lokale Nutzung
   - Hosting
   - PWA-Installation
   - Datenspeicherung
   - Backup und Wiederherstellung
11. Hinterlasse keine Platzhalterfunktionen oder nicht implementierten Buttons.
12. Liefere am Ende eine Liste:
   - implementierte Funktionen
   - bekannte Einschränkungen
   - durchgeführte Tests
   - empfohlene spätere Erweiterungen

Beginne mit einer vollständig funktionierenden Basisversion und priorisiere Zuverlässigkeit, einfache Bedienung und Schutz vor Datenverlust.