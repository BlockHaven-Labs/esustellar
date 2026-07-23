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

- Provide transparent, on-chain record-keeping for savings groups
- Automate payout rotation based on deterministic join order
- Enable peer accountability through public contribution tracking
- Reduce reliance on a single trusted organizer via smart contract logic

> **Note:** Real token custody (locked escrow), dispute resolution, and
> configurable admin controls are planned for future releases. The current
> MVP records contributions and payouts on-chain but does not yet escrow
> funds within the contract.

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

## 🛠 Development Status

## 🤝 Contributing Guide

EsuStellar is open-source and beginner-friendly.

- Look for issues tagged `good first issue`
- Follow the contribution guide (coming soon)
- Open discussions for ideas and improvements

---

## 📜 License

MIT License
