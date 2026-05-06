# 💸 NETbudget

> 📱 A clean, dark-themed mobile app to compute your monthly **disposable income** ("reste à vivre") and visualize your budget across the year — French-flavored, Finary-inspired.

NETbudget turns your gross salary, rent, loans and monthly expenses into a single number: how much you actually have left to live on each month. It also projects the next 12 months so you can spot the months that will hurt 📉 and the ones that will breathe 🌿.

---

## ✨ Features

- 💰 **Gross → net salary** conversion with a Cadre / Non-cadre toggle (≈25% / ≈22% charges).
- 🎁 **Variable / bonuses** spread across the year *or* paid in a specific month.
- 🏙️ **City picker** with a cost-of-living index for ~35 French cities (informational, doesn't alter the maths).
- 🏠 **Rent** input (charges included).
- 🏦 **Bank loans** — add / edit / delete, with auto-computed monthly payment using the standard amortization formula `P × r / (1 − (1 + r)^(-n))`.
- 🛒 **Detailed monthly expenses** by category: groceries, transport, leisure, health, subscriptions, energy & water, other.
- 🍩 **Donut chart** showing the breakdown of your monthly outflows + remaining cash.
- 📅 **12-month projection** with horizontal cards + detailed table + annual totals.
- 🌑 Elegant **dark theme** with regional gradients per city.
- 🔄 **Reset all** action with a confirmation modal that works on both native and web.

---

## 🧰 Tech stack

- ⚛️ **React Native** + **Expo SDK 54** (TypeScript)
- 🧭 **expo-router** — file-based routing
- 🎨 **react-native-svg** — donut chart
- 🌈 **expo-linear-gradient** — per-city gradients
- 🔣 **@expo/vector-icons** (Feather + Ionicons)

---

## 🚀 Getting started

### Prerequisites

- 📦 Node.js ≥ 20 and Yarn (or npm)
- 📱 [Expo Go](https://expo.dev/go) on your phone, or an iOS simulator / Android emulator

### Install & run

```bash
cd frontend
yarn install        # or: npm install
yarn start          # or: npx expo start
```

Then scan the QR code with Expo Go, or press:

- `i` 🍎 to open the iOS simulator
- `a` 🤖 to open the Android emulator
- `w` 🌐 to open the web build

---

## 📂 Project structure

```
netbudget/
├── frontend/                 # 📱 The Expo / React Native app (this is what runs)
│   ├── app/
│   │   ├── _layout.tsx       # Root navigator (expo-router Stack)
│   │   └── index.tsx         # Single-screen dashboard (all the UI lives here)
│   ├── src/
│   │   ├── components/
│   │   │   ├── DonutChart.tsx       # 🍩 SVG donut chart
│   │   │   └── MonthlyBreakdown.tsx # 📅 12-month cards + table
│   │   ├── constants/
│   │   │   └── cities.ts            # 🏙️ Cost-of-living index per city
│   │   └── utils/
│   │       └── finance.ts           # 🧮 Loan + currency helpers
│   ├── app.json              # Expo config (bundle id: com.stouph.netbudget.app)
│   └── package.json
└── README.md
```

---

## 🧮 How the math works

- **Net income** = `gross_annual × ratio` where `ratio = 0.75` (cadre) or `0.78` (non-cadre).
- **Monthly net** = `net_annual / 12`.
- **Loan monthly payment** = `P × r / (1 − (1 + r)^(−n))` where `P` is principal, `r` is monthly rate, `n` is months.
- **Disposable income** = `monthly_net − rent − sum(loans) − sum(expenses)`.

> ⚠️ The estimates use a flat charges ratio (cadre/non-cadre). They are **not** an exact tax calculation — perfect for a quick view, not for a tax return.

---

## 🗺️ Roadmap

- 💾 Local persistence (AsyncStorage)
- 👤 Multi-profile / cloud sync
- 🧾 Detailed income tax computation
- 📄 PDF export of the annual budget
- 🔔 Alerts when disposable income drops below a threshold

---

## 📜 License

Personal project — not licensed for redistribution. Feel free to take inspiration. 🙌
