#!/usr/bin/env bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}MLWarden setup${NC}"

echo -e "${GREEN}Frontend setup${NC}"

cd mlwarden/frontend
npm install

cd ../..

echo -e "${GREEN}Backend setup${NC}"

python3 -m venv .venv
source .venv/bin/activate
python -m ensurepip --upgrade
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt
pre-commit install

echo -e "${GREEN}Setup complete!${NC}"