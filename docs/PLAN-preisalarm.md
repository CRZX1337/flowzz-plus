# Plan: Preisverlauf + Telegram-Alarm (v2.0)

**Ziel:** Preise täglich mitschreiben, Verlauf im Overlay zeigen und per Telegram melden, wenn
ein Zielpreis erreicht wird – unabhängig davon, ob Firefox offen ist.

**Nicht-Ziel:** Bestellungen, Rezepte, medizinische Beratung, Weitergabe von Daten an Dritte.

---

## 1. Datenlage (verifiziert)

- Produktlisten: `/api/v1/views/flowers|extracts|edibles` (Blüten 2.717, Extrakte 209).
- Preise: `/api/v1/views/vendors/prices/<2|3|4>/<ids>` → Zeilen `[productId, price, avail, vendorId]`.
  **Max. ~3 Produkte pro Request**, schnelle Folgen liefern HTTP 429.
- Apotheken: 611 Stammdatensätze aus den Props der Listenseite (`id`, `name`, `plz`, `city`,
  `lat/lon`, Versandflags).
- Der Listenpreis `min_price` ist bereits der günstigste Apothekenpreis – für einen Verlauf
  reicht theoretisch ein täglicher Snapshot der Liste; für „welche Apotheke war wann günstig“
  braucht es die Offers.

## 2. Architektur

```
cron (systemd timer, 2×/Tag)
   └─ crawler.py ──> SQLite (prices.db) ──> Flask-API (/flowzz-api) ──> Extension
                                    └────> telegram_bot.py (long polling) ──> Telegram
```

Alles auf dem bestehenden Server (91.98.28.155), HTTPS über `crzx.space`, kein externer Dienst.

### 2.1 Datenbank (SQLite, WAL)

```sql
products(id INTEGER PRIMARY KEY, slug TEXT, name TEXT, cat TEXT, origin TEXT,
         thc REAL, cbd REAL, producer TEXT, updated_at TEXT);
snapshots(id INTEGER PRIMARY KEY, taken_at TEXT, products_seen INTEGER, errors INTEGER);
prices(product_id INTEGER, vendor_id INTEGER, price REAL, avail INTEGER,
       taken_at TEXT, PRIMARY KEY(product_id, vendor_id, taken_at));
watch(id INTEGER PRIMARY KEY, product_id INTEGER, target REAL, chat_id TEXT,
      token TEXT, active INTEGER DEFAULT 1, created_at TEXT, last_notified TEXT);
links(code TEXT PRIMARY KEY, token TEXT, chat_id TEXT, created_at TEXT, used INTEGER DEFAULT 0);
```

- Retention: 180 Tage, nächtliches `DELETE FROM prices WHERE taken_at < date('now','-180 day')`.
- Tägliches Backup: `sqlite3 prices.db ".backup /root/backups/flowzz-$(date +%F).db"`, 14 Tage.

### 2.2 Umfang der Aufzeichnung

Die Offers-API erlaubt nur 3 Produkte/Request. Hochrechnung:

| Umfang | Requests/Snapshot | Dauer bei 1,5 s Abstand |
|---|---|---|
| Alle Blüten (2.717) | ~906 | ~23 min |
| Nur Watchlist (realistisch < 100) | < 34 | < 1 min |
| Top 500 nach Preis/Rating | ~167 | ~4 min |

**Entscheidung:** Standard = Watchlist + optionaler „Top 500“-Seed. Kein Full-Crawl, das wäre
unhöflich gegenüber flowzz und unnötig. Der Listenpreis (`min_price`) wird zusätzlich für alle
Produkte täglich aus den 12 Listen-Requests erfasst – das ist billig und erlaubt einen
Minimal-Verlauf ohne Offers.

### 2.3 API (Flask, Präfix `/flowzz-api`)

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/health` | Status, letzter Snapshot, Produktzahl |
| GET | `/history/<product_id>?days=90` | Punkte `{ts,min,count}`, Apotheken-Top-5 |
| POST | `/watch` | `{product_id, target, token}` anlegen/aktualisieren |
| GET | `/watch?token=` | eigene Watchlist |
| DELETE | `/watch/<id>?token=` | löschen |
| POST | `/telegram/link` | Code + `https://t.me/<bot>?start=<code>` |
| POST | `/telegram/webhook` | nur falls Webhook statt Polling |

- Auth: zufälliges `token` (32 hex) pro Browser, im Extension-Storage; `X-Token`-Header.
- Rate-Limit: 60 Schreibzugriffe/Stunde/IP, 600 Reads/Stunde.
- Antworten klein halten (max. 365 Punkte), `Cache-Control: public, max-age=300` für History.

### 2.4 Telegram-Bot

