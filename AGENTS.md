# Requirements Document: Self-hosted Mini MLFlow/WanDB Web Application

## 1. Overview

### 1.1 Product Summary

The application is a lightweight, self-hosted experiment and workflow tracking platform inspired by MLflow and Weights & Biases. It is intended for tracking machine learning training runs, data processing workflows, image-processing pipelines, and other long-running computational jobs executed by external workers.

Workers communicate with the backend through a JSON REST API and WebSockets. The web UI allows users to inspect projects, runs, metrics, logs, charts, tables, images, artifacts, and real-time status updates.

The system is designed to be simple, fast to implement, and easy to deploy using Docker Compose.

### 1.2 Primary Goals

- Track model training, data processing, and workflow execution runs.
- Provide a simple JSON REST API for workers.
- Provide real-time updates through WebSockets.
- Support flexible frontend chart creation using Apache ECharts.
- Support tables, images, logs, metrics, parameters, tags, and artifacts.
- Support simple authentication without public registration.
- Be fully self-hosted and deployable with Docker Compose.
- Include a small Python client library for workers, similar in spirit to MLflow/WanDB clients.

### 1.3 Non-Goals

- No SaaS multi-tenant platform.
- No OAuth.
- No user self-registration.
- No complex role-based access control in the first version.
- No distributed artifact storage requirement in the first version.
- No TypeScript.
- No Tailwind CSS.
- No frontend UI frameworks such as Material UI, Ant Design, Bootstrap, Chakra, etc.
- No complex workflow orchestration engine.
- No built-in model serving.
- No automatic hyperparameter optimization.

---

## 2. Target Users

### 2.1 Site Owner / Administrator

The person who deploys the application. The owner configures predefined users and credentials during startup using environment variables or a mounted config file.

Main needs:

- Deploy quickly with Docker Compose.
- Define credentials without public registration.
- Keep data local.
- Inspect all projects, runs, artifacts, and worker activity.

### 2.2 ML Engineer / Developer

Uses the frontend to inspect experiments and uses the Python client library inside training scripts or data-processing workers.

Main needs:

- Create runs from Python scripts.
- Report metrics, parameters, images, tables, logs, and artifacts.
- Compare multiple runs.
- Build custom charts in the frontend.
- Receive notifications when workers finish.

### 2.3 Data / Pipeline Worker

A script, container, notebook, training job, cron job, or background worker that reports data to the platform.

Main needs:

- Authenticate simply.
- Create or resume a run.
- Send structured JSON events.
- Stream progress and logs.
- Upload artifacts.
- Finish, fail, or cancel a run.

---

## 3. Technology Stack Requirements

### 3.1 Backend

Required stack:

- Python 3.11+
- FastAPI
- SQLAlchemy 2.x
- Pydantic 2.x
- Uvicorn
- Alembic for migrations
- SQLite for simple local development
- PostgreSQL support for production-style Docker Compose deployment

Backend implementation must prioritize simplicity and maintainability.

### 3.2 Frontend

Required stack:

- React
- Plain JavaScript only
- React Router
- Apache ECharts
- Vite
- Plain CSS
- No TypeScript
- No Tailwind CSS
- No frontend component framework
- No CSS framework

### 3.3 Communication

- JSON REST API for standard operations.
- WebSockets for streaming updates, run events, log updates, and frontend notifications.
- Multipart upload for files and artifacts.
- JSON metadata attached to uploaded files.

### 3.4 Deployment

- Docker Compose required.
- Separate services for backend, frontend, database, and optional reverse proxy.
- Development and production-like compose files should be supported.
- Environment variables should control credentials, database URL, artifact path, CORS origins, and secret keys.

---

## 4. Authentication and Authorization Requirements

### 4.1 Authentication Model

The application must support simple authentication without registration.

Users are predefined by the site owner at application startup.

Supported configuration options:

1. Environment variable-based credentials for very simple deployment.
2. Optional mounted JSON/YAML credentials file for multiple users.

Example environment configuration:

```env
APP_USERS=admin:hashed_password,user1:hashed_password
APP_SECRET_KEY=change-me
APP_AUTH_TOKEN_TTL_MINUTES=1440
```

### 4.2 Authentication Method

The backend must expose a login endpoint:

```http
POST /api/auth/login
```

Input:

```json
{
  "username": "admin",
  "password": "password"
}
```

Output:

```json
{
  "access_token": "jwt-or-signed-token",
  "token_type": "bearer",
  "expires_at": "2026-05-12T10:00:00Z"
}
```

Requirements:

- Passwords must not be stored in plaintext in persistent storage.
- Startup credentials should support hashed passwords.
- Bearer token authentication must be accepted for REST API calls.
- WebSocket connections must authenticate using a token query parameter or WebSocket subprotocol.
- The frontend must store the token in memory or local storage depending on configuration.

### 4.3 Authorization

Version 1 authorization can be simple:

- All authenticated users can view projects, runs, metrics, images, tables, and artifacts.
- All authenticated users can create worker API tokens if this feature is enabled.
- Optional `admin` flag can allow only admins to manage credentials or application settings.

### 4.4 Worker Authentication

Workers must be able to authenticate using one of the following simple options:

1. Same bearer token as users.
2. Static API key configured on startup.
3. Project-scoped API key generated by an authenticated user.

Minimum required for version 1:

- Support static API key through environment variable.
- Accept API key through header:

```http
Authorization: Bearer <token>
```

or

```http
X-API-Key: <api_key>
```

---

## 5. Core Domain Concepts

### 5.1 Project

A project groups related runs.

Examples:

