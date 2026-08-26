# syntax=docker/dockerfile:1
# Reproducible Soroban / Stellar contract build environment.
# Pins exact Rust toolchain + Stellar CLI versions so WASM output
# is identical across machines and CI runs.

FROM rust:1.85.0-bookworm AS builder

# Exact Stellar CLI version compatible with soroban-sdk 23
ARG STELLAR_CLI_VERSION=22.6.0

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl binaryen \
    && rm -rf /var/lib/apt/lists/*

# Install pinned wasm32 target
RUN rustup target add wasm32v1-none

# Install pinned Stellar CLI
RUN cargo install --locked stellar-cli --version ${STELLAR_CLI_VERSION} \
      --features opt

WORKDIR /workspace

COPY Cargo.toml Cargo.lock ./
COPY contracts/ contracts/

RUN stellar contract build

# Build-only image: no long-running process, so HEALTHCHECK is disabled.
HEALTHCHECK NONE

FROM scratch AS artifacts
COPY --from=builder /workspace/target/wasm32v1-none/release/*.wasm /