- Long Polling (kein Webhook nötig), Token in `/root/.config/flowzz/bot.txt`, nicht im Repo.
- Befehle:
  - `/start <code>` verknüpft Chat mit Token (Code 15 min gültig, einmalig)
  - `/watch <flowzz-url> [ziel]` → Produkt anlegen
  - `/list`, `/del <id>`, `/pause`, `/resume`, `/help`
- Prüfung 2×/Tag: günstigster Preis ≤ Ziel **oder** ≥ 10 % unter letztem gemeldeten Preis.
- Nachricht: Produkt, Preis, Ziel, Apotheke (günstigste), Link, „Alarm pausieren“-Hinweis.
- Drosselung: max. 1 Nachricht pro Produkt pro 24 h; Telegram-Limit 30 msg/s wird nie erreicht.

### 2.5 Extension-Integration

- Preis-Dialog: Sparkline (90 Tage) + „Verlauf öffnen“ → Mini-Chart im Modal.
- Button „Telegram-Alarm“: öffnet `t.me/<bot>?start=<code>`; Status „verknüpft“ wird gepollt.
- Einstellungen: Server-URL (Default `https://crzx.space/flowzz-api`), „Telegram verbinden“,
  „Verlauf deaktivieren“ (löscht Token lokal).
- Ohne Server: bisheriges lokales Verhalten (Browser-Benachrichtigung) bleibt Fallback.

### 2.6 Betrieb

- `systemd`: `flowzz-api.service` (gunicorn, 2 Worker), `flowzz-bot.service`, `flowzz-crawl.timer`.
- nginx: `location /flowzz-api/ { proxy_pass http://127.0.0.1:8017/; }` im bestehenden
  `crzx.space`-Block, HTTPS-Zertifikat vorhanden.
- Logs: journald + `/var/log/flowzz/crawl.log`, Rotation 14 Tage.
- Monitoring: `/health`-Check per cron, Telegram-Nachricht an dich bei 2 Fehlschlägen.

## 3. Phasen

### Phase 0 – Machbarkeit (0,5 Tag)
- 50 Produkte zweimal crawlen, 429-Verhalten und Laufzeit messen.
- **Akzeptanz:** stabile Rate ohne 429, klare Obergrenze Requests/Stunde.

### Phase 1 – Crawler + DB (1,5 Tage)
- `crawler.py`: Produktlisten (3 Kategorien), Preise Watchlist/Top-500, Resume, Backoff.
- Schema, Retention, Backup, CLI `--once`, `--seed-top 500`.
- **Akzeptanz:** zwei Läufe erzeugen plausible Zeitreihen, keine Duplikate.

### Phase 2 – API (1 Tag)
- Flask-App mit Token, Rate-Limit, History-Endpoint, Watch-CRUD, `/health`.
- **Akzeptanz:** History liefert ≤ 365 Punkte in < 150 ms; ungültige Tokens 401.

### Phase 3 – Telegram (1,5 Tage)
- Bot, Linking-Code, Alarme, Pausen, Nachrichtenformat.
- **Akzeptanz:** `/start` verknüpft, `/watch` legt an, Testalarm kommt < 1 min nach Kriterium.

### Phase 4 – Extension (1,5 Tage)
- Sparkline/Chart, Telegram-Button, Einstellungen, Fallback.
- **Akzeptanz:** Verlauf sichtbar, Verbindung statusfest, ohne Server keine Fehlerdialoge.

### Phase 5 – Deployment (1 Tag)
- systemd/nginx, HTTPS-Check, Backup-Job, Monitoring, Doku.
- **Akzeptanz:** Neustart des Servers übersteht alles, `/health` grün, Alarm kommt an.

**Gesamt:** ca. 7 Arbeitstage.

## 4. Risiken

| Risiko | Wirkung | Mitigation |
|---|---|---|
| flowzz ändert Preise-Endpoint | keine Offers mehr | Parser isoliert, Fallback auf Listenpreis, Alarm läuft weiter |
| 429 / Block | Lücken im Verlauf | 1,5 s Abstand, Backoff, kleiner Umfang |
| Telegram-Bot-Token leakt | Missbrauch | Token nur serverseitig, `chmod 600`, Rotation möglich |
| Server-Ausfall | keine Alarme | `/health`-Watchdog, Catch-up beim nächsten Lauf |
| Rechtsrahmen | Abmahnung/DSGVO | nur öffentliche Preise, keine Gesundheitsdaten, Löschfunktion, Impressum |

## 5. Offene Fragen

1. Watchlist-Umfang: nur manuell markierte Produkte oder zusätzlich Top 500 automatisch?
2. Snapshot-Frequenz: 2×/Tag reicht? (Mehr bringt bei Apothekenpreisen kaum etwas.)
3. Soll der Verlauf auch im Vergleichsmodus erscheinen?
4. Brauchst du eine eigene Alarm-Seite im Panel (`crzx.space/panel/`) oder reicht Telegram?
