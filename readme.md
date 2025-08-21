# POS System (CZ Reference)

Tento repozitář slouží jako **referenční základ** pro vytvoření nového moderního **POS (pokladního systému)** v **PHP 8.3+ a MySQL 8**.  
Obsahuje databázové schéma původního systému (`sql/schema.sql`) a ukázkový kód.  
Cílem je vytvořit nový systém, který převezme stejné funkce, ale v moderní architektuře a s lokalizací pro ČR.

---

## 🛠 Technologie pro nový systém
- Backend: **PHP 8.3+** (preferovaně **Laravel 11**)
- DB: **MySQL 8** (kódování **utf8mb4**)
- Frontend: Blade + TailwindCSS (nebo čisté HTML/CSS, Vanilla JS)
- Konfigurace: `.env` (DB připojení, locale, timezone)

---

## 🌍 Lokalizace pro ČR
- Měna: **CZK**
- Datum: `dd.mm.yyyy`
- Timezone: `Europe/Prague`
- **DPH sazby**: 21 %, 12 %, 0 % (s historií – např. 10 %, 15 %)
- PDF a účtenky s plnou podporou diakritiky (unicode fonty)

---

## 👥 Uživatelské role
- **Pokladní**: prodej, storno, uzávěrka směny, tisk účtenek a voucherů
- **Manažer**: reporty, exporty, sklad, ceníky, poukazy
- **Admin**: správa DPH, uživatelů, import dat, konfigurace

---

## 📂 Databázové schéma
Původní tabulky jsou v `sql/schema.sql`. Mezi klíčové patří:
- `uctenky` – řádková evidence účtenek
- `poukaz` – dárkové poukazy
- `klienti`, `klienti_karty` – evidence zákazníků a věrnostních karet
- `sklad`, `sklad_zmena`, `inventura` – sklad a inventury
- `kasa` – evidence směn a pohybů hotovosti
- `uzivatele` – uživatelé systému

---

## 🗄️ Nový entitní model
V novém systému budou použity tyto tabulky (migrace v Laravelu):

- **users** (role: admin/manager/cashier)
- **customers**
- **vat_rates**
- **items** (service/product, DPH sazba, cena, jednotka)
- **orders** (účtenky)
- **order_items** (řádky účtenek)
- **payments** (metody: cash, card, bank, voucher, benefit)
- **vouchers**, **voucher_redemptions**
- **cash_sessions**, **cash_movements**
- **stock_movements**

---

## 🔄 Mapování ze staré DB
Importér (`php artisan app:import-legacy`) musí převést stará data:
- `uctenky` → `orders` + `order_items`
- `poukaz` → `vouchers` + `voucher_redemptions`
- `klienti`, `klienti_karty` → `customers`
- `sklad`, `sklad_zmena`, `inventura` → `items` + `stock_movements`
- `kasa` → `cash_sessions` + `cash_movements`
- `uzivatele` → `users`

Import musí převádět znakové sady (cp1250/latin1 → utf8mb4).

---

## 🎯 Funkce nového systému
- **POS obrazovka**: rychlé přidání položek, slevy %, storno řádků, platba (cash, card, voucher, benefit, bank)
- **Tisk PDF účtenky**: CZ formát, rekapitulace DPH
- **Vouchery**: generování, evidence, saldo, expirace
- **Sklad**: příjem/výdej, inventura, kontrola zásob
- **Reporty**: tržby podle pokladníka, metody, DPH
- **Role a oprávnění**: oddělení funkcí podle role

---

## ✅ MVP (Minimum Viable Product)
- Uživatelská autentizace a role
- Evidence položek a DPH sazeb
- POS obrazovka s účtenkou a uložením objednávky
- PDF účtenky s CZ formátováním
- Základní report (denní tržba + rekapitulace DPH)

---

## 📌 Další etapy
1. **MVP** – funkční POS a účtenky
2. **Import dat** – převod historických dat
3. **Sklad a vouchery**
4. **Reporty a exporty pro účetní**

---

## ℹ️ Poznámka
Tento repozitář neslouží k produkčnímu použití. Je to **referenční podklad** pro tvorbu nového systému (např. pomocí Bolt.new).  