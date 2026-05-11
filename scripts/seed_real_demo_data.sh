#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
python examples/seed_real_demo_data.py "$@"
