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

# Erweiterungsauftrag: Ziele und Fortschrittsprognosen

Erweitere die bestehende Fitness-Tracking-PWA um eine vollständige Zielfunktion für:

1. Gewichtsziele
2. Körperfettziele

Der Nutzer soll beispielsweise festlegen können:

- „Ich möchte in 12 Wochen 8 kg abnehmen.“
- „Ich möchte meinen KFA in 16 Wochen um 4 Prozentpunkte reduzieren.“
- „Ich möchte bis zum 15. Oktober 2026 ein Gewicht von 85 kg erreichen.“
- „Ich möchte bis zum 1. Dezember 2026 einen KFA von 18 % erreichen.“

Die App soll anhand des tatsächlichen 7-, 14- und 30-Tage-Trends anzeigen:

- ob der Nutzer aktuell im Ziel liegt
- ob er schneller oder langsamer als erforderlich vorankommt
- wie groß die Abweichung vom benötigten Fortschritt ist
- welchen Wert er bei gleichbleibendem Trend voraussichtlich zum Zieltermin erreicht
- wann er das Ziel bei gleichbleibendem Trend voraussichtlich erreicht

---

# 1. Grundprinzip

Implementiere Ziele nicht als einfache statische Zielwerte, sondern als zeitgebundene Fortschrittsziele.

Jedes Ziel benötigt:

- Zieltyp
- Ausgangswert
- Zielwert
- Startdatum
- Zieldatum
- benötigte Veränderung
- benötigte Veränderung pro Woche
- aktuellen Fortschritt
- Trendanalyse für 7, 14 und 30 Tage
- Prognose zum Zieltermin
- Statusbewertung

Unterstützte Zieltypen:

```javascript
const GOAL_TYPES = {
  WEIGHT: "weight",
  BODY_FAT: "bodyFat"
};
```

---

# 2. Begriffsklärung

## Gewichtsziel

Gewichtsveränderungen werden in Kilogramm angegeben.

Beispiel:

```text
Ausgangsgewicht: 95 kg
Zielgewicht: 87 kg
Veränderung: −8 kg
Zeitraum: 12 Wochen
```

## Körperfettziel

KFA-Veränderungen müssen standardmäßig in **Prozentpunkten** behandelt werden, nicht als relative Prozentänderung.

Beispiel:

```text
Ausgangs-KFA: 24 %
Ziel-KFA: 20 %
Veränderung: −4 Prozentpunkte
```

Die Benutzeroberfläche soll ausdrücklich „Prozentpunkte“ anzeigen, damit keine Verwechslung entsteht.

---

# 3. Ziel erstellen

Erstelle einen eigenen Bereich „Ziele“.

Der Nutzer soll zwischen folgenden Eingabemethoden wählen können.

## Methode A: Zielwert festlegen

Eingabefelder:

- Zieltyp
- Zielwert
- Startdatum
- Zieltermin

Beispiele:

```text
Gewicht von 95 kg auf 87 kg bis zum 15.10.2026
KFA von 24 % auf 20 % bis zum 01.12.2026
```

## Methode B: gewünschte Reduktion festlegen

Eingabefelder:

- Zieltyp
- gewünschte Reduktion
- Zeitraum in Wochen
- Startdatum

Beispiele:

```text
8 kg in 12 Wochen verlieren
4 KFA-Prozentpunkte in 16 Wochen verlieren
```

Berechne daraus automatisch:

- Zielwert
- Zieldatum

## Ausgangswert

Der Ausgangswert soll standardmäßig anhand der gespeicherten Daten bestimmt werden.

Für Gewicht:

- Verwende bevorzugt den 7-Tage-Durchschnitt zum Startdatum.
- Falls nicht genügend Daten vorhanden sind, verwende den letzten verfügbaren Gewichtswert am oder vor dem Startdatum.

Für KFA:

- Verwende den letzten verfügbaren KFA-Wert am oder vor dem Startdatum.
- Da KFA normalerweise nur wöchentlich gemessen wird, ist kein 7-Tage-Durchschnitt erforderlich.

Der Nutzer muss den automatisch bestimmten Ausgangswert manuell überschreiben können.

Zeige transparent an, wie der Ausgangswert bestimmt wurde.

Beispiel:

```text
Ausgangswert: 94,6 kg
Ermittelt aus dem durchschnittlichen Gewicht der letzten 7 Tage.
```

---