- `cat-dog-classifier`
- `invoice-ocr-pipeline`
- `nightly-data-preprocessing`

Each run must belong to one project.

### 5.2 Run

A run represents one execution of a training job, data-processing workflow, experiment, script, or worker process.

Run statuses:

- `created`
- `running`
- `finished`
- `failed`
- `cancelled`

Each run may contain:

- Parameters
- Metrics
- Logs
- Tables
- Images
- Artifacts
- Tags
- Notes
- Events
- Start and end timestamps

### 5.3 Metric

A metric is a numeric value reported over time or by step.

Examples:

- `loss`
- `accuracy`
- `f1_score`
- `processed_items`
- `latency_ms`

Metric records must support:

- Name
- Numeric value
- Optional step
- Optional timestamp
- Optional context JSON

### 5.4 Parameter

A parameter is a key-value pair describing the run configuration.

Examples:

- `learning_rate = 0.001`
- `batch_size = 32`
- `model = resnet18`

Parameter values should be stored as strings plus optional typed JSON value.

### 5.5 Table

A table is structured tabular data reported by a worker.

Examples:

- Validation results
- Batch-level predictions
- Data-quality checks
- Workflow summary rows

Tables must support:

- Table name
- Column definitions
- Rows as JSON arrays or objects
- Pagination in the frontend
- Optional replacement mode
- Optional append mode

### 5.6 Image

An image is a visual output reported by a worker.

Examples:

- Input image
- Segmentation mask
- Detection result
- Before/after processing preview
- Generated sample

Images must support:

- Upload as file
- Metadata JSON
- Optional step
- Optional caption
- Optional group/key
- Preview in frontend
- Gallery view per run

### 5.7 Artifact

An artifact is a file or directory output from a run.

Examples:

- Model weights
- Checkpoints
- CSV result files
- JSON reports
- Pickle files
- ZIP archives
- Workflow result bundles

Version 1 must support file artifacts. Directory artifacts can be uploaded as ZIP files.

### 5.8 Event

An event is an immutable timeline entry associated with a run.

Examples:

- Run created
- Run started
- Metric logged
- Image uploaded
- Artifact uploaded
- Worker finished
- Worker failed

Events are used for auditability and WebSocket streaming.

---

## 6. Functional Requirements

## 6.1 Project Management

### FR-PROJ-001: List Projects

The frontend must display a list of projects.

Each project list item must show:

- Project name
- Description
- Number of runs
- Latest run timestamp
- Number of running runs

### FR-PROJ-002: Create Project

Authenticated users must be able to create a project from the frontend or API.

Required fields:

- `name`

Optional fields:

- `description`
- `tags`
- `metadata`

### FR-PROJ-003: Update Project

Authenticated users must be able to update project name, description, tags, and metadata.

### FR-PROJ-004: Delete Project

Authenticated users may delete a project only if deletion is enabled by configuration.

Deletion must either:

- Soft-delete the project and hide it by default, or
- Require explicit confirmation in the frontend.

Default behavior should be soft delete.

---

## 6.2 Run Management

### FR-RUN-001: Create Run

Workers and authenticated users must be able to create a run.

Endpoint:

```http
POST /api/projects/{project_id}/runs
```

Input:

```json
{
  "name": "experiment-001",
  "description": "Training baseline model",
  "tags": ["baseline", "resnet"],
  "params": {
    "learning_rate": 0.001,
    "batch_size": 32
  },
  "metadata": {
    "git_commit": "abc123",
    "hostname": "worker-1"
  }
}
```

Output:

```json
{
  "id": "run_uuid",
  "project_id": "project_uuid",
  "name": "experiment-001",
  "status": "created",
  "created_at": "2026-05-11T10:00:00Z"
}
```

### FR-RUN-002: Start Run

Workers must be able to mark a run as running.

```http
POST /api/runs/{run_id}/start
```

### FR-RUN-003: Finish Run

Workers must be able to mark a run as finished.

```http
POST /api/runs/{run_id}/finish
```

Optional input:

```json
{
  "summary": {
    "best_accuracy": 0.94,
    "final_loss": 0.21
  }
}
```

### FR-RUN-004: Fail Run

Workers must be able to mark a run as failed.

```http
POST /api/runs/{run_id}/fail
```

Input:

```json
{
  "error_message": "Out of memory",
  "error_type": "RuntimeError",
  "traceback": "optional traceback string"
}
```

### FR-RUN-005: Cancel Run

Authenticated users must be able to mark a run as cancelled.

The application is not required to terminate the external worker process. Cancellation only updates the run status and emits an event.

### FR-RUN-006: List Runs

The frontend must display runs for a project.

Filtering must support:

- Status
- Tags
- Created date range
- Name search
- Metric presence
- Parameter value search

Sorting must support:

- Created time
- Start time
- End time
- Status
- Run name
- Selected metric value where available

### FR-RUN-007: Run Detail Page

Each run detail page must show:

- Run status
- Start/end duration
- Parameters
- Tags
- Notes
- Metrics
- Charts
- Logs
- Tables
- Images
- Artifacts
- Event timeline

---

## 6.3 Metrics

### FR-METRIC-001: Log Single Metric

Workers must be able to log one metric.

```http
POST /api/runs/{run_id}/metrics
```

Input:

```json
{
  "name": "loss",
  "value": 0.245,
  "step": 12,
  "timestamp": "2026-05-11T10:01:00Z",
  "context": {
    "split": "train"
  }
}
```

### FR-METRIC-002: Log Metric Batch

Workers must be able to send many metrics in one request.

