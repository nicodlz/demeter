# Demeter

Personal finance dashboard for freelancers and solopreneurs. Track income, expenses, crypto, investments, and net worth — all in one place.

## Features

- 📊 **Dashboard** — Revenue overview, client breakdown, period comparisons
- 💸 **Cash Flow** — Income & expense tracking with bank statement import (BoursoBank, Crédit Agricole, Deblock, GnosisPay)
- 🪙 **Crypto** — Portfolio tracking via Zerion API, multi-wallet support
- 📈 **Net Worth** — Asset allocation, evolution charts, snapshots over time
- 🔮 **Projections** — Financial forecasting based on current data
- 🧾 **Invoicing** — Generate invoices & recibos verdes, manage clients
- 📉 **IBKR** — Interactive Brokers portfolio integration
- 💾 **Data** — Full import/export, local-first storage

## Stack

React · TypeScript · Vite · Zustand · TanStack Router · Recharts · Tailwind CSS · Radix UI

## Run locally

```bash
npm ci
npm run dev
```

## Checks

```bash
npm run typecheck   # if configured, otherwise: npx tsc -b
npm run lint
npm run test
npm run build
```

## Environment

Copy `.env.example` to `.env.local` and set the vault server and the
provider proxy. IBKR sync requires `VITE_PROXY_URL` in production because the
Flex Web Service cannot be called directly from a browser.