# 4. Datenmodell

Erweitere IndexedDB um einen Store `goals`.

Beispielstruktur:

```javascript
{
  id: string,
  type: "weight" | "bodyFat",

  startDate: "YYYY-MM-DD",
  targetDate: "YYYY-MM-DD",

  startValue: number,
  targetValue: number,

  direction: "decrease" | "increase",

  inputMode: "targetValue" | "changeOverWeeks",

  requestedChange: number | null,
  requestedWeeks: number | null,

  status: "active" | "completed" | "cancelled",

  createdAt: string,
  updatedAt: string,
  completedAt: string | null
}
```

In der ersten Version darf jeweils höchstens ein aktives Gewichtsziel und ein aktives KFA-Ziel existieren.

Vorhandene abgeschlossene oder abgebrochene Ziele sollen in einer Zielhistorie gespeichert bleiben.

---

# 5. Grundberechnung des benötigten Fortschritts

Berechne zunächst die Gesamtdauer in Tagen:

```javascript
durationDays = differenceInCalendarDays(targetDate, startDate);
```

Berechne die gewünschte Gesamtveränderung:

```javascript
totalRequiredChange = targetValue - startValue;
```

Bei einem Abnehmziel ist dieser Wert negativ.

Beispiel:

```text
startValue = 95
targetValue = 87
totalRequiredChange = −8
```

Berechne die erforderliche Veränderung pro Tag:

```javascript
requiredDailyRate = totalRequiredChange / durationDays;
```

Berechne die erforderliche Veränderung pro Woche:

```javascript
requiredWeeklyRate = requiredDailyRate * 7;
```

Beispiel:

```text
−8 kg in 84 Tagen
requiredDailyRate = −0,0952 kg pro Tag
requiredWeeklyRate = −0,667 kg pro Woche
```

---

# 6. Erwarteter Sollwert am heutigen Tag

Berechne die seit dem Startdatum vergangenen Tage:

```javascript
elapsedDays = differenceInCalendarDays(today, startDate);
```

Begrenze den Wert auf den Zielzeitraum:

```javascript
clampedElapsedDays = Math.max(
  0,
  Math.min(elapsedDays, durationDays)
);
```

Berechne den Sollwert für den aktuellen Tag:

```javascript
expectedValueToday =
  startValue + requiredDailyRate * clampedElapsedDays;
```

Beispiel:

```text
Start: 95 kg
Ziel: 87 kg
Dauer: 84 Tage
Vergangene Zeit: 42 Tage

Sollwert heute:
91 kg
```

---

# 7. Ermittlung des aktuellen Werts

## Aktuelles Gewicht

Verwende für die Zielbewertung bevorzugt den aktuellen 7-Tage-Durchschnitt.

Der aktuelle 7-Tage-Durchschnitt soll aus allen vorhandenen Gewichtsmessungen innerhalb der letzten sieben Kalendertage berechnet werden.

Falls weniger als zwei Gewichtswerte vorhanden sind:

- verwende den letzten vorhandenen Gewichtswert
- kennzeichne die Aussage als weniger zuverlässig

## Aktueller KFA

Verwende den zuletzt gemessenen KFA-Wert.

Zeige zusätzlich das Alter der Messung an.

Beispiel:

```text
Letzte KFA-Messung: vor 9 Tagen
```

Wenn die letzte KFA-Messung älter als 21 Tage ist, soll eine Warnung erscheinen:

```text
Die aktuelle KFA-Prognose basiert auf einer älteren Messung.
```

---

# 8. Trendberechnung

Berechne getrennte Trends für:

- 7 Tage
- 14 Tage
- 30 Tage

Nutze für die Trendberechnung eine **lineare Regression** über die vorhandenen Messwerte des jeweiligen Zeitraums.

Verwende nicht nur den ersten und letzten Wert, da einzelne tägliche Schwankungen sonst die Bewertung stark verfälschen können.

## Regressionsmodell

Ordne jedem Messwert zu:

```javascript
x = Anzahl der Tage seit dem ersten Messdatum im Analysezeitraum
y = gemessener Wert
```

Berechne die Steigung:

```javascript
slope =
  sum((x - meanX) * (y - meanY)) /
  sum((x - meanX) ** 2);
```

Die Steigung entspricht der Veränderung pro Tag.

Berechne daraus:

```javascript
trendDailyRate = slope;
trendWeeklyRate = slope * 7;
```