```http
POST /api/runs/{run_id}/metrics/batch
```

Input:

```json
{
  "metrics": [
    {"name": "loss", "value": 0.245, "step": 12},
    {"name": "accuracy", "value": 0.91, "step": 12}
  ]
}
```

### FR-METRIC-003: Query Metrics

The frontend must be able to query metric series by run and metric name.

```http
GET /api/runs/{run_id}/metrics?names=loss,accuracy
```

Response:

```json
{
  "series": {
    "loss": [
      {"step": 1, "value": 0.9, "timestamp": "2026-05-11T10:00:00Z"}
    ],
    "accuracy": [
      {"step": 1, "value": 0.7, "timestamp": "2026-05-11T10:00:00Z"}
    ]
  }
}
```

### FR-METRIC-004: Metric Summary

The backend must calculate or store latest, min, max, and count per metric per run.

This summary should be used for fast run table display.

---

## 6.4 Flexible Charts

### FR-CHART-001: Chart Builder

The frontend must include a chart builder that lets the user choose:

- Visualization type
- Project
- One or more runs
- X-axis source
- Y-axis source
- Grouping field
- Aggregation mode where applicable
- Filters

Supported chart types in version 1:

- Line chart
- Scatter chart
- Bar chart
- Area chart
- Histogram-like chart if data allows

### FR-CHART-002: Chart Data Sources

Chart data sources must include:

- Metrics
- Parameters
- Run metadata
- Table columns where numeric
- Event timestamps where useful

### FR-CHART-003: Run Comparison

The user must be able to compare the same metric across multiple runs.

Example:

- X-axis: `step`
- Y-axis: `loss`
- Group by: `run.name`

### FR-CHART-004: Save Chart Configuration

Users should be able to save chart configurations per project.

Saved chart config fields:

- Name
- Chart type
- Selected data source
- Axis mapping
- Filters
- ECharts option override JSON

### FR-CHART-005: ECharts Integration

Apache ECharts must be used directly from React components.

Requirements:

- No chart wrapper framework is required.
- Chart components must initialize and dispose ECharts instances correctly.
- Charts must resize on container size changes.
- Invalid chart config must show a readable frontend error.

---

## 6.5 Tables

### FR-TABLE-001: Create or Replace Table

Workers must be able to create or replace a table.

```http
PUT /api/runs/{run_id}/tables/{table_name}
```

Input:

```json
{
  "columns": [
    {"name": "image_id", "type": "string"},
    {"name": "score", "type": "number"},
    {"name": "label", "type": "string"}
  ],
  "rows": [
    {"image_id": "img001", "score": 0.94, "label": "cat"}
  ],
  "metadata": {
    "split": "validation"
  }
}
```

### FR-TABLE-002: Append Rows

Workers must be able to append rows to an existing table.

```http
POST /api/runs/{run_id}/tables/{table_name}/rows
```

### FR-TABLE-003: Query Table Data

The frontend must support pagination, sorting, and filtering for tables.

```http
GET /api/runs/{run_id}/tables/{table_name}?limit=100&offset=0
```

### FR-TABLE-004: Table Display

The frontend must display tables with:

- Sticky header
- Pagination
- Column type rendering
- Text truncation for long cells
- JSON cell preview
- Optional CSV download

---

## 6.6 Images

### FR-IMAGE-001: Upload Image

Workers must be able to upload an image to a run.

```http
POST /api/runs/{run_id}/images
Content-Type: multipart/form-data
```

Fields:

- `file`: image file
- `name`: image name
- `step`: optional integer
- `caption`: optional string
- `metadata`: optional JSON string

Supported formats:

- PNG
- JPEG
- WebP

### FR-IMAGE-002: Image Metadata

The backend must store:

- Original filename
- Content type
- Size
- Width and height if available
- Step
- Caption
- Metadata JSON
- Created timestamp
- Storage path

### FR-IMAGE-003: Image Gallery

The frontend must provide an image gallery per run.

Gallery features:

- Filter by image name/group
- Filter by step
- Preview thumbnail
- Open full-size image
- Show metadata and caption

### FR-IMAGE-004: Image Streaming Notification

When a new image is uploaded, connected frontend clients viewing the run should receive a WebSocket event.

---

## 6.7 Logs

### FR-LOG-001: Append Logs

Workers must be able to append logs.

```http
POST /api/runs/{run_id}/logs
```

Input:

```json
{
  "level": "info",
  "message": "Epoch 1 completed",
  "timestamp": "2026-05-11T10:02:00Z",
  "context": {
    "epoch": 1
  }
}
```

### FR-LOG-002: Query Logs

The frontend must display logs with:

- Pagination
- Level filter
- Text search
- Auto-scroll toggle
- Live updates through WebSocket

---

## 6.8 Artifacts

### FR-ART-001: Upload Artifact

Workers must be able to upload an artifact file.

```http
POST /api/runs/{run_id}/artifacts
Content-Type: multipart/form-data
```

Fields:

- `file`: artifact file
- `name`: optional display name
- `artifact_path`: optional logical path
- `metadata`: optional JSON string

### FR-ART-002: Artifact Storage

Version 1 storage should use local filesystem storage.

Storage layout example:

```text
/artifacts/
  projects/
    {project_id}/
      runs/
        {run_id}/
          artifacts/
          images/
```

Requirements:

- Backend must not trust user-provided filenames directly.
- Backend must generate safe storage paths.
- Metadata must be stored in the database.
- Files must be downloadable by authenticated users.

### FR-ART-003: Artifact Listing

The frontend must display artifacts with:

- Name
- Logical path
- Size
- Content type
- Created timestamp
- Download link
- Metadata preview

### FR-ART-004: Artifact Size Limit

Maximum artifact size must be configurable.

Example:

```env
APP_MAX_UPLOAD_MB=512
```

---

## 6.9 Notifications

### FR-NOTIF-001: Run Completion Popup

The frontend must show a popup/toast notification when a worker finishes, fails, or is cancelled.

Notification must include:

- Project name
- Run name
- Final status
- Timestamp
- Link to run detail page

### FR-NOTIF-002: WebSocket Notification Stream

The frontend must maintain a WebSocket connection after authentication.

The backend must broadcast relevant events:

- Run started
- Run finished
- Run failed
- Metric logged
- Image uploaded
- Artifact uploaded
- Log appended

### FR-NOTIF-003: Notification History

The application should keep recent notification events in the database as run events.

Frontend can display them in the run timeline.

---

## 6.10 Python Client Library

### FR-SDK-001: Package

A small Python package must be provided for workers.

Suggested package name:

```text
mini_tracker
```

### FR-SDK-002: Client Initialization

Example usage:

```python
from mini_tracker import Tracker

tracker = Tracker(
    base_url="http://localhost:8000",
    api_key="dev-api-key",
    project="cat-dog-classifier",
)
```

### FR-SDK-003: Run Context Manager

The library must support context manager usage.

```python
with tracker.run(name="baseline-resnet") as run:
    run.log_params({"lr": 0.001, "batch_size": 32})
    for step in range(10):
        run.log_metric("loss", 1.0 / (step + 1), step=step)
    run.log_artifact("model.pt")
```

Behavior:

- On context enter: create/start run.
- On normal exit: finish run.
- On exception: fail run and send error metadata.

### FR-SDK-004: Client Methods

Required methods:

```python
tracker.get_or_create_project(name, description=None)
tracker.create_run(project, name=None, params=None, tags=None, metadata=None)

run.start()
run.finish(summary=None)
run.fail(error_message, error_type=None, traceback=None)
run.log_metric(name, value, step=None, timestamp=None, context=None)
run.log_metrics(metrics)
run.log_params(params)
run.log_log(message, level="info", context=None)
run.log_table(name, rows, columns=None, mode="replace")
run.append_table_rows(name, rows)
run.log_image(path, name=None, step=None, caption=None, metadata=None)
run.log_artifact(path, name=None, artifact_path=None, metadata=None)
```

### FR-SDK-005: Client Simplicity

The Python client must:

- Use `requests` or `httpx`.
- Require minimal dependencies.
- Retry transient network errors optionally.
- Fail gracefully with readable exceptions.
- Support environment variables:

```env
MINI_TRACKER_URL=http://localhost:8000
MINI_TRACKER_API_KEY=dev-api-key
MINI_TRACKER_PROJECT=default
```

---

## 7. REST API Requirements

## 7.1 API Style

- All API paths must be prefixed with `/api`.
- JSON must use snake_case field names.
- Timestamps must be ISO 8601 strings in UTC.
- Error responses must be consistent.

