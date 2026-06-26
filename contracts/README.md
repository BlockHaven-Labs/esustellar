# Soroban Contract Build Image

Reproducible WASM builds via Docker.

## Build

```bash
# Build WASM artifacts into a scratch image
docker build -t esustellar-contracts -f contracts/Dockerfile .

# Extract WASM files to local ./wasm/ directory
docker create --name tmp-contracts esustellar-contracts && \
  mkdir -p wasm && \
  docker cp tmp-contracts:/ wasm/ && \
  docker rm tmp-contracts
```

## Pinned versions

| Tool        | Version  |
|-------------|----------|
| Rust        | 1.85.0   |
| Stellar CLI | 22.6.0   |
| soroban-sdk | 23.x     |

To update, change `ARG STELLAR_CLI_VERSION` and the `FROM rust:` base image tag.