## Interpretation

Beispiele:

```text
Gewichtstrend: −0,55 kg pro Woche
KFA-Trend: −0,20 Prozentpunkte pro Woche
```

---

# 9. Mindestanforderungen für Trends

Ein Trend darf nur berechnet werden, wenn genügend sinnvolle Daten vorliegen.

## Gewicht

Für einen belastbaren Trend:

- mindestens drei Messwerte
- Messwerte an mindestens drei unterschiedlichen Kalendertagen
- zeitliche Spannweite von mindestens drei Tagen

Für den 30-Tage-Trend sollte zusätzlich angezeigt werden, wie viele Messwerte verwendet wurden.

## KFA

Da KFA typischerweise nur einmal pro Woche gemessen wird:

- mindestens zwei Messwerte
- zeitliche Spannweite von mindestens sieben Tagen

Bei nur zwei KFA-Werten kann ein Trend angezeigt werden, aber mit dem Hinweis:

```text
Vorläufiger Trend – nur zwei Messungen vorhanden.
```

Wenn nicht genügend Daten vorhanden sind:

```text
Noch nicht genügend Messwerte für einen 14-Tage-Trend.
```

Erfinde keine Trendwerte und ersetze fehlende Daten nicht automatisch durch interpolierte Messungen.

---

# 10. Vergleich von Ist-Trend und benötigtem Trend

Vergleiche für jeden Zeitraum:

```javascript
actualWeeklyRate
```

mit:

```javascript
requiredWeeklyRate
```

Da Reduktionsziele negative Werte haben, darf die Logik nicht nur mit normalen Größer-/Kleiner-Vergleichen arbeiten.

Nutze stattdessen eine richtungsbereinigte Fortschrittsgeschwindigkeit.

## Richtungsfaktor

```javascript
const directionFactor =
  targetValue < startValue ? -1 : 1;
```

Berechne:

```javascript
requiredProgressRate =
  requiredWeeklyRate * directionFactor;

actualProgressRate =
  actualWeeklyRate * directionFactor;
```

Danach sind positive Werte immer Fortschritt in Zielrichtung.

Beispiel bei Gewichtsverlust:

```text
Benötigt: −0,67 kg pro Woche
Tatsächlich: −0,55 kg pro Woche

Richtungsbereinigt:
Benötigt: 0,67
Tatsächlich: 0,55
```

---

# 11. Geschwindigkeit im Verhältnis zum Ziel

Berechne:

```javascript
paceRatio = actualProgressRate / requiredProgressRate;
```

Beispiele:

```text
paceRatio = 1,00
genau im benötigten Tempo

paceRatio = 1,20
20 % schneller als erforderlich

paceRatio = 0,75
25 % langsamer als erforderlich

paceRatio = 0
kein Fortschritt

paceRatio < 0
Entwicklung läuft aktuell vom Ziel weg
```

Behandle den Sonderfall, dass `requiredProgressRate` null ist.

---

# 12. Statuskategorien

Bewerte jeden Trendzeitraum separat.

Verwende folgende Standardgrenzen:

## Deutlich vor dem Ziel

```javascript
paceRatio >= 1.15
```

Anzeige:

```text
Deutlich schneller als nötig
```

## Im Ziel

```javascript
paceRatio >= 0.85 && paceRatio < 1.15
```

Anzeige:

```text
Im Ziel
```

## Leicht hinter dem Ziel

```javascript
paceRatio >= 0.60 && paceRatio < 0.85
```

Anzeige:

```text
Etwas langsamer als nötig
```

## Deutlich hinter dem Ziel

```javascript
paceRatio >= 0 && paceRatio < 0.60
```

Anzeige:

```text
Deutlich hinter dem benötigten Tempo
```

## Entwicklung in falsche Richtung

```javascript
paceRatio < 0
```

Anzeige:

```text
Aktueller Trend entfernt sich vom Ziel
```

Die Statusbewertung muss zusätzlich berücksichtigen, ob der aktuelle Ist-Wert bereits vor oder hinter dem zeitlichen Sollwert liegt.

---

# 13. Abweichung vom Sollwert

Berechne:

```javascript
rawScheduleDeviation =
  currentValue - expectedValueToday;
```

Für eine einheitliche Darstellung in Zielrichtung:

```javascript
scheduleDeviation =
  rawScheduleDeviation * directionFactor;
```

Interpretation:

```text
scheduleDeviation > 0:
Nutzer liegt wertmäßig vor dem Plan.

scheduleDeviation = 0:
Nutzer liegt genau auf dem Plan.

scheduleDeviation < 0:
Nutzer liegt wertmäßig hinter dem Plan.
```

Beispiel Gewichtsreduktion:

```text
Sollgewicht heute: 91,0 kg
Aktueller 7-Tage-Schnitt: 91,8 kg
Abweichung: 0,8 kg hinter dem Plan
```

Beispiel:

```text
Soll-KFA heute: 21,5 %
Aktueller KFA: 21,0 %
Abweichung: 0,5 Prozentpunkte vor dem Plan
```

---

# 14. Prognose zum Zieltermin

Berechne für jeden Trendzeitraum den prognostizierten Wert am Zieltermin.

Verwende den aktuell repräsentativen Wert als Ausgangspunkt:

```javascript
remainingDays =
  differenceInCalendarDays(targetDate, today);
```

```javascript
projectedValueAtTargetDate =
  currentValue + trendDailyRate * remainingDays;
```

Begrenze `remainingDays` nicht auf einen negativen Wert. Wenn der Zieltermin bereits vergangen ist, soll stattdessen eine Abschluss- oder Überfälligkeitsbewertung erfolgen.

Beispiele:

```text
Bei deinem aktuellen 14-Tage-Trend:
Prognose am Zieltermin: 88,4 kg

Zielwert: 87,0 kg
Voraussichtliche Abweichung: 1,4 kg
```

Für KFA:

```text
Prognose am Zieltermin: 19,2 %
Zielwert: 18,0 %
Voraussichtliche Abweichung: 1,2 Prozentpunkte
```

---

# 15. Prognostiziertes Erreichungsdatum

Berechne, wann das Ziel bei unverändertem Trend erreicht würde.

```javascript
remainingChange = targetValue - currentValue;
```

Wenn sich der Trend in Zielrichtung bewegt:

```javascript
daysUntilGoal = remainingChange / trendDailyRate;
```

Das Ergebnis muss positiv und endlich sein.

Berechne daraus:

```javascript
projectedGoalDate = today + daysUntilGoal;
```

Beispiele:

```text
Voraussichtliches Erreichungsdatum:
24. Oktober 2026

Das sind 9 Tage nach deinem geplanten Zieltermin.
```

Falls sich der Trend nicht in Zielrichtung bewegt:

```text
Mit dem aktuellen Trend ist kein sinnvolles Erreichungsdatum berechenbar.
```

Falls der aktuelle Wert das Ziel bereits erreicht oder überschritten hat:

```text
Ziel aktuell erreicht.
```

---

# 16. Verbleibender benötigter Trend

Berechne zusätzlich, welches Tempo ab heute erforderlich wäre, um das Ziel trotzdem rechtzeitig zu erreichen.

```javascript
remainingRequiredChange =
  targetValue - currentValue;
```

```javascript
remainingRequiredDailyRate =
  remainingRequiredChange / remainingDays;
```

```javascript
remainingRequiredWeeklyRate =
  remainingRequiredDailyRate * 7;
```

Beispiel:

```text
Ursprünglich benötigtes Tempo:
−0,50 kg pro Woche

Ab heute benötigtes Tempo:
−0,68 kg pro Woche
```

Dadurch erkennt der Nutzer, ob ein Rückstand noch realistisch aufholbar ist.

---

# 17. Primäre Zielbewertung

Zeige eine zentrale Gesamtbewertung an.

Verwende bevorzugt:

- 14-Tage-Trend als Haupttrend
- 7-Tage-Trend als kurzfristige Entwicklung
- 30-Tage-Trend als langfristige Entwicklung

Begründung:

- 7 Tage reagieren schnell, sind aber schwankungsanfällig.
- 14 Tage bieten eine sinnvolle Balance.
- 30 Tage sind stabiler, reagieren aber langsamer auf aktuelle Veränderungen.

Falls kein 14-Tage-Trend verfügbar ist:

1. verwende den 30-Tage-Trend
2. falls dieser nicht verfügbar ist, verwende den 7-Tage-Trend
3. kennzeichne den verwendeten Trend deutlich

Beispiel:

```text
Gesamtstatus: Etwas hinter dem Ziel

Grundlage: 14-Tage-Trend
Aktueller Trend: −0,42 kg pro Woche
Benötigter Trend: −0,56 kg pro Woche
```