Error response format:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid request body",
    "details": {}
  }
}
```

## 7.2 Required Endpoints

### Authentication

```http
POST /api/auth/login
GET  /api/auth/me
```

### Projects

```http
GET    /api/projects
POST   /api/projects
GET    /api/projects/{project_id}
PATCH  /api/projects/{project_id}
DELETE /api/projects/{project_id}
```

### Runs

```http
GET    /api/projects/{project_id}/runs
POST   /api/projects/{project_id}/runs
GET    /api/runs/{run_id}
PATCH  /api/runs/{run_id}
POST   /api/runs/{run_id}/start
POST   /api/runs/{run_id}/finish
POST   /api/runs/{run_id}/fail
POST   /api/runs/{run_id}/cancel
```

### Metrics

```http
POST /api/runs/{run_id}/metrics
POST /api/runs/{run_id}/metrics/batch
GET  /api/runs/{run_id}/metrics
GET  /api/runs/{run_id}/metrics/summary
```

### Parameters

```http
PUT /api/runs/{run_id}/params
GET /api/runs/{run_id}/params
```

### Tables

```http
GET  /api/runs/{run_id}/tables
PUT  /api/runs/{run_id}/tables/{table_name}
POST /api/runs/{run_id}/tables/{table_name}/rows
GET  /api/runs/{run_id}/tables/{table_name}
```

### Images

```http
POST /api/runs/{run_id}/images
GET  /api/runs/{run_id}/images
GET  /api/images/{image_id}
GET  /api/images/{image_id}/file
```

### Logs

```http
POST /api/runs/{run_id}/logs
GET  /api/runs/{run_id}/logs
```

### Artifacts

```http
POST /api/runs/{run_id}/artifacts
GET  /api/runs/{run_id}/artifacts
GET  /api/artifacts/{artifact_id}
GET  /api/artifacts/{artifact_id}/download
```

### Events

```http
GET /api/runs/{run_id}/events
GET /api/events/recent
```

### Chart Configurations

```http
GET    /api/projects/{project_id}/charts
POST   /api/projects/{project_id}/charts
GET    /api/charts/{chart_id}
PATCH  /api/charts/{chart_id}
DELETE /api/charts/{chart_id}
```

---

## 8. WebSocket Requirements

### 8.1 WebSocket Endpoint

```http
WS /api/ws?token=<access_token>
```

Optional filters:

```http
WS /api/ws?token=<access_token>&project_id=<project_id>&run_id=<run_id>
```

### 8.2 Message Format

Server-to-client messages must use this format:

```json
{
  "type": "run.finished",
  "project_id": "project_uuid",
  "run_id": "run_uuid",
  "timestamp": "2026-05-11T10:05:00Z",
  "payload": {
    "status": "finished",
    "run_name": "baseline-resnet"
  }
}
```

### 8.3 Required Event Types

```text
run.created
run.started
run.updated
run.finished
run.failed
run.cancelled
metric.logged
log.appended
image.uploaded
artifact.uploaded
table.updated
notification.created
```

### 8.4 Reconnection

The frontend must reconnect automatically with exponential backoff.

After reconnection, the frontend must refresh current page data through REST API to avoid missing events.

---

## 9. Data Model Requirements

### 9.1 Tables

Minimum required database tables:

- `users`
- `projects`
- `runs`
- `run_params`
- `metrics`
- `metric_summaries`
- `logs`
- `tables`
- `table_rows`
- `images`
- `artifacts`
- `events`
- `chart_configs`
- `api_keys` optional for version 1.1

### 9.2 Project Model

Fields:

- `id`: UUID primary key
- `name`: unique string
- `description`: nullable text
- `tags`: JSON array
- `metadata`: JSON object
- `created_at`: datetime
- `updated_at`: datetime
- `deleted_at`: nullable datetime

### 9.3 Run Model

Fields:

- `id`: UUID primary key
- `project_id`: foreign key
- `name`: string
- `description`: nullable text
- `status`: enum
- `tags`: JSON array
- `metadata`: JSON object
- `summary`: JSON object
- `started_at`: nullable datetime
- `finished_at`: nullable datetime
- `created_at`: datetime
- `updated_at`: datetime
- `deleted_at`: nullable datetime

### 9.4 Metric Model

Fields:

- `id`: UUID primary key
- `run_id`: foreign key
- `name`: indexed string
- `value`: float
- `step`: nullable integer
- `timestamp`: datetime
- `context`: JSON object
- `created_at`: datetime

Indexes:

- `(run_id, name, step)`
- `(run_id, name, timestamp)`

### 9.5 Metric Summary Model

Fields:

- `id`: UUID primary key
- `run_id`: foreign key
- `name`: string
- `latest_value`: float
- `latest_step`: nullable integer
- `min_value`: float
- `max_value`: float
- `count`: integer
- `updated_at`: datetime

Unique constraint:

- `(run_id, name)`

### 9.6 Run Param Model

Fields:

- `id`: UUID primary key
- `run_id`: foreign key
- `key`: string
- `value`: string
- `value_json`: nullable JSON
- `created_at`: datetime

Unique constraint:

- `(run_id, key)`

### 9.7 Table Model

Fields:

- `id`: UUID primary key
- `run_id`: foreign key
- `name`: string
- `columns`: JSON array
- `metadata`: JSON object
- `created_at`: datetime
- `updated_at`: datetime

Unique constraint:

- `(run_id, name)`

### 9.8 Table Row Model

Fields:

- `id`: UUID primary key
- `table_id`: foreign key
- `row_index`: integer
- `data`: JSON object
- `created_at`: datetime

Indexes:

- `(table_id, row_index)`

### 9.9 Image Model

Fields:

- `id`: UUID primary key
- `run_id`: foreign key
- `name`: string
- `original_filename`: string
- `content_type`: string
- `size_bytes`: integer
- `width`: nullable integer
- `height`: nullable integer
- `step`: nullable integer
- `caption`: nullable text
- `metadata`: JSON object
- `storage_path`: string
- `created_at`: datetime

### 9.10 Artifact Model

Fields:

- `id`: UUID primary key
- `run_id`: foreign key
- `name`: string
- `original_filename`: string
- `artifact_path`: nullable string
- `content_type`: string
- `size_bytes`: integer
- `metadata`: JSON object
- `storage_path`: string
- `created_at`: datetime

### 9.11 Event Model

Fields:

- `id`: UUID primary key
- `project_id`: nullable foreign key
- `run_id`: nullable foreign key
- `type`: string
- `payload`: JSON object
- `created_at`: datetime

Indexes:

- `(project_id, created_at)`
- `(run_id, created_at)`
- `(type, created_at)`

### 9.12 Chart Config Model

Fields:

- `id`: UUID primary key
- `project_id`: foreign key
- `name`: string
- `chart_type`: string
- `config`: JSON object
- `created_by`: nullable string
- `created_at`: datetime
- `updated_at`: datetime

---

## 10. Backend Architecture Requirements

### 10.1 Backend Structure

Suggested directory structure:

```text
backend/
  app/
    main.py
    config.py
    database.py
    auth/
      routes.py
      service.py
      security.py
    projects/
      routes.py
      models.py
      schemas.py
      service.py
    runs/
      routes.py
      models.py
      schemas.py
      service.py
    metrics/
      routes.py
      models.py
      schemas.py
      service.py
    tables/
      routes.py
      models.py
      schemas.py
      service.py
    files/
      storage.py
      routes.py
      schemas.py
    websocket/
      manager.py
      routes.py
    events/
      service.py
    tests/
  alembic/
  pyproject.toml
