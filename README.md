# EsuStellar 🌍✨

![alt text](image.png)

[![codecov](https://codecov.io/gh/BlockHaven-Labs/esustellar/graph/badge.svg?token=CODECOV_TOKEN)](https://codecov.io/gh/BlockHaven-Labs/esustellar)

Esustellar is an open-source platform that brings informal savings groups
(Esusu / Ajo / Rotating Savings) to the Stellar blockchain.

It helps communities save money together transparently, securely, and
without relying on a single trusted organizer.

---

## 🚨 Problem

Millions of people use informal savings groups, but these systems rely
entirely on trust:

- Organizers can disappear with funds
- No transparency into contributions
- No verifiable payout history
- Disputes are hard to resolve

---

## 💡 Solution

EsuStellar uses the Stellar network to:

- Collect group savings with low fees
- Lock funds until payout conditions are met
- Automatically rotate payouts
- Provide a public, verifiable transaction history

---

## 🧩 Core Features

- Create a savings group
- Join a group
- Fixed contribution amount
- Monthly contributions
- Rotating payout to members
- Transparent on-chain records

---

## 🏗 Tech Stack

- **Blockchain:** Stellar (Testnet)
- **Smart Contracts:** Soroban
- **Frontend:** React / Next.js
- **Wallet:** Stellar Wallets (Freighter/lobster/lumen)
- **Monorepo:** npm / Turborepo

---

## 📂 Repository Structure

```
esustellar/
├── apps/
│ └── web/ # Frontend application
├── contracts/
│ ├── savings/ # Soroban savings contract
│ └── registry/ # Soroban registry contract
├── environments/
│ └── testnet/ # Testnet deployment workspace
├── packages/
│ └── shared/ # Shared types & utils
├── docs/ # Architecture & specs
├── .github/
│ └── ISSUE_TEMPLATE/
└── README.md
```

---

## 🛠 Development & Operations

### Monitoring & Log Aggregation
- **Loki & Grafana**: Centralised log aggregation is pre-configured via Docker Compose (`docker-compose.yml`) and Kubernetes (`k8s/monitoring/`).
- **Validation**: Run `npm run validate-monitoring` to verify log aggregation configurations.
- **Documentation**: See [docs/logging.md](file:///c:/Users/g-obiagazie/Desktop/esustellar/docs/logging.md).

### Utility Scripts
- **Post-Deploy Smoke Tests**: `npm run smoke-test` (automatically invoked after `./deploy.sh`).
- **Export & Archive Contract Event Logs**: `npm run export-events` (exports events to `logs/contract-events.jsonl`).
- **Deployment Guide**: See [docs/deployment.md](file:///c:/Users/g-obiagazie/Desktop/esustellar/docs/deployment.md).

---

## 🤝 Contributing Guide

EsuStellar is open-source and beginner-friendly.

- Look for issues tagged `good first issue`
- Follow the contribution guide (coming soon)
- Open discussions for ideas and improvements

---

## 📜 License

MIT License

