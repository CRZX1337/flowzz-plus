# flowzz+ · Herkunft, Preise & Suche

Inoffizielle Userscript-/Erweiterungs-Sammlung für [flowzz.com](https://flowzz.com):
Herkunftsfilter, Volltextsuche, Apotheken-Preisvergleich, Favoriten und CSV-Export –
für **Blüten, Extrakte und Edibles**.

![Screenshot](docs/screenshot.png)
![Darkmode](docs/dark.png)

## Installation (Tampermonkey, empfohlen)

1. [Tampermonkey](https://www.tampermonkey.net/) installieren (Firefox, Chrome, Edge, Safari).
2. Diesen Link öffnen:
   **https://github.com/CRZX1337/flowzz-plus/releases/latest/download/flowzz-plus.user.js**
3. Im Tampermonkey-Dialog auf **Installieren** klicken.
4. flowzz.com neu laden – unten rechts erscheint **„Herkunft filtern“** (oder `/` drücken).

**Auto-Update:** Das Script trägt `@updateURL` und `@downloadURL` auf das jeweils neueste
Release. Tampermonkey prüft automatisch (Standard: täglich) und aktualisiert; manuell im
Dashboard unter *Einstellungen → Updates prüfen*. Wichtig: über den Link installieren, nicht
die Datei herunterladen und hineinziehen – sonst fehlt die Update-URL.

## Als Erweiterung

**Firefox:** `flowzz-plus-firefox.xpi` aus dem [neuesten Release](../../releases/latest)
herunterladen und unter `about:debugging#/runtime/this-firefox` → *Temporäres Add-on laden*
auswählen. Läuft bis zum Neustart; dauerhaft erst nach Signatur (AMO unlisted).

**Chrome/Edge:** `flowzz-plus-chrome.zip` entpacken, `chrome://extensions` → Entwicklermodus →
*Entpackte Erweiterung laden*.

## Funktionen

- **Herkunft** – alle Länder mit Flagge und Trefferzahl, Mehrfachauswahl
- **Wirkung (subjektiv), Geschmack, Terpene** – Filter mit Trefferzahlen aus dem
  Attribut-Index (29 Wirkungs- und 47 Terpen-Labels)
- **Suche** über Sorte, Produktname, Hersteller und Herkunft
- **Filter** – Preis pro Gramm, THC von/bis, Strain-Typ, Hersteller, Bestrahlung,
  nur lieferbar, nur Favoriten
- **Kategorien** – Blüten (2.717), Extrakte (209), Edibles
- **Apotheken-Preisvergleich** pro Produkt mit Preis, PLZ/Ort, Verfügbarkeit
- **Favoriten** – Stern auf der Karte, Filter „Nur Favoriten“, lokal gespeichert
- **CSV-Export** der aktuellen Auswahl
- **Darkmode** – Auto/Hell/Dunkel, für das Overlay **und** die flowzz-Seite; Wahl wird gespeichert
- **Vergleichsmodus** für 2–4 Produkte: Preise, THC/CBD, Herkunft, Bestrahlung, Bewertung,
  subjektive Wirkung und Terpene nebeneinander, beste Werte hervorgehoben
- **Teilbare Links**, z. B. `?fx=1&origin=Kanada&thc=25-&price=6&cat=flowers`

![Preisvergleich](docs/preisvergleich.png)

## Entwicklung

```bash
npm run check   # Syntax von content.js und background.js
npm run build   # erzeugt dist/ (userscript, chrome.zip, firefox.xpi, updates.json)
```

Quellen liegen in `src/`, Icons in `icons/`. Der Build inlined das CSS und die Attribut-Logik
in das Userscript und setzt Version + Update-URLs.

### Attribut-Index

`data/attrs.json.gz` (~150 KB) enthält je Produkt Effekte, Geschmack, medizinische Wirkung,
Nebenwirkungen und Terpene. Er wird von `tools/crawl-attributes.py` über die
Produkt-API (`/api/v1/views/<kategorie>/<slug>`) erzeugt:

```bash
python3 tools/crawl-attributes.py            # Delta, ~1,2 req/s
python3 tools/crawl-attributes.py --fresh    # komplett neu
```

GitHub Actions aktualisiert ihn täglich um 03:17 UTC (`.github/workflows/refresh-index.yml`)
und committet die Änderungen. Die Extension lädt ihn über
`raw.githubusercontent.com/CRZX1337/flowzz-plus/main/data/attrs.json.gz` (24 h Cache).

### Release

1. Version in `package.json` erhöhen (z. B. `1.2.0`).
2. Committen und Tag setzen: `git tag v1.2.0 && git push origin v1.2.0`.
3. GitHub Actions baut und veröffentlicht das Release mit allen Artefakten.
   Tampermonkey zieht das Update über `releases/latest/download/flowzz-plus.user.js`.

## Berechtigungen (Erweiterung)

`storage` (Cache, Favoriten, Attribut-Index) und `activeTab` (Toolbar-Klick),
Host nur `https://flowzz.com/*`.

## Darkmode

Der Umschalter sitzt oben rechts (Sonne/Mond) und als Segment „Darstellung“ in der Sidebar:
**Auto** folgt dem System, **Hell** und **Dunkel** sind fest. Die Wahl liegt lokal in
`fx_theme` und gilt für Overlay und Website.

- **Overlay:** eigene dunkle Palette über CSS-Variablen (kein Filter), Karten, Sidebar,
  Modals und Chips sind durchgezogen.
- **Website:** `filter: invert(1) hue-rotate(180deg)` auf `html`, Medien und das Overlay
  werden gegen-invertiert. Dadurch bleiben Produktbilder original, Grün-Akzente grün und
  die Kontrastverhältnisse der Seite rechnerisch erhalten (Invertierung erhält die relative
  Luminanz).

Kontraste prüfen:

```bash
npm run contrast   # WCAG-AA-Check aller Paare, Exitcode 1 bei Verstoß
```

Aktuell bestehen alle geprüften Paare 4,5:1 (hell min. 4,90:1, dunkel min. 5,86:1).

## Rechtlicher Hinweis

Die Wirkungs- und Terpenangaben stammen aus den freiwilligen Community-Angaben von
flowzz.com. Sie sind **keine medizinische Aussage, keine Indikation und keine
Heilversprechen**. Bewusst nicht enthalten: medizinische Anwendungsgebiete (z. B.
Depression, ADHS, Krebs) und Nebenwirkungen – solche Angaben sind für nicht zugelassene
Produkte rechtlich heikel und medizinisch unbelegt. Bei gesundheitlichen Fragen
Ärztin/Apotheker fragen.

## Grenzen

- Apothekenpreise werden pro Produkt geladen (die API liefert max. ~3 Produkte pro Anfrage
  und drosselt); die Karte zeigt den Listenpreis, die Apothekenliste öffnet sich auf Klick.
- Edibles listet die API derzeit nur mit drei verfügbaren Produkten.
- Die Daten gehören flowzz.com; dieses Projekt zeigt sie nur anders an.

## Lizenz

MIT – siehe [LICENSE](LICENSE). Kein offizielles Angebot von flowzz.com.
