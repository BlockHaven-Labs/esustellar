# Contributor Onboarding Guide

Get a full local dev environment running in under 30 minutes.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| Rust | stable | [rustup.rs](https://rustup.rs) |
| Stellar CLI | latest | `curl -s https://soroban.stellar.org \| bash` |
| Docker | ≥ 24 | [docker.com](https://docker.com) |
| Git | ≥ 2.40 | [git-scm.com](https://git-scm.com) |

## Step 1: Clone & Install (5 min)

```bash
git clone https://github.com/BlockHaven-Labs/esustellar.git
cd esustellar

# Node dependencies
npm install

# Verify Rust toolchain
rustc --version
cargo --version
```

## Step 2: Smart Contracts (10 min)

```bash
# Build all contracts
cd contracts/savings
cargo build --target wasm32-unknown-unknown --release

cd ../registry
cargo build --target wasm32-unknown-unknown --release

# Run tests
cd ../savings
cargo test

cd ../registry
cargo test
```

### Generate Contract WASM

```bash
# From the contracts directory
stellar contract build contracts/savings
stellar contract build contracts/registry
```

## Step 3: Web App (10 min)

```bash
# From the root
cd apps/web

# Install dependencies (if not already)
npm install

# Start dev server
npm run dev
```

The app should be running at `http://localhost:3000`.

### Environment Variables

Create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
```

## Step 4: Connect a Wallet (2 min)

1. Install the [Freighter](https://freighter.app/) browser extension
2. Switch to Stellar Testnet
3. Get test XLM from the [friendbot](https://friendbot.stellar.org/)

## Step 5: Run the Full Stack (3 min)

```bash
# From root — builds shared packages and starts web
npm run build:shared
npm run dev
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start web dev server |
| `cargo test` | Run contract tests |
| `npm run build` | Production build |
| `npm test` | Run all tests |

## Troubleshooting

### "Cannot find module" errors

```bash
npm run build:shared
npm install
```

### Stellar CLI not found

```bash
export PATH="$HOME/.local/bin:$PATH"
stellar --version
```

### Contract build fails

```bash
rustup target add wasm32-unknown-unknown
```

## Getting Help

- Open an issue on GitHub
- Check existing documentation in `docs/`
- Review the [architecture doc](./architecture.md)

## What to Work On

Look for issues labeled:
- `good first issue` — beginner-friendly
- `help wanted` — needs community input
- `infra` — infrastructure improvements
- `docs` — documentation improvements