---

# 18. Darstellung im Dashboard

Erweitere das Dashboard um eine Zielkarte je aktivem Ziel.

## Beispiel Gewichtsziel

```text
Gewichtsziel

Aktuell: 91,8 kg
Ziel: 87,0 kg
Zieldatum: 15. Oktober 2026

Fortschritt: 40 %
Zeit vergangen: 50 %

Sollwert heute: 91,0 kg
0,8 kg hinter dem Plan
```

Darunter:

```text
7 Tage:
−0,70 kg/Woche
Im Ziel

14 Tage:
−0,48 kg/Woche
Etwas langsamer als nötig

30 Tage:
−0,57 kg/Woche
Im Ziel
```

Zusätzlich:

```text
Prognose am Zieltermin:
88,2 kg

Voraussichtlich erreichst du das Ziel:
am 29. Oktober 2026
14 Tage später als geplant
```

## Beispiel KFA-Ziel

```text
KFA-Ziel

Aktuell: 21,8 %
Ziel: 18,0 %
Zieldatum: 1. Dezember 2026

Sollwert heute: 21,3 %
0,5 Prozentpunkte hinter dem Plan
```

---

# 19. Fortschrittsanzeige

Berechne den Fortschritt nicht ausschließlich aus der vergangenen Zeit.

## Wertbasierter Fortschritt

```javascript
valueProgress =
  (currentValue - startValue) /
  (targetValue - startValue);
```

Begrenze für die normale Fortschrittsanzeige auf:

```javascript
0 bis 1
```

Anzeige als Prozent:

```javascript
progressPercentage =
  clamp(valueProgress * 100, 0, 100);
```

## Zeitfortschritt

```javascript
timeProgress =
  elapsedDays / durationDays;
```

Ebenfalls auf 0 bis 1 begrenzen.

Zeige beide Werte:

```text
Ziel-Fortschritt: 42 %
Verbrauchte Zeit: 50 %
```

Dies macht sichtbar, ob der Fortschritt zur vergangenen Zeit passt.

---

# 20. Zielverlauf visualisieren

Erweitere die Gewicht- und KFA-Diagramme um eine Ziellinie.

Die Ziellinie verläuft linear:

```text
vom Ausgangswert am Startdatum
zum Zielwert am Zieltermin
```

Im Diagramm sollen sichtbar sein:

- tatsächliche Messwerte
- tatsächlicher Trend
- geplante Ziellinie
- Zielpunkt
- heutiger Sollwert

Verwende unterschiedliche Linienstile und nicht ausschließlich unterschiedliche Farben.

Beispiel:

- tatsächliche Werte: durchgezogene Linie
- Trendlinie: gestrichelte Linie
- Zielpfad: gepunktete Linie

Füge eine verständliche Legende hinzu.

---

# 21. Hinweise zur statistischen Aussagekraft

Zeige bei Trends eine Datenqualitätsanzeige.

Beispiel:

```text
14-Tage-Trend
Datenbasis: 11 Messungen an 11 Tagen
Aussagekraft: gut
```

Mögliche Bewertung:

## Gering

- Mindestanforderung gerade erfüllt
- wenige oder stark verteilte Messwerte

## Mittel

- ausreichende Zahl von Messwerten
- mehrere unterschiedliche Tage

## Gut

Für Gewicht beispielsweise:

- mindestens zehn Messwerte im betrachteten Zeitraum
- Messungen an mindestens 70 % der Tage

Die Datenqualität darf die eigentliche Berechnung nicht verändern. Sie dient nur als Hinweis.

---

# 22. Besondere Fälle

Behandle mindestens folgende Fälle korrekt.

## Ziel beginnt in der Zukunft

- noch keine Bewertung vornehmen
- Countdown anzeigen
- keine Abweichung berechnen

## Zieltermin ist erreicht

Bewerte:

- Ziel erreicht
- Ziel knapp verfehlt
- Ziel verfehlt

Speichere das Ziel nicht automatisch als abgeschlossen, ohne den Nutzer zu informieren.

## Ziel bereits vorzeitig erreicht

Zeige:

```text
Ziel vorzeitig erreicht.
```

Biete an:

- Ziel abschließen
- neues Ziel festlegen
- bestehendes Ziel weiterführen

## Gewicht oder KFA steigt trotz Reduktionsziel

