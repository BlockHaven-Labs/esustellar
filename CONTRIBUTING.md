# Contributing to EsuStellar 🤝

Thank you for your interest in contributing to **EsuStellar** 🎉
We welcome **developers, designers, writers, and community members**.

This guide explains how to get set up, follow the project workflow, and submit changes that pass CI.

---

## 📦 Project Structure

```
esustellar/
├── apps/
│   └── web/              # Frontend (React / Next.js)
├── contracts/
│   ├── savings/          # Soroban savings contract
│   └── ephemeral_account/# Ephemeral account contract
├── packages/
│   └── shared/           # Shared utilities and types
├── docs/                 # Documentation and specs
├── deploy.sh             # Contract deployment script
└── README.md
```

---

## 🚀 Getting Started

### 1️⃣ Fork & Clone

Click **Fork** on GitHub, then clone your fork:

```bash
git clone https://github.com/phertyameen/esustellar.git
cd esustellar
```

---

### 2️⃣ Install Prerequisites

#### Rust & WASM (for smart contracts)

```bash
rustup update
rustup target add wasm32-unknown-unknown
```

#### Stellar CLI

```bash
cargo install --locked stellar-cli --features opt
```

#### Node.js dependencies (frontend & shared)

```bash
npm install
```

---

### 3️⃣ Run the Frontend (optional depending on the issue you are working on)

```bash
cd apps/web
npm run dev
```

---

## 🧩 How to Contribute

1. Pick an issue from the **GitHub Issues** tab
2. Look for labels like:

   * `good first issue`
   * `documentation`
   * `frontend`
   * `smart-contracts`
3. Comment on the issue to get assigned
4. Create a feature branch

```bash
git checkout -b feat/your-feature-name
```

---

## 🛠️ Development Workflow

### Smart Contracts (Soroban)

From the contract directory you’re working on:

```bash
cd contracts/savings
# or
cd contracts/ephemeral_account
```

#### Format code (required)

```bash
cargo fmt
```

#### Run checks locally (required)

```bash
cargo test
cargo clippy -- -D warnings
cargo build --target wasm32-unknown-unknown --release
```

#### Build Soroban contract

```bash
stellar contract build
```

> ⚠️ CI enforces formatting, tests, and clippy warnings.

---

### Frontend / Shared Packages

```bash
npm run build
npm test   # if applicable
```

---

## 🧪 Testing

* New features **must include tests**
* Bug fixes should include regression tests
* Prefer end-to-end contract behavior tests

Run all tests:

```bash
cargo test
```

Run a specific test:

```bash
cargo test test_full_cycle -- --nocapture
```

---

## 🔄 CI Expectations

Every Pull Request must pass:

* ✅ `cargo fmt --check`
* ✅ `cargo clippy -D warnings`
* ✅ `cargo test`
* ✅ WASM build
* ✅ Frontend build (if affected)

If CI fails:

1. Read the error carefully
2. Reproduce locally
3. Fix before requesting review

---

## 🧹 Commit Guidelines

* Use **clear, descriptive commit messages**
* Keep commits focused
* Squash noisy commits before making a pr

Examples:

```
feat: add contribution deadline enforcement
fix: prevent double payouts
fmt: normalize formatting
```

To squash commits:

```bash
git rebase -i HEAD~N
```

---

## 🔐 Security Guidelines

* ❌ Never commit private keys or secrets
* ❌ Never weaken authorization checks
* ✅ Assume all contract calls are adversarial
* ✅ Validate all inputs explicitly

Security-sensitive changes should be clearly explained in the PR.

---

## 📄 Documentation

If your change affects:

* Contract behavior
* State transitions
* Errors or events
* Frontend flows

You **must update**:

* `README.md`
* Inline Rust docs (`///`)
* Any relevant files in `docs/`

---

## ✅ Pull Request Guidelines

* Keep PRs small and focused
* Reference the related issue in the PR description
* Clearly explain:

  * What changed
  * Why it’s needed
  * Any breaking behavior

Target branch:

* `main` for stable releases

---

## 💬 Communication

* Use **GitHub Issues** for bugs and features
* Use **Discussions** (if enabled) for ideas and questions
* Be respectful, constructive, and collaborative

---

## 📜 Code of Conduct

By contributing, you agree to follow our **Code of Conduct**
(*to be added*).

---

Thank you for helping build **EsuStellar** 💛
Your contributions make the ecosystem stronger.