```

### 10.2 Layering

The backend should follow a simple layered architecture:

- Routes: HTTP/WebSocket request handling.
- Schemas: Pydantic request/response validation.
- Services: business logic.
- Models: SQLAlchemy ORM models.
- Storage: filesystem operations.
- Event service: database event creation and WebSocket broadcasting.

Routes should not contain complex business logic.

### 10.3 Configuration

Required configuration values:

```env
APP_ENV=development
APP_SECRET_KEY=change-me
APP_USERS=admin:hashed-password
APP_API_KEY=dev-api-key
APP_DATABASE_URL=postgresql+psycopg://tracker:tracker@db:5432/tracker
APP_ARTIFACT_ROOT=/data/artifacts
APP_MAX_UPLOAD_MB=512
APP_CORS_ORIGINS=http://localhost:5173
APP_AUTH_TOKEN_TTL_MINUTES=1440
```

### 10.4 File Storage

The backend must implement a storage abstraction even if only local storage exists in version 1.

Interface example:

```python
class StorageBackend:
    def save_file(self, source_file, destination_path: str) -> StoredFile: ...
    def open_file(self, storage_path: str): ...
    def delete_file(self, storage_path: str): ...
```

Version 1 implementation:

- Local filesystem storage.

Future-compatible implementations:

- S3-compatible storage.
- MinIO.

### 10.5 Event Broadcasting

All important state changes must create an event record and broadcast a WebSocket message.

Examples:

- Run status changes.
- Metric batch logged.
- Image uploaded.
- Artifact uploaded.
- Logs appended.

### 10.6 Validation

Backend must validate:

- Required fields.
- Metric numeric values.
- File sizes.
- Supported image MIME types.
- Safe artifact paths.
- Run status transitions.
- JSON metadata object shape.

Invalid requests must return `400` or `422` with consistent error payloads.

### 10.7 Run Status Transitions

Allowed transitions:

```text
created -> running
created -> cancelled
created -> failed
running -> finished
running -> failed
running -> cancelled
failed -> running only if explicit resume endpoint is added later
finished -> no transition by default
cancelled -> no transition by default
```

---

## 11. Frontend Requirements

## 11.1 Frontend Structure

Suggested directory structure:

```text
frontend/
  src/
    main.jsx
    App.jsx
    api/
      client.js
      auth.js
      projects.js
      runs.js
      metrics.js
      files.js
      websocket.js
    routes/
      LoginPage.jsx
      ProjectsPage.jsx
      ProjectDetailPage.jsx
      RunDetailPage.jsx
      ChartsPage.jsx
      SettingsPage.jsx
    components/
      Layout.jsx
      NavBar.jsx
      StatusBadge.jsx
      ToastHost.jsx
      RunTable.jsx
      MetricChart.jsx
      ChartBuilder.jsx
      DataTable.jsx
      ImageGallery.jsx
      ArtifactList.jsx
      LogViewer.jsx
      EventTimeline.jsx
    styles/
      base.css
      layout.css
      forms.css
      tables.css
      charts.css
```

### 11.2 Routing

Required routes:

```text
/login
/projects
/projects/:projectId
/projects/:projectId/charts
/runs/:runId
/settings
```

Default route:

- Unauthenticated users go to `/login`.
- Authenticated users go to `/projects`.

### 11.3 Design Requirements

The UI should be clean, dense, and developer-oriented.

Design principles:

- Simple dashboard layout.
- Left or top navigation.
- Clear status badges.
- Compact tables.
- Large chart area.
- Minimal visual noise.
- Plain CSS variables for theming.

CSS requirements:

- Use plain CSS files.
- Use CSS variables for colors, spacing, borders, and font sizes.
- No Tailwind.
- No CSS framework.
- Responsive layout for desktop and medium screens.
- Mobile support is desirable but not the primary target.

Suggested CSS variables:

```css
:root {
  --color-bg: #f7f8fa;
  --color-panel: #ffffff;
  --color-border: #d9dee7;
  --color-text: #18202f;
  --color-muted: #667085;
  --color-primary: #315efb;
  --radius-sm: 4px;
  --radius-md: 8px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
}
```

### 11.4 Login Page

The login page must include:

- Username field
- Password field
- Submit button
- Error message area
- Loading state

### 11.5 Projects Page

The projects page must include:

- Project list
- Search input
- Create project button
- Project status summary

### 11.6 Project Detail Page

The project detail page must include:

- Project header
- Run table
- Filters
- Saved charts
- Create run button for manual test runs
- Link to chart builder

### 11.7 Run Detail Page

The run detail page must include tabs or sections:

- Overview
- Metrics
- Charts
- Logs
- Tables
- Images
- Artifacts
- Events

### 11.8 Chart Builder UI

The chart builder must include:

- Chart type selector
- Run selector
- Data source selector
- X-axis selector
- Y-axis selector
- Group selector
- Filter controls
- JSON advanced ECharts override textarea
- Preview area
- Save button

### 11.9 Toast Notifications

The frontend must show toasts for:

- Run finished
- Run failed
- Artifact uploaded
- Backend connection lost
- Backend connection restored

### 11.10 API Client

The frontend API client must:

- Attach bearer token to requests.
- Handle `401` by redirecting to login.
- Parse JSON error responses.
- Support multipart file download/upload endpoints.

### 11.11 WebSocket Client

The frontend WebSocket client must:

- Connect after login.
- Pass token securely enough for this self-hosted app.
- Reconnect with backoff.
- Dispatch events to subscribed components.
- Refresh active run/project data after reconnect.

---

## 12. Architecture Requirements

### 12.1 Logical Architecture

```text
Python Worker / Training Script
        |
        | JSON REST API / multipart upload
        v
FastAPI Backend  <------ WebSocket ------ React Frontend
        |
        | SQLAlchemy
        v
PostgreSQL / SQLite
        |
        v
