# Stats Visoro — Statistici de Performanță

> Rendszer a teljesítménymérő statisztikák kezelésére, a Hubbard-féle adminisztrációs technológia alapján.

**Live**: [https://web-production-971c8.up.railway.app](https://web-production-971c8.up.railway.app)
**Login**: `admin@visoro.ro` / `admin123`
**Repo**: [github.com/VisoroGroup/Statisztikak](https://github.com/VisoroGroup/Statisztikak)

---

## Tech Stack

| Réteg | Technológia |
|-------|-------------|
| Backend | Node.js 20 + Express 4 |
| Adatbázis | PostgreSQL (Railway) |
| ORM | Prisma v6 |
| Frontend | EJS + Bootstrap 5 + Bootstrap Icons |
| Grafikonok | ApexCharts |
| Auth | Passport.js (local strategy) |
| Session | connect-pg-simple (PostgreSQL-ben) |
| Hosting | Railway (auto-deploy GitHub push-on) |
| Nyelv | Román (UI), angol (kód) |

---

## Fő modulok

### 1. Autentikáció
- Regisztráció, bejelentkezés, kijelentkezés
- Passport.js local strategy, bcryptjs (10 salt round)
- Session: `connect-pg-simple` → `user_sessions` tábla PostgreSQL-ben
- Secure cookies: `httpOnly`, `sameSite: 'lax'`, `trust proxy` Railway-hez
- Middleware: `ensureAuthenticated`, `ensureOrg`, `ensureAdmin`

### 2. Statisztikák (Grafice) — Teljes CRUD
- Létrehozás, szerkesztés, törlés
- Érték bevitel munkanap logikával (`when_weekend`: before/after)
- Aggregáció: napi / heti / havi / negyedéves / éves
- Grafikon típusok: normál + formula
- Mérési típusok: szám / valuta / százalék
- Viability threshold (életképességi határvonal)
- Invertált mód (ha a csökkenés = jó)
- Tengely mód: auto / manuális (min/max)
- Munkanapok konfigurálása (hétfő–vasárnap checkbox)
- Change %, running total, NR kezelés
- ApexCharts mini kártyák + teljes grafikonok + trend vonal
- Külső API endpoint (`X-API-Key` header)

### 3. Összefoglalás (Sumar)
- Összes statisztika áttekintése egy oldalon
- Szűrés dátumtartomány és csoport szerint
- Rendezés: ábécé / mint a grafikonok
- Formula újraszámolás gomb

### 4. Átfedéses nézet (Suprapunere / Overlay)
- Több statisztika összehasonlítása egy grafikonon (max 10)
- Szűrés dátumtartomány és nézettípus szerint
- Egyedi színkódolás statisztikánként

### 5. Stări de funcționare (Működési állapotok)
- Hubbard hierarchia: 9 szint, színkódolt
- CRUD, szűrés felhasználó és grafikon szerint
- Minden állapothoz Write-Up oldal

### 6. Write-Up rendszer (Formula Write-Up)
- Minden állapot típushoz előre definiált lépések (Hubbard idézetek, románul)
- 45 lépés, mind a 9 állapot lefedve:
  - **Putere** (4 lépés)
  - **Schimbare de Putere** (4 lépés)
  - **Abundență** (4 lépés)
  - **Normal** (4 lépés)
  - **Urgență** (5 lépés)
  - **Pericol de Conducere** (6 lépés)
  - **Pericol Personal** (6 lépés)
  - **Non-Existență** (4 lépés)
  - **Non-Existență Extinsă** (8 lépés)
- Felhasználó kitölti a válaszait lépésenként (textarea)
- Plan de bătălie csatolás lépésenként
- Mentés → "Superiorul dvs. va primi o notificare"
- Print mód: `?print=yes` → `window.print()` automatikus, `@media print` CSS

### 7. Plan de bătălie (Csataterv)
- CRUD: létrehozás, szerkesztés, törlés
- Status: Activ / Finalizat
- Write-Up-ból hivatkozható lépésenként

### 8. Formula statisztikák
- `{id}` hivatkozás más statisztikákra
- Támogatott függvények: `AVG()`, `SUM()`, `MAX()`, `MIN()`
- Alapműveletek: `+`, `-`, `*`, `/`, zárójelek
- Automatikus újraszámolás az Összefoglalás oldalon

### 9. Admin panel (csak admin felhasználók)
- **Utilizatori** (Felhasználók): CRUD, szerepkör (admin/user), jelszó reset
- **Grupuri** (Csoportok): CRUD, sorrend, statisztika szám
- **Jurnal Audit** (Audit napló): minden művelet nyomon követése (ki, mit, mikor, IP cím)
- **Organizație** (Szervezet): név módosítás
- **Exportare totală** (Teljes export): összes statisztika CSV

### 10. Import / Export
- CSV export egyedi statisztikáról
- CSV export összes statisztikáról
- CSV import magyar dátumformátummal (2026.03.01)
- UTF-8 BOM Excel kompatibilitáshoz

---

## Adatbázis séma (Prisma)

### Táblák

| Tábla | Leírás |
|-------|--------|
| `organizations` | Szervezetek |
| `users` | Felhasználók (email, password hash, role) |
| `statistic_groups` | Statisztika csoportok |
| `statistics` | Statisztikák (title, aggregation, formula, stb.) |
| `statistic_group_assignments` | Statisztika → Csoport kapcsolat (M:N) |
| `statistic_values` | Értékek (record_date, value, author) |
| `statistic_quotas` | Kvóták (period_start, period_end, quota_value) |
| `statistic_conditions` | Működési állapotok (condition_type, date, user, statistic) |
| `condition_formula_steps` | Hubbard lépések (condition_type, step_number, step_text, language) |
| `condition_writeup_answers` | Felhasználó válaszai (condition_id, step_number, answer_text) |
| `battleplans` | Csataterv dokumentumok (title, description, status) |
| `condition_step_battleplans` | Csataterv → Lépés kapcsolat (condition_id, step_number, battleplan_id) |
| `audit_logs` | Audit napló (action, entity_type, entity_id, details, ip_address) |
| `user_sessions` | Session tábla (connect-pg-simple, runtime-ban jön létre) |

### Enum-ok (Prisma-ban definiálva)
- `OrgStatus`: active, inactive
- `UserRole`: admin, user
- `AggregationType`: daily, weekly, monthly, quarterly, yearly
- `MeasurementType`: numeric, currency, percentage
- `AxisMode`: auto, manual
- `GraphType`: normal, formula
- `StatStatus`: active, archived
- `AuthorType`: user, system, api
- `conditionType` (TEXT): putere, schimbare_putere, abundenta, normal, urgenta, pericol_conducere, pericol_personal, non_existenta, non_existenta_extinsa

---

## Fájlstruktúra

```
src/
├── server.js                       # Express app, middleware, route registration
├── config/
│   ├── database.js                 # Prisma client singleton
│   └── passport.js                 # Passport local strategy
├── middleware/
│   └── auth.js                     # ensureAuthenticated, ensureOrg, ensureAdmin
├── routes/
│   ├── auth.js                     # POST /login, /register, /logout
│   ├── statistics.js               # /:orgId/statistics/** CRUD
│   ├── conditions.js               # /:orgId/statistics/conditions + graph-condition (write-up)
│   ├── admin.js                    # /:orgId/admin/** (users, groups, audit, settings)
│   ├── export.js                   # CSV export/import + overlay view
│   ├── battleplans.js              # /:orgId/battleplans CRUD
│   └── api.js                      # /api/statistics/:apiKey (külső API)
├── controllers/
│   ├── statisticsController.js     # Statisztika CRUD + értékbevitel + audit log integráció
│   └── conditionsController.js     # Állapotok CRUD + Write-Up + print mód
├── services/
│   ├── statisticsService.js        # Számítások (aggregáció, change%, running total, Hubbard skála)
│   ├── conditionSuggestionService.js # Auto-javaslat állapothoz (slope algoritmus + Putere)
│   ├── formulaService.js           # Formula parser + értékelő ({id} hivatkozások)
│   └── auditService.js             # logAction() — non-blocking audit bejegyzés
├── views/
│   ├── layouts/
│   │   ├── main.ejs                # Fő layout (navbar + content)
│   │   └── auth.ejs                # Auth layout (login/register)
│   ├── partials/
│   │   ├── navbar.ejs              # Navigáció (román, role-based admin dropdown)
│   │   └── flash.ejs               # Flash üzenetek
│   ├── auth/
│   │   ├── login.ejs               # Autentificare
│   │   └── register.ejs            # Înregistrare
│   ├── statistics/
│   │   ├── index.ejs               # Grafice kártya rács
│   │   ├── detail.ejs              # Részletes grafikon + értékbevitel
│   │   ├── settings.ejs            # Statisztika beállítások
│   │   ├── summary.ejs             # Összefoglalás
│   │   ├── overlay.ejs             # Átfedéses nézet
│   │   ├── conditions.ejs          # Stări de funcționare lista + auto-suggest
│   │   └── writeup.ejs             # Formula Write-Up (lépések + válaszok + print)
│   ├── admin/
│   │   ├── users.ejs               # Utilizatori CRUD
│   │   ├── groups.ejs              # Grupuri CRUD
│   │   ├── audit.ejs               # Jurnal Audit (pagináció)
│   │   └── settings.ejs            # Organizație beállítások
│   ├── battleplans/
│   │   └── index.ejs               # Plan de bătălie lista + CRUD modálok
│   └── error.ejs                   # Hibaoldal
└── public/
    ├── css/style.css               # Egyedi stílusok + @media print
    ├── js/
    │   ├── charts.js               # ApexCharts + Hubbard Y-axis + raster label
    │   └── statistics.js           # Általános UI funkciók
    └── img/
        ├── logo.png                # Visoro Group logó
        ├── favicon.png             # 32x32 favicon
        └── apple-touch-icon.png    # 180x180 Apple Touch icon

prisma/
├── schema.prisma                   # Adatbázis séma (14 modell)
├── seed.js                         # Alap seed (szervezet + admin user)
├── seedConditions.js               # 45 Hubbard lépés seed (9 állapot, románul)
└── migrations/
    ├── 20260127_init/              # Alap táblák
    ├── 20260301165000_add_audit_logs/ # Audit log tábla
    └── 20260301190000_writeup_battleplan/ # Write-up + battleplan táblák + enum migráció
```

---

## Hubbard statisztika szabályok (v3 dokumentum)

### Dinamikus Y-tengely skála
A grafikon Y-tengelye NEM 0-tól indul. Algoritmus (`calculateHubbardScale()` in `statisticsService.js`):
- `yMin = floor(min(utolsó 6 hónap) × 0.9)` → kerekítve szép számra
- `yMax = ceil(max(utolsó 3 hónap) × 1.3)` → kerekítve szép számra
- `stepSize = (yMax - yMin) / 10` → kerekítve szép egységre
- Ha nincs elég adat → az összes rendelkezésre álló adatot használja
- Ha manuális tengely beállítás van → az felülírja a Hubbard skálát

### Raster felirat
`"1 raster = [stepSize] [egység]"` megjelenik a grafikon jobb felső sarkában (ApexCharts subtitle, 11px, szürke).

### Auto-javaslat állapothoz (slope algoritmus)
`conditionSuggestionService.js` — Amikor kiválasztasz egy grafikont az "Stare nouă" modálban:
1. AJAX hívás: `GET /:orgId/statistics/conditions/suggest/:statId`
2. Az utolsó 4–7 adatpont slope-ja kiszámolódik: `(utolsó − első) / (hetek × átlag)`
3. Javasolt állapot:

| Slope | Állapot |
|-------|---------|
| ≤ −0.5 | Non-Existență |
| −0.5 – −0.1 | Pericol de Conducere |
| −0.1 – +0.1 | Urgență |
| +0.1 – +0.4 | Normal |
| > +0.4 | Abundență |
| Külön szabály | Putere |

4. **Putere** külön: utolsó 4+ hét mind a 6 hónapos átlag felett + Normal szintű slope
5. Min. 3 adatpont szükséges, különben nincs javaslat

### Állapot színek

| Állapot | Szín | Kód |
|---------|------|-----|
| Putere | 🟣 Lila | `#6d28d9` |
| Schimbare de Putere | 🟣 Lila | `#7c3aed` |
| Abundență (Bőség) | 🟢 Zöld | `#16a34a` |
| Normal | 🔵 Kék | `#2563eb` |
| Urgență (Válság) | 🟠 Narancssárga | `#f59e0b` |
| Pericol de Conducere | 🔴 Piros | `#dc2626` |
| Pericol Personal | 🔴 Piros | `#dc2626` |
| Non-Existență | 🔴 Sötét piros | `#991b1b` |
| Non-Existență Extinsă | ⬛ Fekete-piros | `#450a0a` |

---

## Környezeti változók

| Változó | Leírás | Railway |
|---------|--------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Railway automatikusan adja |
| `SESSION_SECRET` | Session titkosítási kulcs | Manuálisan beállítva |
| `NODE_ENV` | Környezet | `production` |
| `PORT` | Port | Railway automatikusan adja |

---

## Lokális fejlesztés

```bash
# Klónozás
git clone https://github.com/VisoroGroup/Statisztikak.git
cd Statisztikak

# Függőségek
npm install

# .env fájl (hozz létre)
DATABASE_URL="postgresql://user:pass@localhost:5432/statsvisoro"
SESSION_SECRET="your-secret-here"

# Migrációk futtatása
npx prisma migrate deploy

# Seed adatok
node prisma/seed.js
node prisma/seedConditions.js

# Prisma client generálás
npx prisma generate

# Fejlesztői szerver
npm run dev
```

---

## Deployment (Railway)

- **Auto-deploy**: GitHub push → Railway automatikusan buildeli és deployolja
- **Build command**: `npx prisma generate && npx prisma migrate deploy`
- **Start command**: `node src/server.js`
- **Domain**: `web-production-971c8.up.railway.app` (később egyedi domain)

---

## API végpontok összefoglaló

### Autentikáció
| Method | URL | Leírás |
|--------|-----|--------|
| POST | `/login` | Bejelentkezés |
| POST | `/register` | Regisztráció |
| GET | `/logout` | Kijelentkezés |

### Statisztikák
| Method | URL | Leírás |
|--------|-----|--------|
| GET | `/:orgId/statistics` | Grafice lista (kártya rács) |
| GET | `/:orgId/statistics/detail-graph/:id` | Részletes grafikon |
| GET | `/:orgId/statistics/settings/:id` | Beállítások oldal |
| POST | `/:orgId/statistics/create` | Új statisztika |
| POST | `/:orgId/statistics/detail/:id` | Érték/kvóta/jegyzet hozzáadás |
| POST | `/:orgId/statistics/settings/:id` | Beállítások mentés |
| POST | `/:orgId/statistics/delete/:id` | Törlés |
| GET | `/:orgId/statistics/summary` | Összefoglalás |
| POST | `/:orgId/statistics/summary` | Formula újraszámolás |

### Overlay
| Method | URL | Leírás |
|--------|-----|--------|
| GET | `/:orgId/statistics/overlay` | Átfedéses nézet |

### Stări de funcționare + Write-Up
| Method | URL | Leírás |
|--------|-----|--------|
| GET | `/:orgId/statistics/conditions` | Állapotok lista |
| POST | `/:orgId/statistics/conditions` | Új állapot |
| POST | `/:orgId/statistics/conditions/:id/edit` | Szerkesztés |
| POST | `/:orgId/statistics/conditions/:id/delete` | Törlés |
| GET | `/:orgId/statistics/conditions/suggest/:statId` | Auto-javaslat (AJAX JSON) |
| GET | `/:orgId/statistics/graph-condition/:id` | Write-Up oldal |
| POST | `/:orgId/statistics/graph-condition/:id` | Write-Up mentés |
| GET | `/:orgId/statistics/graph-condition/:id?print=yes` | Write-Up nyomtatás |

### Plan de bătălie
| Method | URL | Leírás |
|--------|-----|--------|
| GET | `/:orgId/battleplans` | Lista |
| POST | `/:orgId/battleplans` | Létrehozás |
| POST | `/:orgId/battleplans/:id/edit` | Szerkesztés |
| POST | `/:orgId/battleplans/:id/delete` | Törlés |

### Admin
| Method | URL | Leírás |
|--------|-----|--------|
| GET | `/:orgId/admin/users` | Felhasználók lista |
| POST | `/:orgId/admin/users` | Új felhasználó |
| POST | `/:orgId/admin/users/:id/edit` | Szerkesztés |
| POST | `/:orgId/admin/users/:id/delete` | Törlés |
| GET | `/:orgId/admin/groups` | Csoportok lista |
| POST | `/:orgId/admin/groups` | Új csoport |
| POST | `/:orgId/admin/groups/:id/edit` | Szerkesztés |
| POST | `/:orgId/admin/groups/:id/delete` | Törlés |
| GET | `/:orgId/admin/audit` | Audit napló |
| GET | `/:orgId/admin/settings` | Szervezet beállítások |
| POST | `/:orgId/admin/settings` | Szervezet mentés |

### Export / Import
| Method | URL | Leírás |
|--------|-----|--------|
| GET | `/:orgId/statistics/export/:id` | Egyedi CSV export |
| GET | `/:orgId/statistics/export-all` | Összes CSV export |
| POST | `/:orgId/statistics/import/:id` | CSV import |

### Külső API
| Method | URL | Header | Leírás |
|--------|-----|--------|--------|
| POST | `/api/statistics/:apiKey` | `X-API-Key` | Értékbevitel külső rendszerből |

---

## Biztonság

- **Helmet.js** — HTTP biztonsági headerek
- **bcryptjs** — jelszó hash (10 salt round)
- **Secure cookies** — `httpOnly`, `sameSite: 'lax'`
- **trust proxy** — Railway reverse proxy kezelés
- **Role-based access** — admin funkciók `ensureAdmin` middleware-rel védve
- **Audit trail** — minden kritikus művelet naplózva (IP cím + felhasználó + részletek)

---

## Specifikáció forrás

A rendszer az `app.makh.org` magyar nyelvű statisztikai rendszer alapján épült, teljesen új implementációval, román nyelvű UI-val. A fő specifikáció a `MAKH_Statisztika_Specifikacio.docx` fájlban van, kiegészítő dokumentumok:
- `MAKH_Supplement_WriteUp_PDF.docx` — Write-Up funkció + Hubbard lépések
- `MAKH_Supplement_v2_WriteUp_Roman.docx` — Román fordítás + bővített lépések
- `MAKH_Supplement_v3_HubbardStatRules.docx` — Hubbard grafikon szabályok (Y-tengely, slope, állapot-javaslat)

---

## Beszélgetés napló (Changelog)

### 2026-03-01 — Alap rendszer felépítés
- Teljes projekt létrehozás (Node.js + Express + Prisma + EJS + Bootstrap 5)
- Logo és favicon generálás
- Statisztikák CRUD, értékbevitel, grafikon (ApexCharts)
- Admin panel (felhasználók, csoportok, audit, szervezet)
- CSV export/import, overlay nézet, összefoglalás
- Stări de funcționare (9 Hubbard szint, CRUD)
- Write-Up rendszer (45 lépés, battleplan csatolás, print mód)
- Railway deploy (auto-deploy GitHub push)

### 2026-03-02 — Teljes román fordítás
- 5 nézet (index, detail, summary, settings, overlay) teljes román fordítás
- Flash üzenetek (admin, auth, statisticsController, conditionsController, battleplans)
- Locale: `hu-HU` → `ro-RO` mindenhol
- `Rendszer` → `Sistem`

### 2026-03-02 — Hubbard statisztika szabályok (v3 doksi)
- Dinamikus Y-tengely algoritmus (`calculateHubbardScale()`)
- Raster felirat a grafikon sarkában
- Auto-javaslat állapothoz (`conditionSuggestionService.js` + slope algoritmus)
- Putere (Hatalom) külön multi-hét detektálás
- `charts.js` teljes átírás (román szövegek + Hubbard integráció)
- Állapot színek javítás (Pericol=piros, Urgență=narancs, Normal=kék, Abundență=zöld)