Zeige keine mathematisch falsche positive Prognose.

Status:

```text
Aktueller Trend bewegt sich vom Ziel weg.
```

## Fehlende Messwerte

- keine Werte erfinden
- keine Nullwerte einsetzen
- keine Lücken automatisch mit dem letzten Wert auffüllen
- klar anzeigen, welche Berechnungen deshalb nicht möglich sind

## Unregelmäßige Messabstände

Die lineare Regression muss echte Zeitabstände zwischen den Messdaten verwenden.

Behandle einen Abstand von zehn Tagen nicht so, als lägen die Messungen an zwei aufeinanderfolgenden Tagen.

## Mehrere Messungen am gleichen Tag

Falls die Datenstruktur mehrere Messungen pro Tag zulässt:

- Gewicht: Tagesmittelwert verwenden
- KFA: letzten gespeicherten Wert des Tages verwenden

In der aktuellen App sollte grundsätzlich nur ein relevanter Tageswert pro Datumswert existieren.

---

# 23. Gesundheitliche Plausibilitätswarnungen

Die App darf keine medizinische Beratung geben.

Sie soll jedoch bei sehr aggressiven Zielen eine neutrale Warnung anzeigen.

Beispielsweise bei Gewichtsreduktion:

```javascript
Math.abs(requiredWeeklyRate) > 1.0
```

Meldung:

```text
Dieses Ziel erfordert eine Gewichtsveränderung von mehr als 1 kg pro Woche. Prüfe, ob der gewählte Zeitraum realistisch und für dich geeignet ist.
```

Bei KFA-Zielen soll keine feste medizinische Sicherheitsschwelle behauptet werden.

Stattdessen:

```text
Körperfettmessungen mit einer Zange sind Schätzwerte. Große kurzfristige Veränderungen können durch Messabweichungen entstehen.
```

Verwende keine Formulierungen wie:

- gesund
- ungesund
- sicher
- medizinisch empfohlen

sofern diese nicht durch verlässliche medizinische Regeln begründet werden.

---

# 24. Benutzeroberfläche für Ziele

Erstelle mindestens folgende Ansichten:

## Zielübersicht

- aktive Ziele
- Fortschritt
- Status
- Zieldatum
- Prognose
- Ziel öffnen
- Ziel bearbeiten
- Ziel abbrechen
- Ziel abschließen

## Ziel erstellen

- Zieltyp
- Eingabemethode
- Ausgangswert
- Zielwert oder gewünschte Veränderung
- Startdatum
- Zieltermin oder Wochenanzahl
- berechnetes erforderliches Wochentempo
- Plausibilitätswarnung
- Speichern

## Zieldetails

- Ausgangswert
- aktueller Wert
- Zielwert
- Sollwert heute
- Fortschritt
- Zeitfortschritt
- 7-Tage-Trend
- 14-Tage-Trend
- 30-Tage-Trend
- benötigter Trend
- ab heute benötigter Trend
- Prognose zum Zieltermin
- prognostiziertes Erreichungsdatum
- Diagramm mit Zielpfad

## Zielhistorie

- abgeschlossen
- abgebrochen
- erreicht oder verfehlt
- tatsächlicher Endwert
- Start- und Enddatum

---

# 25. Architektur

Kapsle die Berechnungen in einer eigenen Datei.

Empfohlene Datei:

```text
js/goals.js
```

Oder bei einer modulareren Struktur:

```text
js/goals/
├── goal-model.js
├── goal-calculations.js
├── goal-trends.js
├── goal-status.js
└── goal-view.js
```

Die Berechnungsfunktionen dürfen nicht direkt auf DOM-Elemente zugreifen.

Nutze reine Funktionen, die Eingabewerte erhalten und Ergebnisse zurückgeben.

Beispiele:

```javascript
calculateRequiredRate(goal)
calculateExpectedValueToday(goal, today)
calculateLinearTrend(entries, startDate, endDate)
calculateScheduleDeviation(goal, currentValue, today)
calculatePaceRatio(goal, actualWeeklyRate)
calculateProjectedValue(goal, currentValue, trendDailyRate, today)
calculateProjectedGoalDate(goal, currentValue, trendDailyRate, today)
calculateRemainingRequiredRate(goal, currentValue, today)
calculateGoalProgress(goal, currentValue, today)
evaluateGoalStatus(goal, analysis)
```

---

# 26. Rückgabeobjekt der Zielanalyse