Local Artifact Storage
```

### 12.2 Service Responsibilities

#### Backend

- Authentication
- REST API
- WebSocket server
- Data validation
- Database persistence
- File storage
- Event creation
- Notification broadcasting

#### Frontend

- Login
- Project/run navigation
- Data visualization
- Chart builder
- Tables, logs, image gallery, artifact browser
- Toast notifications

#### Worker SDK

- Simple Python interface
- Run lifecycle management
- Metric logging
- Parameter logging
- Table logging
- Image upload
- Artifact upload

#### Database

- Store structured metadata and event history.
- Store file metadata, not file binary content.

#### Artifact Storage

- Store uploaded files on disk.
- Serve files through authenticated backend routes.

### 12.3 Deployment Architecture

Docker Compose services:

```text
backend
frontend
db
optional-nginx
```

Development setup may use:

- Frontend Vite dev server.
- Backend Uvicorn reload.
- SQLite or PostgreSQL.

Production-like setup should use:

- Built static frontend served by Nginx or backend static serving.
- Backend Uvicorn/Gunicorn worker.
- PostgreSQL.
- Mounted volume for artifacts.

---

## 13. Docker Compose Requirements

### 13.1 Required Files

```text
docker-compose.yml
docker-compose.dev.yml
backend/Dockerfile
frontend/Dockerfile
.env.example
```

### 13.2 Services

#### db

- PostgreSQL image.
- Persistent volume.
- Healthcheck.

#### backend

- Builds backend image.
- Exposes port `8000`.
- Depends on db healthcheck.
- Mounts artifact volume.
- Runs migrations on startup or exposes migration command.

#### frontend

- Builds frontend image.
- Exposes port `5173` in development or `80` in production.
- Uses Vite for development.

### 13.3 Example Environment

```env
POSTGRES_USER=tracker
POSTGRES_PASSWORD=tracker
POSTGRES_DB=tracker
APP_DATABASE_URL=postgresql+psycopg://tracker:tracker@db:5432/tracker
APP_SECRET_KEY=change-me
APP_USERS=admin:$2b$12$examplehash
APP_API_KEY=dev-api-key
APP_ARTIFACT_ROOT=/data/artifacts
APP_CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 14. Testing Requirements

### 14.1 Backend Tests

Use Pytest.

Required test coverage:

- Auth login success/failure.
- Project CRUD.
- Run lifecycle transitions.
- Metric logging.
- Metric summary updates.
- Table creation and row append.
- Image upload validation.
- Artifact upload validation.
- Log append/query.
- WebSocket event broadcast at service level where practical.
- Python SDK happy-path run context manager.

### 14.2 Frontend Tests

Use Vite-compatible testing setup.

Required coverage:

- Login page form behavior.
- API client authorization handling.
- Project list rendering.
- Run table rendering.
- Metric chart rendering with mocked data.
- Chart builder config creation.
- Toast notification display.
- WebSocket reconnect behavior using mocks.

### 14.3 Integration Tests

Docker Compose integration test should verify:

- Backend starts.
- Frontend builds.
- Database migrations apply.
- Login works.
- Worker can create run.
- Worker can log metric.
- Worker can upload artifact.
- Frontend can fetch run detail.

---

## 15. Performance Requirements

### 15.1 Expected Scale for Version 1

The application should handle:

- 10-50 projects.
- 1,000-50,000 runs total.
- Up to 1,000,000 metric rows in a local PostgreSQL deployment.
- Artifacts limited primarily by disk capacity.
- 1-20 active frontend users.
- 1-100 active workers depending on hardware.

### 15.2 API Performance Targets

On a typical local/self-hosted deployment:

- Project list: under 500 ms for common cases.
- Run list: under 1 second with pagination.
- Run detail overview: under 1 second excluding large artifacts.
- Metric series query: under 2 seconds for typical chart ranges.
- File upload: limited by network and disk.

### 15.3 Pagination

Required pagination for:

- Runs
- Logs
- Events
- Table rows
- Images
- Artifacts

Metric queries should support filters and should avoid returning unbounded large datasets by default.

---

## 16. Security Requirements

### 16.1 Required Security Measures

- No public registration.
- Passwords must be hashed.
- Auth tokens must be signed.
- CORS must be configurable.
- Upload size must be limited.
- Filenames must be sanitized.
- Path traversal must be prevented.
- Artifact downloads must require authentication.
- WebSocket connections must require authentication.
- Error responses must not leak server secrets.

### 16.2 Out of Scope for Version 1

- Enterprise SSO.
- OAuth.
- Fine-grained project permissions.
- Full audit compliance.
- Malware scanning of artifacts.

---

## 17. Observability Requirements

The backend should log:

- Startup configuration summary without secrets.
- Authentication failures without passwords.
- API errors.
- Upload errors.
- WebSocket connect/disconnect.
- Run state transitions.

Minimum health endpoints:

```http
GET /api/health
GET /api/version
```

Health response:

```json
{
  "status": "ok",
  "database": "ok",
  "artifact_storage": "ok"
}
```

---

## 18. UX and Design Requirements

### 18.1 Visual Style

The UI should feel like a compact internal developer tool.

Requirements:

- Neutral background.
- High contrast text.
- Clear status colors.
- Dense but readable tables.
- Simple form controls.
- Clear empty states.
- Fast navigation between project, run, and chart views.

### 18.2 Empty States

Frontend must show helpful empty states for:

- No projects.
- No runs in project.
- No metrics for run.
- No images uploaded.
- No artifacts uploaded.
- No logs available.

### 18.3 Error States

Frontend must show readable errors for:

- Invalid credentials.
- Lost backend connection.
- Failed file upload.
- Invalid chart configuration.
- API validation errors.

### 18.4 Loading States

