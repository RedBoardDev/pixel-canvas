#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACK_DIR="$ROOT_DIR/back"
BUILD_DIR="$ROOT_DIR/infra/.build"

LAMBDAS=(main draw canvas session snapshot ws-connect ws-disconnect broadcast)

for lambda in "${LAMBDAS[@]}"; do
  output_dir="$BUILD_DIR/$lambda"
  mkdir -p "$output_dir"

  echo "[build] Compiling $lambda..."
  (
    cd "$BACK_DIR"
    GOOS=linux GOARCH=arm64 CGO_ENABLED=0 \
      go build -o "$output_dir/bootstrap" "./lambdas/$lambda/"
  )
done

echo "[build] All lambdas compiled successfully."
