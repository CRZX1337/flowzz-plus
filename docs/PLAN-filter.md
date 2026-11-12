# Plan: Mehr Filter (v1.3)

**Ziel:** Effekte, Geschmack, medizinische Wirkung, Nebenwirkungen, Terpene, Apotheken-Umkreis
und ein Vergleichsmodus – sauber in die bestehende Suche integriert, mit Trefferzahlen und
teilbaren URLs.

**Nicht-Ziel:** Die flowzz-Website verändern, einen Account verlangen, Daten an Dritte senden.

---

## 1. Datenlage (verifiziert am 12.11.2026)

| Frage | Befund |
|---|---|
| Produktlisten | `/api/v1/views/flowers|extracts|edibles`, `pageSize` max. 240, Blüten 2.717 |
| Attribute pro Produkt | **nicht** in der Listen-API; nur auf der Produktseite in `#__NEXT_DATA__` (`pageContext.product.attributes.strain.data.attributes.strain_attributes` + `terpenes`) |
| Filterparameter der Website | `attref` (Effekt), `attrmed`, `attrta` (Geschmack), `terp`, `vend`, `lat`, `lon`, `radius`, `pickup/express/delivery/shipment`, `thc/cbd/pri/typ/prod/str/avail` |
| Verhalten der API | Parameter werden **ignoriert** (direkt und per SSR getestet: `total` bleibt 2.717, erste IDs unverändert) – auch `thc=25-` filtert die Liste nicht |
| Apothekenpreise | `/api/v1/views/vendors/prices/<2|3|4>/<ids>`; **max. ~3 Produkte pro Request**, schnelle Folgen → HTTP 429 |
| Apothekenstammdaten | `productFilterData.vendors` (611 Einträge mit `id`, `name`, `plz`, `city`, `lat`, `lon`, `PICKUP/STANDARD/EXPRESS/DELIVERY`) aus den Props der Listenseite |
| Fazit | Attribut-/Umkreisfilter brauchen einen **eigenen Index**, nicht die API-Parameter |

## 2. Architektur

### 2.1 Attribut-Index (Kern)

Ein nächtlicher Crawler erzeugt `attrs.json.gz`:

```json
{
  "version": "2026-11-13",
  "products": {
    "4907": {
      "e": [3, 5, 6],
      "t": [36, 22],
      "m": [19, 18],
      "s": [41],
      "tp": [3, 7, 10, 20]
    }
  }
}
```

- `e` Effekte (`effect`), `t` Geschmack (`taste`), `m` medizinische Wirkung (`medicalUsage`),
  `s` Nebenwirkungen (`sideEffects`), `tp` Terpene – jeweils IDs aus `strainAttributes`.
- Quelle: Produktseiten (`/product/<slug>`), dort liegen die Daten already im HTML.
- Laufzeit: 2.717 Seiten, 2–3 parallel, ~10–20 min; inkrementell nur Produkte mit neuem
  `published_at` oder unbekannter ID.
- Ausgabe: gzip ~150–300 KB, zusätzlich `attrs.meta.json` mit Label-Map, Counts und Datum.
- Verteilung: GitHub Release oder `crzx.space/flowzz/attrs.json.gz` mit `ETag`/`Last-Modified`.
- Extension lädt den Index beim Start (Cache 24 h), prüft `version`; fehlt er, bleiben die
  Attributfilter ausgeblendet (kein harter Fehler).

### 2.2 Extension

- Neue Sidebar-Sektionen: **Effekte**, **Geschmack**, **Medizinische Wirkung**, **Terpene**
  (jeweils aufklappbar, Suche bei langen Listen, Mehrfachauswahl, Trefferzahlen).
- Filterlogik lokal auf `state.items` + Index (Set-Schnitt), Facettenzählung wie bisher mit
  „andere Filter anwenden, eigenen Filter ausnehmen“.
- URL: `eff=5,10&taste=25&med=19&terp=3` (IDs, Komma-getrennt) → teilbare Links.
- Chips über dem Grid zeigen aktive Attributfilter mit ×.
- Ohne Index: Sektionen ausblenden und im Footer „Attribut-Index nicht geladen“ zeigen.

### 2.3 Apotheken-Umkreis

Ziel: „Zeig mir Blüten, die eine Apotheke im Umkreis von 20 km um 10115 Berlin liefert.“

- PLZ-Eingabe + Radius (5–100 km) + Versandarten (Abholung, Standard, Express, Kurier).
- PLZ → Koordinaten: `GET /api/v1/plz/<plz>` (Website nutzt denselben Endpunkt; Fallback:
  Geocoding über den bereits vorhandenen `maps`-Skill/OSM, dann lokal cachen).
