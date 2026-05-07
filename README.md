# 💸 NETbudget

> 📱 A clean, dark-themed mobile app to compute your monthly **disposable income** ("reste à vivre"), apply the **50/30/20 rule** and get personalised budget advice — French-flavored, Finary-inspired.

NETbudget turns your gross salary, rent, loans and monthly expenses into a single number: how much you actually have left to live on each month. It splits your spending across **Needs / Wants / Savings**, projects the next 12 months, gives you smart tips and lets you export a PDF or share a card to your friends. 📤

🇫🇷 Available on the [App Store](https://apps.apple.com/) (NETbudget · v1.1).

---

## ✨ Features

### 💰 Income
- **Gross → net salary** with **4 statuses**: Non-cadre · Cadre · Fonctionnaire · Libéral (with sourced default charge rates from `service-public.fr`, `urssaf.fr`).
- ✏️ **Editable charge rate** to match your real payslip.
- 🔁 **Annual / Monthly** toggle that *converts* the value when you switch (e.g. 56 000 € annual ↔ 4 666,67 € monthly).
- ⏱️ **Full-time / Part-time** indicator.
- 🎁 **Variable / bonuses** spread across the year *or* paid in a specific month, with same Annual/Monthly toggle.

### 🏙️ Location
- **70+ French cities** with a cost-of-living index, including Île-de-France suburbs and Outre-mer.
- 🔍 **Accent-insensitive search** — type "saint etienne" or "aix en provence" and it just works.

### 💸 Expenses (50/30/20 rule)
Three editable families, each with a **+** button to add custom categories:
- 🛡️ **Besoins** (Needs) — rent, loans, food, transport, health, energy, water, essential subscriptions.
- 🎵 **Loisirs** (Wants) — dining out, holidays, streaming, hobbies.
- 📈 **Épargne / Investissement** (Savings) — Livret A, PEA, CTO, Assurance vie.

✏️ **Rename any category** in place (tap the title) — perfect for "Livret A → LDDS Boursorama".
🗑️ **Delete** any item, even defaults.

### 🏦 Loans
Add / edit / delete bank loans with auto-computed monthly payment using the standard amortization formula `P × r / (1 − (1 + r)^(-n))`.

### 🧠 Smart advice
~15 personalised tips based on:
- The **50/30/20 rule** (Elizabeth Warren).
- French-specific thresholds: HCSF 35% debt cap, 1/3 rent rule, 3-6 months emergency fund.
- Profile-aware suggestions (PER, PEA, CTO, immobilier locatif…).

### 📊 Visualisation
- 🍩 **Donut chart** with all your monthly outflows + remaining cash, gradient by region.
- 📅 **12-month projection** with horizontal cards + detailed table + annual totals.

### 📤 Export & share
- 📄 **Full PDF report** — clean light-theme document with totals, table and advice.
- 📲 **Share card** — vertical 1080×1920 PDF that fits Instagram / WhatsApp story format.
- 📝 **Plain-text summary** for quick sharing in any chat.

### 🛠️ UX polish
- ⌨️ **Floating "Terminé" button** to dismiss the keyboard from any input.
- 🌑 Elegant **dark theme** with regional gradients per city.
- 🔄 **Reset all** action with a confirmation modal.

---

## 🧰 Tech stack

- ⚛️ **React Native** + **Expo SDK 54** (TypeScript)
- 🧭 **expo-router** — file-based routing
- 🎨 **react-native-svg** — donut chart
- 🌈 **expo-linear-gradient** — per-city gradients
- 🖨️ **expo-print** — PDF generation (full report + story card)
- 📲 **expo-sharing** + RN `Share` — native share sheet
- 🔣 **@expo/vector-icons** (Feather + Ionicons)

---

## 🚀 Getting started

### Prerequisites
- 📦 Node.js ≥ 20 and npm (or yarn)
- 📱 [Expo Go](https://expo.dev/go) on your phone, or an iOS simulator / Android emulator

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
│   │   ├── _layout.tsx                # Root navigator (expo-router Stack)
│   │   └── index.tsx                  # Single-screen dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── DonutChart.tsx         # 🍩 SVG donut chart
│   │   │   └── MonthlyBreakdown.tsx   # 📅 12-month cards + table
│   │   ├── constants/
│   │   │   └── cities.ts              # 🏙️ Cost-of-living index per city
│   │   └── utils/
│   │       ├── finance.ts             # 🧮 Loan + currency + text helpers
│   │       ├── advice.ts              # 🧠 50/30/20 rules engine
│   │       └── pdf.ts                 # 📄 PDF report + 📲 story card HTML
│   ├── app.json                       # Expo config (bundle: com.stouph.netbudget.app)
│   ├── eas.json                       # EAS Build / Submit config
│   └── package.json
└── README.md
```

---

## 🧮 How the math works

- **Net income** = `gross_annual × (1 − chargesPercent / 100)`
  Defaults: Non-cadre 22% · Cadre 25% · Fonctionnaire 15% · Libéral 25% (editable).
- **Monthly net** = `net_annual / 12`.
- **Loan monthly payment** = `P × r / (1 − (1 + r)^(−n))` where `P` is principal, `r` is monthly rate, `n` is months.
- **Disposable income** = `monthly_net − rent − Σ loans − Σ all expense items`.
- **50/30/20 split**: Besoins = rent + loans + family `besoins`; Loisirs = family `loisirs`; Épargne = family `epargne`.

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

- 💾 Local persistence (AsyncStorage) — keep your data between launches
- 👤 Multi-profile / cloud sync
- 🧾 Detailed income tax computation (impôt sur le revenu)
- 🔔 Threshold alerts when disposable income drops
- 📷 Story-style share as PNG (currently PDF) for direct Instagram upload

---

## 📜 License

Personal project — not licensed for redistribution. Feel free to take inspiration. 🙌