Erstelle eine zentrale Funktion:

```javascript
analyzeGoal(goal, entries, today)
```

Sie soll ein strukturiertes Ergebnis liefern.

Beispiel:

```javascript
{
  goalId: "goal-123",

  currentValue: 91.8,
  currentValueMethod: "7-day-average",

  durationDays: 84,
  elapsedDays: 42,
  remainingDays: 42,

  requiredDailyRate: -0.0952,
  requiredWeeklyRate: -0.6667,

  expectedValueToday: 91.0,
  scheduleDeviation: -0.8,

  valueProgress: 0.40,
  timeProgress: 0.50,

  trends: {
    days7: {
      available: true,
      measurementCount: 6,
      spanDays: 6,
      dailyRate: -0.10,
      weeklyRate: -0.70,
      paceRatio: 1.05,
      status: "onTrack",
      projectedValueAtTargetDate: 87.6,
      projectedGoalDate: "2026-10-19",
      confidence: "medium"
    },

    days14: {
      available: true,
      measurementCount: 12,
      spanDays: 13,
      dailyRate: -0.0686,
      weeklyRate: -0.48,
      paceRatio: 0.72,
      status: "slightlyBehind",
      projectedValueAtTargetDate: 88.9,
      projectedGoalDate: "2026-11-03",
      confidence: "good"
    },

    days30: {
      available: true,
      measurementCount: 26,
      spanDays: 29,
      dailyRate: -0.0814,
      weeklyRate: -0.57,
      paceRatio: 0.85,
      status: "onTrack",
      projectedValueAtTargetDate: 88.4,
      projectedGoalDate: "2026-10-28",
      confidence: "good"
    }
  },

  primaryTrend: "days14",
  overallStatus: "slightlyBehind",

  remainingRequiredDailyRate: -0.1143,
  remainingRequiredWeeklyRate: -0.80,

  warnings: []
}
```

---

# 27. Tests

Schreibe Unit-Tests für die gesamte Berechnungslogik.

Teste mindestens:

## Grundberechnungen

- erforderliche tägliche Rate
- erforderliche wöchentliche Rate
- Sollwert am heutigen Tag
- Fortschritt
- Zeitfortschritt

## Richtungslogik

- Gewichtsabnahme
- Gewichtszunahme
- KFA-Reduktion
- Ziel bereits überschritten
- Entwicklung in falsche Richtung

## Lineare Regression

- regelmäßig fallende Werte
- regelmäßig steigende Werte
- unregelmäßige Messabstände
- einzelne Ausreißer
- nur ein Wert
- zwei Werte
- mehrere Werte am gleichen Tag

## Prognosen

- prognostizierter Wert am Zieltermin
- prognostiziertes Erreichungsdatum
- Trend gleich null
- Trend in falsche Richtung
- Ziel bereits erreicht
- Zieltermin bereits vergangen

## Statuswerte

- deutlich vor dem Ziel
- im Ziel
- leicht hinter dem Ziel
- deutlich hinter dem Ziel
- vom Ziel weg

## Datenmangel

- kein 7-Tage-Trend möglich
- kein 14-Tage-Trend möglich
- kein 30-Tage-Trend möglich
- alte KFA-Messung
- fehlender Ausgangswert

Verwende feste Testdaten und prüfe Ergebnisse mit angemessener Fließkomma-Toleranz.

---

# 28. Akzeptanzkriterien

Die Erweiterung gilt als fertig, wenn:

- Gewichts- und KFA-Ziele erstellt werden können
- Ziele durch Zielwert oder gewünschte Veränderung definiert werden können
- ein Start- und Zieldatum gespeichert wird
- die benötigte wöchentliche Veränderung korrekt berechnet wird
- der Sollwert für den aktuellen Tag korrekt berechnet wird
- 7-, 14- und 30-Tage-Trends getrennt berechnet werden
- die Trends echte zeitliche Abstände berücksichtigen
- die Trendberechnung lineare Regression verwendet
- jeder Trend einen verständlichen Status erhält
- die Abweichung vom Sollwert angezeigt wird
- die Prognose zum Zieltermin angezeigt wird
- ein prognostiziertes Erreichungsdatum berechnet wird
- das ab heute benötigte Tempo angezeigt wird
- fehlende Daten korrekt behandelt werden
- Gewicht und KFA unterschiedliche Messfrequenzen berücksichtigen
- Zielpfad und tatsächliche Werte im Diagramm dargestellt werden
- abgeschlossene und abgebrochene Ziele gespeichert bleiben
- alle zentralen Berechnungen mit Unit-Tests abgedeckt sind