Frontend must show loading indicators for:

- Login request.
- Project list loading.
- Run detail loading.
- Chart data loading.
- Artifact upload/download.

---

## 19. Configuration Requirements

The application must support configuration through environment variables.

Required variables:

```env
APP_ENV
APP_SECRET_KEY
APP_USERS
APP_API_KEY
APP_DATABASE_URL
APP_ARTIFACT_ROOT
APP_MAX_UPLOAD_MB
APP_CORS_ORIGINS
APP_AUTH_TOKEN_TTL_MINUTES
```

Optional variables:

```env
APP_ALLOW_PROJECT_DELETE=false
APP_ALLOW_RUN_DELETE=false
APP_LOG_LEVEL=info
APP_STATIC_FRONTEND_PATH=/app/static
APP_ENABLE_SWAGGER=true
```

---

## 20. Acceptance Criteria

### AC-001: Authentication

Given predefined credentials are configured, a user can log in through the frontend and access the projects page.

### AC-002: Worker Run Lifecycle

Given a valid API key, a Python worker can create a project, create a run, start it, log metrics, upload an artifact, and finish the run.

### AC-003: Real-Time Updates

Given a user is viewing a run detail page, when a worker logs a metric or uploads an image, the frontend receives a WebSocket event and updates or prompts refresh without page reload.

### AC-004: Flexible Charting

Given a run contains metrics, the user can create a line chart comparing one or more metrics across one or more runs using Apache ECharts.

### AC-005: Table Data

Given a worker uploads table rows, the frontend can display the table with pagination.

### AC-006: Images

Given a worker uploads images, the frontend can show them in a gallery with metadata and captions.

### AC-007: Artifacts

Given a worker uploads an artifact, the frontend can list and download it after authentication.

### AC-008: Notifications

Given a run finishes or fails, connected frontend clients receive a visible popup notification.

### AC-009: Docker Compose

Given Docker Compose is installed and `.env` is configured, the full app can be started with one command and all services become healthy.

### AC-010: No Disallowed Frontend Technologies

The frontend must be implemented using React, React Router, Vite, Apache ECharts, plain JavaScript, and plain CSS only. It must not use TypeScript, Tailwind CSS, or component/CSS frameworks.

---

## 21. Suggested MVP Scope

The first implementable MVP should include:

1. Login with predefined credentials.
2. Project CRUD.
3. Run creation and status lifecycle.
4. Metric logging and metric chart display.
5. Log streaming.
6. Artifact upload/download.
7. Image upload/gallery.
8. Basic table upload/display.
9. WebSocket run notifications.
10. Python SDK with context manager.
11. Docker Compose deployment.

Features that can be deferred:

- Advanced chart saving.
- Project-scoped API keys.
- S3/MinIO storage.
- Advanced table filtering.
- Fine-grained permissions.
- Admin UI for managing users.

---

## 22. Implementation Priority

### Phase 1: Backend Foundation

- FastAPI app setup.
- Config loading.
- Database setup.
- SQLAlchemy models.
- Alembic migrations.
- Auth.
- Project and run APIs.

### Phase 2: Worker Data APIs

- Metrics.
- Params.
- Logs.
- Tables.
- Images.
- Artifacts.
- Events.

### Phase 3: WebSocket

- WebSocket manager.
- Authenticated connection.
- Broadcast on run events.
- Frontend reconnect handling.

### Phase 4: Frontend Core

- Login.
- Layout.
- Project list.
- Project detail.
- Run detail.
- Charts.
- Tables.
- Logs.
- Images.
- Artifacts.

### Phase 5: Python SDK

- Client initialization.
- Project/run creation.
- Context manager.
- Metrics/params/logs/tables/images/artifacts.
- Error handling.

### Phase 6: Docker and Tests

- Dockerfiles.
- Docker Compose.
- Backend tests.
- Frontend tests.
- Integration smoke test.

---

## 23. Open Implementation Decisions

The following decisions should be made before implementation starts:

1. Whether production deployment should serve frontend through Nginx or FastAPI static files.
2. Whether SQLite must be officially supported beyond local development.
3. Whether worker API keys are global only in MVP or project-scoped from the beginning.
4. Whether artifacts should be immutable once uploaded.
5. Whether run deletion should exist in MVP or only soft deletion.
6. Whether chart configs are user-specific or project-wide in MVP.
7. Whether table rows should be stored as JSON rows or normalized columns. For simplicity, JSON rows are recommended for MVP.

---

## 24. Recommended MVP Technical Defaults

Recommended defaults for fastest implementation:

- PostgreSQL in Docker Compose.
- SQLite allowed for local single-process development.
- JWT-style signed bearer tokens.
- One global worker API key from environment variable.
- Local filesystem artifact storage.
- JSONB columns for metadata, tags, table rows, event payloads, and chart configs when using PostgreSQL.
- Soft delete for projects and runs.
- No admin user-management UI in MVP.
- Frontend served by Vite in development and Nginx in production-like Docker Compose.
- Python SDK using `httpx`.

---

## 25. Definition of Done

The application is considered complete for MVP when:

- The entire stack runs through Docker Compose.
- A user can log in with predefined credentials.
- A worker can report a complete run using the Python SDK.
- The frontend can display the reported run, metrics, logs, images, tables, and artifacts.
- The user can build at least line, scatter, and bar charts from available data.
- WebSocket notifications work for run completion and failure.
- Core backend endpoints have tests.
- Frontend can be built with Vite without TypeScript.
- All configuration can be supplied through `.env`.
- The README explains local development, Docker deployment, credentials setup, and SDK usage.

