# MLWarden

MLWarden is a self-hosted experiment tracking platform for machine learning. It gives you a single place to record training runs, compare metrics, inspect artifacts, and build custom dashboards - all without relying on third-party cloud services. Ship the server as one Docker image, point your training scripts at it with a lightweight Python SDK, and get full visibility into every experiment you run.

**Key capabilities:**

- **Project & run management** - organize experiments into projects, tag and search runs, track run lifecycle (created -> running -> finished / failed).
- **Metric tracking** - log scalar metrics at every training step; visualize them as line charts, area charts, or bar charts with the built-in chart builder.
- **Tables & structured data** - attach tabular data to any run (confusion matrices, per-class scores, hyperparameter sweeps).
- **Artifact & image storage** - upload model checkpoints, datasets, generated images, and other files directly to the server.
- **Structured logging** - send timestamped, leveled log messages from your training loop and inspect them in the dashboard.
- **Real-time updates** - the frontend receives live WebSocket events as metrics stream in.
- **Custom dashboards** - build and save reusable chart configurations that pull data from any project or run.
- **Run comparison** - compare metrics side-by-side across multiple runs.

---

## Deployment

### 1. Run MLWarden with Docker (recommended)

MLWarden is distributed as a single Docker image that bundles the backend API and the pre-built frontend. No separate web server or database is needed - data is stored in a SQLite file inside a volume you mount.

```bash
docker run -d \
  --name mlwarden \
  -p 8000:8000 \
  -v mlwarden-data:/data \
  -e APP_USERS="admin:changeme" \
  -e APP_API_KEY="your-api-key" \
  -e APP_SECRET_KEY="a-random-secret" \
  ghcr.io/ke1rro/mlwarden:latest
```

The dashboard is now available at **http://localhost:8000**.

#### Volumes

| Mount point | Purpose |
|---|---|
| `/data` | Persistent storage - contains the SQLite database (`mlwarden.sqlite3`) and all uploaded artifacts. **You must mount this** or you will lose data when the container restarts. |

#### Ports

| Container port | Protocol | Purpose |
|---|---|---|
| `8000` | HTTP / WebSocket | Backend API + frontend UI |

#### Environment variables

All settings are configured through environment variables. The table below lists every available option:

| Variable | Default | Description |
|---|---|---|
| `APP_ENV` | `production` | Set to `development` to enable expanded CORS origins for local frontend dev. |
| `APP_SECRET_KEY` | `change-me` | Secret used for signing authentication tokens. **Change this in production.** |
| `APP_USERS` | `admin:password` | Comma-separated list of `username:password` pairs for dashboard login. Example: `alice:s3cret,bob:hunter2`. |
| `APP_API_KEY` | *(none)* | Bearer token that the Python SDK uses to authenticate API requests. Set this to a random string and pass the same value to the SDK. |
| `APP_DATABASE_URL` | `sqlite:////data/mlwarden.sqlite3` | SQLAlchemy-style database URL. The default points to the `/data` volume. |
| `APP_ARTIFACT_ROOT` | `/data/artifacts` | Directory where uploaded artifacts and images are stored. |
| `APP_STATIC_FRONTEND_PATH` | `/app/static` | Path to the pre-built frontend assets (set automatically in the Docker image). |
| `APP_MAX_UPLOAD_MB` | `512` | Maximum file upload size in megabytes. |
| `APP_CORS_ORIGINS` | *(empty)* | Comma-separated list of allowed CORS origins. Leave empty in production when frontend is served from the same origin. |
| `APP_AUTH_TOKEN_TTL_MINUTES` | `1440` | How long a login session token stays valid (default: 24 hours). |
| `APP_ALLOW_PROJECT_DELETE` | `false` | Enable or disable project deletion from the UI. |
| `APP_ALLOW_RUN_DELETE` | `false` | Enable or disable run deletion from the UI. |

### 2. Install the Python SDK

The SDK is a lightweight package (`httpx` is the only dependency) that lets you log experiments from any Python script.

```bash
pip install git+https://github.com/ke1rro/MLWarden.git
```

#### Quick start

```python
from mlwarden import Tracker

tracker = Tracker(
    base_url="http://localhost:8000",   # your MLWarden server
    api_key="your-api-key",            # must match APP_API_KEY on the server
    project="my-project",              # auto-created if it doesn't exist
)

with tracker.run(name="experiment-1", params={"lr": 3e-4, "epochs": 10}) as run:
    for epoch in range(10):
        loss = ...  # your training loop
        run.log_metric("loss", loss, step=epoch)
        run.log_metric("accuracy", acc, step=epoch)
```

The SDK also supports:

- `run.log_params(dict)` - bulk-update hyperparameters.
- `run.log_table(name, rows)` - attach structured tabular data.
- `run.log_image(path)` - upload images (e.g. plots, generated samples).
- `run.log_artifact(path)` - upload arbitrary files (model checkpoints, configs).
- `run.log_log(message, level)` - send structured log entries.
- `run.define_panel(name, metric)` - configure live dashboard panels.

Environment variables `MLWARDEN_URL`, `MLWARDEN_API_KEY`, and `MLWARDEN_PROJECT` can be used instead of passing arguments to the `Tracker` constructor.

---

## Detailed description

### Tech stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.12, FastAPI, Uvicorn, Pydantic, SQLite |
| **Frontend** | React 19, Vite, React Router 7, ECharts 6, Lucide icons, Three.js (home page background) |
| **SDK** | Python ≥ 3.11, httpx |

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** (only needed if running outside Docker or developing the frontend)
- **Docker & Docker Compose** (for containerized deployment and the dev test server)

### Setting up the dev / test server with Docker Compose

The `docker-compose.yml` in the repository root spins up backend and frontend as separate containers for development:

```bash
# 1. Copy and edit the environment file
cp .env.example .env
# edit .env to set APP_USERS, APP_API_KEY, APP_SECRET_KEY, etc.

# 2. Start both services
docker compose up --build
```

- **Backend:** http://localhost:8000
- **Frontend:** http://localhost:5173 (Vite dev server with hot reload)

Data is persisted in a Docker named volume (`backend-data`) mounted at `/data`.

### Changing settings

All configuration is done through environment variables (see the [table above](#environment-variables)). You can set them in three ways:

1. **`.env` file** - used automatically by Docker Compose and the `run.sh` script.
2. **`docker run -e`** - pass them directly when launching the container.
3. **Shell export** - when running without Docker: `export APP_API_KEY=my-key`.

### Running without Docker

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate

# 2. Install backend dependencies
pip install --upgrade pip setuptools wheel
pip install -r mlwarden/backend/requirements.txt

# 3. Install frontend dependencies
cd mlwarden/frontend && npm install && cd ../..

# 4. Start both services (backend + frontend)
./run.sh
```

The `run.sh` script starts the Uvicorn backend on port **8000** and the Vite dev server on port **5173**. Press `Ctrl+C` to stop both.

You can also start each service manually in separate terminals:

```bash
# Terminal 1 - Backend
source .venv/bin/activate
python -m uvicorn mlwarden.backend.app:app --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd mlwarden/frontend
npm run dev
```

### Running tests

```bash
source .venv/bin/activate
python -m pytest mlwarden/tests
```

Tests automatically configure an isolated environment with their own database and artifact directory:

- `APP_USERS=admin:password`
- `APP_API_KEY=dev-api-key`
- `APP_DATABASE_URL=sqlite:///<temporary test db>`
- `APP_ARTIFACT_ROOT=<temporary artifact dir>`
- `APP_MAX_UPLOAD_MB=1`
