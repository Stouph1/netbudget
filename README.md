# 💸 NETbudget

> 📱 A clean, dark-themed mobile app to compute your monthly **disposable income** ("reste à vivre"), apply the **50/30/20 rule** and get personalised budget advice. Multi-language, multi-currency, worldwide.

NETbudget turns your gross salary, rent, loans and monthly expenses into a single number: how much you actually have left to live on each month. It splits your spending across **Needs / Wants / Savings**, projects the next 12 months, gives you smart tips and lets you export a PDF. All on your device — nothing leaves your phone.

🇫🇷 Available on the [App Store](https://apps.apple.com/) (NETbudget · v1.6).

---

## ✨ Features

### 🌍 Multi-language & multi-currency
- 🗣️ **8 languages** with full coverage (284 strings each): 🇫🇷 Français · 🇬🇧 English · 🇪🇸 Español · 🇵🇹 Português · 🇩🇪 Deutsch · 🇮🇹 Italiano · 🇸🇦 العربية · 🇯🇵 日本語
- 💱 **15 currencies** with symbols and flags, including CFA franc (XOF/XAF).
- 🔄 **Real-time converter** tab — live FX rates from `open.er-api.com`, 6h cache, conversion history.

### 🧭 Bottom-tab navigation
Three tabs: 💼 **Budget** · 💱 **Converter** · ⚙️ **Settings**.

### 💰 Income (multi-source)
- Add as many income sources as you want: salary, freelance, rental, dividends, other — each with its **own** status and charge rate.
- **Gross → net** with **4 statuses**: Non-cadre · Cadre · Fonctionnaire · Libéral (sourced defaults from `service-public.fr`, `urssaf.fr`).
- ✏️ **Editable charge rate** to match your real payslip.
- 🔁 **Annual / Monthly / Paid in a specific month** with auto-conversion.
- ⏱️ **Full-time / Part-time** indicator (salary only).

### 🏙️ Worldwide location
- **558 cities across 59 countries**, organized by country → region.
- Two-step picker: country (with flag + city count) → cities grouped by region.
- 🔍 **Accent-insensitive search** in both steps.
- **Cost-of-living index** with base `1.00 = country national average`. Sources are clickable from the info modal:
  - [Numbeo — Cost of Living Rankings](https://www.numbeo.com/cost-of-living/rankings.jsp)
  - [Eurostat — Purchasing Power Parities](https://ec.europa.eu/eurostat/web/purchasing-power-parities)
  - [OECD — Purchasing Power Parities](https://www.oecd.org/en/data/indicators/purchasing-power-parities-ppp.html)
  - [INSEE — Statistiques](https://www.insee.fr/fr/statistiques)
  - [Mercer — Cost of Living Survey](https://www.mercer.com/insights/total-rewards/talent-mobility-insights/cost-of-living/)
  - [EIU — Worldwide Cost of Living](https://www.eiu.com/n/campaigns/worldwide-cost-of-living/)
  - [World Bank — International Comparison Program](https://www.worldbank.org/en/programs/icp)
  - [US BLS — Consumer Price Index](https://www.bls.gov/cpi/)

### 💸 Expenses (50/30/20 rule)
Three editable families, each with a **+** button to add custom categories:
- 🛡️ **Besoins / Needs** — rent, loans, food, transport, health, energy, water, essential subscriptions.
- 🎵 **Loisirs / Wants** — dining out, holidays, streaming, hobbies.
- 📈 **Épargne / Savings** — Livret A, PEA, CTO, Assurance vie.

✏️ **Rename any category** in place (tap the title).
🗑️ **Delete** any item, even defaults.

### 🏦 Loans
Add / edit / delete bank loans with auto-computed monthly payment using the standard amortization formula `P × r / (1 − (1 + r)^(−n))`. Direct-monthly input mode if you already know the payment.

### 🧠 Smart advice
**23 personalised tips** (translated in all 8 languages) based on:
- The **50/30/20 rule** (Elizabeth Warren).
- French-specific thresholds: HCSF 35% debt cap, 1/3 rent rule, 3–6 months emergency fund.
- Profile-aware suggestions (PER, PEA, CTO, immobilier locatif…).

### 📊 Visualisation
- 🍩 **Donut chart** with all your monthly outflows + remaining cash.
- 📅 **12-month projection** with horizontal cards + detailed table + annual totals.

### 📤 Export
- 📄 **Full PDF report** — clean light-theme document with totals, expense breakdown and advice. Translated in the user's language.

### 🛠️ UX polish
- 🚀 **Onboarding** empty-state explaining the 3 steps + an educational modal on the 50/30/20 rule.
- ⌨️ **Floating "Terminé" button** to dismiss the keyboard from any input.
- 🌑 Elegant **dark theme** with regional gradients.
- 💾 **Local persistence** via AsyncStorage — your data survives launches.
- 🔄 **Reset all** action with a confirmation modal.
- 🔒 **No backend, no tracking** — everything stays on your device.

---

## 🧰 Tech stack

- ⚛️ **React Native** + **Expo SDK 54** (TypeScript)
- 🧭 **expo-router** — file-based routing
- 💾 **@react-native-async-storage/async-storage** — local persistence
- 🎨 **react-native-svg** — donut chart
- 🌈 **expo-linear-gradient** — gradients
- 🖨️ **expo-print** + **expo-sharing** — PDF export
- 🔣 **@expo/vector-icons** (Feather + Ionicons)

---

## 🚀 Getting started

### Prerequisites
- 📦 Node.js ≥ 20 and npm
- 📱 [Expo Go](https://expo.dev/go), or an iOS simulator / Android emulator

### Install & run
```bash
cd frontend
npm install
npm start
```

Then scan the QR code with Expo Go, or press:
- `i` 🍎 to open the iOS simulator
- `a` 🤖 to open the Android emulator
- `w` 🌐 to open the web build

---

## 📂 Project structure

```
netbudget/
├── frontend/                          # 📱 Expo / React Native app
│   ├── app/
│   │   ├── _layout.tsx                # Root navigator (expo-router)
│   │   └── index.tsx                  # Main 3-tab screen
│   ├── src/
│   │   ├── components/
│   │   │   ├── DonutChart.tsx         # 🍩 SVG donut chart
│   │   │   └── MonthlyBreakdown.tsx   # 📅 12-month cards + table
│   │   ├── constants/
│   │   │   └── cities.ts              # 🏙️ 558 cities / 59 countries + sources
│   │   ├── i18n/
│   │   │   └── translations.ts        # 🌍 8 languages × 284 keys
│   │   └── utils/
│   │       ├── advice.ts              # 🧠 50/30/20 rules engine
│   │       ├── currency.ts            # 💱 Currency definitions (15 codes)
│   │       ├── exchangeRates.ts       # 🔄 FX rates fetcher + cache
│   │       ├── finance.ts             # 🧮 Loan + text helpers
│   │       ├── income.ts              # 💰 Multi-source income model
│   │       ├── pdf.ts                 # 📄 PDF report HTML
│   │       └── storage.ts             # 💾 AsyncStorage persistence
│   ├── app.json                       # Expo config (bundle: com.stouph.netbudget.app)
│   ├── eas.json                       # EAS Build / Submit config
│   └── package.json
└── README.md
```

---

## 🧮 How the math works

- **Net income per source** = `gross × (1 − chargesPercent / 100)`.
  Defaults: Non-cadre 22% · Cadre 25% · Fonctionnaire 15% · Libéral 25% (editable).
- **Monthly net** = sum of all sources, each normalised to a per-month value depending on its frequency (monthly / annual / paid-once).
- **Loan monthly payment** = `P × r / (1 − (1 + r)^(−n))` where `P` is principal, `r` is monthly rate, `n` is months.
- **Disposable income** = `monthly_net − rent − Σ loans − Σ all expense items`.
- **50/30/20 split**: Besoins = rent + loans + family `besoins`; Loisirs = family `loisirs`; Épargne = family `epargne`.
- **City cost-of-living index** is a multiplier relative to the country's national average (1.00). Used as context, not directly applied to the math.

> ⚠️ The estimates use a flat charges ratio per status. They are **not** an exact tax calculation — perfect for a quick view, not for a tax return.

---

## 🚢 Deployment (EAS)

The app ships through [EAS Build](https://docs.expo.dev/eas/) + EAS Submit:

```bash
# One-time
npm install -g eas-cli
eas login
eas init

# For each release
eas build --platform ios --profile production
eas submit --platform ios --latest
```

Then on App Store Connect: create the new version, attach the build, fill the "What's New" and submit for review.

For JS-only changes (no new native dep), use OTA updates instead — instant, no Apple review:
```bash
eas update --branch production --message "Hot fix"
```

---

## 🗺️ Roadmap

- 👤 Multi-profile / optional cloud sync
- 🧾 Detailed income tax computation (impôt sur le revenu)
- 🔔 Threshold alerts when disposable income drops
- 🌐 More languages (中文, 한국어, हिन्दी, Kreyòl ayisyen)
- 🏙️ Even more cities + auto-locate via GPS

---

## 📜 License

Personal project — not licensed for redistribution. Feel free to take inspiration. 🙌
