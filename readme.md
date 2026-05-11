# MLWarden

## Prerequisites

- Python 3.11+
- Node.js 18+

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r mlwarden/backend/requirements.txt
```

```bash
cd mlwarden/frontend
npm install
```

## Run

Backend:

```bash
source .venv/bin/activate
python -m uvicorn mlwarden.backend.app:app --app-dir mlwarden/backend --host 0.0.0.0 --port 8000
```

Frontend (new terminal):

```bash
cd mlwarden/frontend
npm run dev
```

## Run (docker compose)

```bash
docker compose up --build
```

The backend listens on http://localhost:8000.

## Tests

Run from the repository root:

```bash
python -m pytest mlwarden/tests
```

The suite sets deterministic test configuration before importing the app:

- `APP_USERS=admin:password`
- `APP_API_KEY=dev-api-key`
- `APP_DATABASE_URL=sqlite:///<temporary test db>`
- `APP_ARTIFACT_ROOT=<temporary artifact dir>`
- `APP_MAX_UPLOAD_MB=1`