---

# 29. Nicht implementieren

In dieser Erweiterung ausdrücklich nicht implementieren:

- automatische Anpassung des Kalorienziels
- Ernährungs- oder Trainingsberatung
- medizinische Empfehlungen
- Push-Benachrichtigungen
- Cloud-Synchronisierung
- Login
- Backend
- Vergleich mit anderen Personen
- KI-basierte Prognosen
- nichtlineare Vorhersagemodelle

Die Prognosen sollen bewusst transparent und nachvollziehbar auf linearer Regression beruhen.

---

# 30. Arbeitsanweisung an Codex

1. Prüfe zunächst die bestehende Projektstruktur und Datenmodelle.
2. Erstelle einen kurzen Implementierungsplan.
3. Implementiere zuerst die reinen Berechnungsfunktionen.
4. Schreibe für diese Funktionen Unit-Tests.
5. Erweitere danach IndexedDB um den Ziel-Store.
6. Implementiere anschließend Zielerstellung und Zielbearbeitung.
7. Integriere danach die Zielanalyse in Dashboard und Trends.
8. Ergänze die Zielpfade in den Diagrammen.
9. Teste Gewichts- und KFA-Ziele mit realistischen Beispieldaten.
10. Prüfe besonders sorgfältig negative Änderungsraten und Richtungsvergleiche.
11. Vermeide versteckte oder nicht erklärbare Berechnungen.
12. Zeige dem Nutzer immer die verwendete Datenbasis und den zugrunde liegenden Trendzeitraum.
13. Hinterlasse keine Platzhalter, nicht funktionierenden Buttons oder ungetesteten Kernberechnungen.
14. Dokumentiere die Berechnungslogik im README in verständlicher Form.
15. Liefere abschließend:
   - implementierte Funktionen
   - verwendete Formeln
   - ausgeführte Tests
   - bekannte Einschränkungen
   - Beispiele für überprüfte Zielberechnungen

   # Deployment und Nutzung auf dem iPhone

Bereite die App so vor, dass sie kostenlos über GitHub Pages veröffentlicht und auf einem iPhone als Progressive Web App installiert werden kann.

## Anforderungen

1. Verwende ausschließlich relative Pfade, damit die App auch in einem GitHub-Pages-Unterverzeichnis funktioniert.
2. Stelle sicher, dass `manifest.json`, App-Icons und Service Worker unter einer URL wie `/fitness-tracker/` korrekt geladen werden.
3. Der Service Worker darf nicht von einer Veröffentlichung in der Domain-Wurzel ausgehen.
4. Implementiere eine saubere Cache-Versionierung.
5. Alte Cache-Versionen müssen beim Aktivieren des neuen Service Workers gelöscht werden.
6. Die App muss nach dem ersten vollständigen Laden offline starten können.
7. IndexedDB-Daten dürfen durch normale App-Updates nicht gelöscht oder überschrieben werden.
8. Zeige bei einer neuen App-Version einen verständlichen Aktualisierungshinweis.
9. Erstelle ein geeignetes Apple-Touch-Icon.
10. Berücksichtige iPhone-Safe-Areas über `env(safe-area-inset-top)` und `env(safe-area-inset-bottom)`.
11. Ergänze im README genaue Anleitungen für:
    - lokalen Start mit `python3 -m http.server`
    - Test auf einem iPhone im selben WLAN
    - Veröffentlichung über GitHub Pages
    - Installation über Safari und „Zum Home-Bildschirm hinzufügen“
    - Aktualisierung der veröffentlichten App
    - Export und Wiederherstellung der lokalen Daten
12. Prüfe, dass keine echten Nutzerdaten, Backups oder persönliche Testdaten in Git eingecheckt werden.
13. Erstelle eine passende `.gitignore`.
14. Teste die App gedanklich und technisch unter einer Unterordner-URL, nicht nur unter `localhost`.
15. Hinterlasse keine fest eingetragene lokale IP-Adresse oder absolute Entwicklungs-URL im Code.

Die produktive App soll anschließend über eine Adresse nach folgendem Muster funktionieren:

```text
https://BENUTZERNAME.github.io/fitness-tracker/
```