- Apotheken-Index `vendors.json` (aus `productFilterData.vendors`, ~40 KB): id, Name, PLZ,
  Stadt, lat/lon, Versandflags.
- Produkt→Apotheken-Zuordnung ist der teure Teil: `/vendors/prices/...` nur 3 Produkte/Request.
  Deshalb **`offers.json.gz`** (id → `[vendorId, …]`) als zweiter Crawler-Output, wöchentlich,
  gedrosselt (1 Request/1,5 s → ~25 min für alle Blüten), mit 429-Backoff.
- Filter: Distanz PLZ↔Apotheke (Haversine), Versandflag, Schnitt mit `offers`.
- Fallback ohne `offers.json`: Filter nur auf der aktuell geladenen Seite (60 Produkte,
  20 Requests) mit Spinner – langsam, aber ehrlich.

### 2.4 Vergleichsmodus

- „Vergleichen“-Button auf der Karte (Checkbox), Sammelleiste unten (max. 4).
- Panel mit Tabelle: Preis/g (min/max), THC, CBD, Genetik, Herkunft, Hersteller, Bestrahlung,
  Bewertung, Terpene, Effekte, günstigste Apotheke.
- Differenzen hervorheben (bester Preis, höchster THC), Spalten fix, mobil horizontal scrollbar.
- „Als CSV exportieren“ und „Link teilen“ (`?fx=1&cmp=4907,4828`).

## 3. Phasen

### Phase 0 – Spike (0,5 Tag)
- Bestätigen, dass Detailseiten die Attribute flächendeckend enthalten (Stichprobe 100).
- `offers`-Drosselung messen (Requests/min ohne 429).
- **Akzeptanz:** ≥95 % der Blüten haben `e/t/m`, ≥80 % Terpene; stabiles Crawl-Tempo dokumentiert.

### Phase 1 – Index-Crawler (1,5 Tage)
- Node-Skript `tools/crawl-attributes.mjs`, Resume-Datei, Retry/Backoff, Fortschritt.
- `attrs.json.gz` + `attrs.meta.json`, CI-Schritt „Index bauen“ (manuell getriggert).
- **Akzeptanz:** vollständiger Lauf < 30 min, Ausgabe < 400 KB, reproduzierbar.

### Phase 2 – Attributfilter in der Extension (2 Tage)
- Index laden/cachen, Sektionen, Facetten, URL-Sync, Chips, leere Zustände.
- **Akzeptanz:** „Relaxed“ + „Kanada“ + THC ≥ 25 ergibt die erwartete Schnittmenge; Zahlen
  stimmen mit manueller Stichprobe überein; ohne Index keine kaputte UI.

### Phase 3 – Umkreis + Versand (2 Tage)
- `vendors.json` + `offers.json.gz`, PLZ/Radius/Flags, Distanzberechnung, Fallback.
- **Akzeptanz:** PLZ 10115 + 20 km liefert nur Produkte mit Apotheke im Radius; Abschalten
  der Flags ändert die Treffermenge nachvollziehbar.

### Phase 4 – Vergleichsmodus (1,5 Tage)
- Auswahl, Panel, Diff-Highlighting, CSV, URL.
- **Akzeptanz:** 4 Produkte vergleichbar, mobil lesbar, Link reproduziert die Auswahl.

### Phase 5 – QA & Release 1.3.0 (1 Tag)
- Chrome- und Firefox-Testlauf, Screenshots, README/Changelog, Tag + Release.

**Gesamt:** ca. 8,5 Arbeitstage.

## 4. Risiken

| Risiko | Wirkung | Mitigation |
|---|---|---|
| Detailseiten ändern ihr Datenformat | Index leer | Parser defensiv, `attrs.meta.json` mit Coverage, CI bricht bei <90 % ab |
| 429 beim Offers-Crawl | unvollständiger Index | 1,5 s Abstand, Backoff, Resume, nächtliche Fenster |
| Index veraltet | falsche Filtertreffer | `version` + täglicher Refresh, Hinweis im Footer |
| PLZ-Geocoding fehlt | Umkreisfilter tot | Fallback OSM/Nominatim, Cache |
| Datenmenge | lange Ladezeit | gzip, ID-Maps statt Objekte, nur aktive Kategorie laden |

## 5. Offene Fragen

1. Sollen Attributfilter auch für Extrakte/Edibles gelten? (Daten vorhanden, aber dünner.)
2. Umkreis: reicht „Apotheke im Radius“ oder zusätzlich „Apotheke liefert an meine PLZ“?
3. Vergleichsmodus: feste 4 Plätze oder frei erweiterbar?
4. Soll der Index öffentlich auf GitHub liegen (Transparenz) oder nur auf crzx.space?
