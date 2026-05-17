import base64
import hashlib
import hmac
import json
import re
import secrets
import sqlite3
import threading
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path, PurePosixPath
from typing import Any, Iterable

from fastapi import Request, UploadFile, WebSocket

from .settings import settings

RUN_STATUSES = {"created", "running", "finished", "failed", "cancelled"}
TERMINAL_RUN_STATUSES = {"finished", "failed", "cancelled"}
IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}
JSON_FIELDS = {
    "projects": {"tags", "metadata"},
    "runs": {"tags", "metadata", "summary"},
    "metrics": {"context"},
    "logs": {"context"},
    "tables_meta": {"columns", "metadata"},
    "table_rows": {"data"},
    "images": {"metadata"},
    "artifacts": {"metadata"},
    "events": {"payload"},
    "chart_configs": {"config"},
    "run_comparisons": {"run_ids", "chart_settings"},
}


@dataclass(frozen=True)
class Principal:
    username: str
    kind: str
    is_admin: bool = False


class ApiError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_timestamp(value: datetime | None = None) -> str:
    value = value or utc_now()
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def new_id() -> str:
    return str(uuid.uuid4())


def json_dumps(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), sort_keys=True)


def json_loads(value: str | bytes | None, default: Any) -> Any:
    if value is None:
        return default
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return default


settings.artifact_root.mkdir(parents=True, exist_ok=True)


def sqlite_path_from_url(database_url: str) -> str:
    if database_url.startswith("sqlite:///"):
        return database_url.removeprefix("sqlite:///")
    if database_url == "sqlite:///:memory:":
        return ":memory:"
    if database_url.startswith("sqlite://"):
        return database_url.removeprefix("sqlite://")
    if settings.env == "test":
        return ":memory:"
    raise RuntimeError(
        "This lightweight backend implementation currently supports SQLite URLs. "
        f"Got APP_DATABASE_URL={database_url!r}."
    )


DB_PATH = sqlite_path_from_url(settings.database_url)
DB_LOCK = threading.RLock()


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


def execute(sql: str, params: Iterable[Any] = ()) -> None:
    with DB_LOCK, connect() as connection:
        connection.execute(sql, tuple(params))
        connection.commit()


def fetch_one(sql: str, params: Iterable[Any] = ()) -> dict[str, Any] | None:
    with DB_LOCK, connect() as connection:
        row = connection.execute(sql, tuple(params)).fetchone()
    return dict(row) if row else None


def fetch_all(sql: str, params: Iterable[Any] = ()) -> list[dict[str, Any]]:
    with DB_LOCK, connect() as connection:
        rows = connection.execute(sql, tuple(params)).fetchall()
    return [dict(row) for row in rows]


def init_db() -> None:
    schema = """
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        tags TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        tags TEXT NOT NULL,
        metadata TEXT NOT NULL,
        summary TEXT NOT NULL,
        started_at TEXT,
        finished_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS run_params (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        value_json TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(run_id, key)
    );
    CREATE TABLE IF NOT EXISTS metrics (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        value REAL NOT NULL,
        step INTEGER,
        timestamp TEXT NOT NULL,
        context TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_metrics_run_name_step ON metrics(run_id, name, step);
    CREATE INDEX IF NOT EXISTS idx_metrics_run_name_timestamp ON metrics(run_id, name, timestamp);
    CREATE TABLE IF NOT EXISTS metric_summaries (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        latest_value REAL NOT NULL,
        latest_step INTEGER,
        min_value REAL NOT NULL,
        max_value REAL NOT NULL,
        count INTEGER NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(run_id, name)
    );
    CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        context TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tables_meta (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        columns TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(run_id, name)
    );
    CREATE TABLE IF NOT EXISTS table_rows (
        id TEXT PRIMARY KEY,
        table_id TEXT NOT NULL REFERENCES tables_meta(id) ON DELETE CASCADE,
        row_index INTEGER NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_table_rows_table_index ON table_rows(table_id, row_index);
    CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        content_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        width INTEGER,
        height INTEGER,
        step INTEGER,
        caption TEXT,
        metadata TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        artifact_path TEXT,
        content_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        metadata TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        run_id TEXT,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_project_created ON events(project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_events_run_created ON events(run_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_events_type_created ON events(type, created_at);
    CREATE TABLE IF NOT EXISTS chart_configs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        chart_type TEXT NOT NULL,
        config TEXT NOT NULL,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS run_comparisons (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        run_ids TEXT NOT NULL,
        primary_metric TEXT,
        x_axis TEXT NOT NULL,
        chart_settings TEXT NOT NULL,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """
    with DB_LOCK, connect() as connection:
        connection.executescript(schema)
        connection.commit()


def decode_row(table: str, row: dict[str, Any] | None) -> dict[str, Any] | None:
    if row is None:
        return None
    decoded = dict(row)
    for field in JSON_FIELDS.get(table, set()):
        decoded[field] = json_loads(decoded.get(field), [] if field in {"tags", "columns"} else {})
    return decoded


def decode_rows(table: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [decode_row(table, row) or {} for row in rows]


def safe_string(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return str(value)


def require_dict(value: Any, field: str) -> dict[str, Any]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ApiError(422, "validation_error", f"{field} must be a JSON object")
    return value


def require_list(value: Any, field: str) -> list[Any]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ApiError(422, "validation_error", f"{field} must be a JSON array")
    return value


def parse_json_object(raw: str | None, field: str = "metadata") -> dict[str, Any]:
    if raw in {None, ""}:
        return {}
    try:
        parsed = json.loads(raw)
    except ValueError as exc:
        raise ApiError(422, "validation_error", f"{field} must be valid JSON") from exc
    if not isinstance(parsed, dict):
        raise ApiError(422, "validation_error", f"{field} must be a JSON object")
    return parsed


def b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def b64decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode((data + padding).encode("ascii"))


def sign_token(payload_b64: str) -> str:
    digest = hmac.new(settings.secret_key.encode(), payload_b64.encode(), hashlib.sha256).digest()
    return b64encode(digest)


def create_token(username: str) -> tuple[str, str]:
    expires_at = utc_now() + timedelta(minutes=settings.token_ttl_minutes)
    payload = {
        "sub": username,
        "iat": int(time.time()),
        "exp": int(expires_at.timestamp()),
        "nonce": secrets.token_urlsafe(8),
    }
    payload_b64 = b64encode(json_dumps(payload).encode())
    return f"{payload_b64}.{sign_token(payload_b64)}", utc_timestamp(expires_at)


def verify_token(token: str) -> str:
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError as exc:
        raise ApiError(401, "invalid_token", "Invalid authentication token") from exc
    if not hmac.compare_digest(sign_token(payload_b64), signature):
        raise ApiError(401, "invalid_token", "Invalid authentication token")
    try:
        payload = json.loads(b64decode(payload_b64))
    except (ValueError, json.JSONDecodeError) as exc:
        raise ApiError(401, "invalid_token", "Invalid authentication token") from exc
    if int(payload.get("exp", 0)) < int(time.time()):
        raise ApiError(401, "invalid_token", "Authentication token has expired")
    username = payload.get("sub")
    if not isinstance(username, str) or username not in settings.users:
        raise ApiError(401, "invalid_token", "Invalid authentication token")
    return username


def verify_password(username: str, password: str) -> bool:
    stored = settings.users.get(username)
    if stored is None:
        return False
    if stored.startswith("sha256$"):
        expected = stored.split("$", 1)[1]
        actual = hashlib.sha256(password.encode()).hexdigest()
        return hmac.compare_digest(expected, actual)
    if stored.startswith("pbkdf2_sha256$"):
        try:
            _, iterations_raw, salt, expected = stored.split("$", 3)
            digest = hashlib.pbkdf2_hmac(
                "sha256",
                password.encode(),
                salt.encode(),
                int(iterations_raw),
            ).hex()
            return hmac.compare_digest(expected, digest)
        except ValueError:
            return False
    return hmac.compare_digest(stored, password)


def principal_from_request(request: Request) -> Principal:
    authorization = request.headers.get("authorization", "")
    api_key = request.headers.get("x-api-key")
    if settings.api_key and hmac.compare_digest(api_key or "", settings.api_key):
        return Principal(username="worker", kind="api_key")
    if authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if settings.api_key and hmac.compare_digest(token, settings.api_key):
            return Principal(username="worker", kind="api_key")
        username = verify_token(token)
        return Principal(username=username, kind="user", is_admin=username == "admin")
    raise ApiError(401, "not_authenticated", "Authentication is required")


async def require_principal(request: Request) -> Principal:
    return principal_from_request(request)


def principal_from_ws_token(token: str | None) -> Principal:
    if not token:
        raise ApiError(401, "not_authenticated", "Authentication is required")
    if settings.api_key and hmac.compare_digest(token, settings.api_key):
        return Principal(username="worker", kind="api_key")
    username = verify_token(token)
    return Principal(username=username, kind="user", is_admin=username == "admin")


def error_payload(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": details or {}}}


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: list[tuple[WebSocket, str | None, str | None]] = []
        self._lock = threading.RLock()

    async def connect(
        self, websocket: WebSocket, project_id: str | None, run_id: str | None
    ) -> None:
        await websocket.accept()
        with self._lock:
            self._connections.append((websocket, project_id, run_id))

    async def disconnect(self, websocket: WebSocket) -> None:
        with self._lock:
            self._connections = [item for item in self._connections if item[0] is not websocket]

    async def broadcast(self, message: dict[str, Any]) -> None:
        with self._lock:
            connections = list(self._connections)
        stale: list[WebSocket] = []
        for websocket, project_filter, run_filter in connections:
            if project_filter and project_filter != message.get("project_id"):
                continue
            if run_filter and run_filter != message.get("run_id"):
                continue
            try:
                await websocket.send_json(message)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            await self.disconnect(websocket)


manager = ConnectionManager()


async def create_event(
    event_type: str,
    *,
    project_id: str | None = None,
    run_id: str | None = None,
    payload: dict[str, Any] | None = None,
    broadcast: bool = True,
) -> dict[str, Any]:
    event = {
        "id": new_id(),
        "project_id": project_id,
        "run_id": run_id,
        "type": event_type,
        "payload": payload or {},
        "created_at": utc_timestamp(),
    }
    from .database import insert_event

    insert_event(event)
    if broadcast:
        await manager.broadcast(
            {
                "type": event_type,
                "project_id": project_id,
                "run_id": run_id,
                "timestamp": event["created_at"],
                "payload": event["payload"],
            }
        )
    return event


def get_project_or_404(project_id: str, include_deleted: bool = False) -> dict[str, Any]:
    from .database import get_project_row

    project = get_project_row(project_id)
    if not project or (project.get("deleted_at") and not include_deleted):
        raise ApiError(404, "not_found", "Project not found")
    return project


def get_run_or_404(run_id: str, include_deleted: bool = False) -> dict[str, Any]:
    from .database import get_run_row

    run = get_run_row(run_id)
    if not run or (run.get("deleted_at") and not include_deleted):
        raise ApiError(404, "not_found", "Run not found")
    return run


def get_table_or_404(run_id: str, table_name: str) -> dict[str, Any]:
    from .database import get_table_row

    table = get_table_row(run_id, table_name)
    if not table:
        raise ApiError(404, "not_found", "Table not found")
    return table


def sanitize_filename(filename: str | None, fallback: str = "file") -> str:
    name = Path(filename or fallback).name or fallback
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name)
    return name.strip("._") or fallback


def validate_artifact_path(path: str | None) -> str | None:
    if path in {None, ""}:
        return None
    candidate = PurePosixPath(path)
    if candidate.is_absolute() or any(part in {"..", ""} for part in candidate.parts):
        raise ApiError(400, "unsafe_artifact_path", "Artifact path must be relative and safe")
    return str(candidate)


def storage_path_for(
    run: dict[str, Any], category: str, original_filename: str
) -> tuple[str, Path]:
    safe_name = sanitize_filename(original_filename)
    relative = (
        Path("projects")
        / str(run["project_id"])
        / "runs"
        / str(run["id"])
        / category
        / f"{new_id()}_{safe_name}"
    )
    absolute = settings.artifact_root / relative
    absolute.parent.mkdir(parents=True, exist_ok=True)
    return relative.as_posix(), absolute


def resolve_storage_path(storage_path: str) -> Path:
    full_path = (settings.artifact_root / storage_path).resolve()
    root = settings.artifact_root.resolve()
    if root != full_path and root not in full_path.parents:
        raise ApiError(400, "unsafe_storage_path", "Stored file path is unsafe")
    return full_path


def image_dimensions(content_type: str, content: bytes) -> tuple[int | None, int | None]:
    if (
        content_type == "image/png"
        and len(content) >= 24
        and content.startswith(b"\x89PNG\r\n\x1a\n")
    ):
        return int.from_bytes(content[16:20], "big"), int.from_bytes(content[20:24], "big")
    return None, None


async def read_upload_bytes(file: UploadFile) -> bytes:
    content = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise ApiError(413, "upload_too_large", f"Upload exceeds {settings.max_upload_mb} MB limit")
    return content


def project_response(project: dict[str, Any]) -> dict[str, Any]:
    from .database import project_stats

    stats = project_stats(project["id"])
    return {
        **project,
        "run_count": int(stats.get("run_count") or 0),
        "running_run_count": int(stats.get("running_run_count") or 0),
        "finished_run_count": int(stats.get("finished_run_count") or 0),
        "failed_run_count": int(stats.get("failed_run_count") or 0),
        "latest_run_at": stats.get("latest_run_at"),
    }


def run_response(run: dict[str, Any]) -> dict[str, Any]:
    return run


def metric_response(metric: dict[str, Any]) -> dict[str, Any]:
    return metric


def normalize_limit_offset(limit: int, offset: int, max_limit: int = 500) -> tuple[int, int]:
    return max(1, min(limit, max_limit)), max(0, offset)


async def update_run_status(
    run_id: str,
    new_status: str,
    *,
    allowed_from: set[str],
    summary: dict[str, Any] | None = None,
    event_type: str,
    event_payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    run = get_run_or_404(run_id)
    if run["status"] not in allowed_from:
        raise ApiError(
            409,
            "invalid_run_status_transition",
            f"Cannot transition run from {run['status']} to {new_status}",
            {"from": run["status"], "to": new_status},
        )
    now = utc_timestamp()
    started_at = (
        now if new_status == "running" and not run.get("started_at") else run.get("started_at")
    )
    finished_at = now if new_status in TERMINAL_RUN_STATUSES else run.get("finished_at")
    merged_summary = {**require_dict(run.get("summary"), "summary"), **(summary or {})}
    from .database import update_run_status_row

    update_run_status_row(
        run_id,
        status=new_status,
        summary=merged_summary,
        started_at=started_at,
        finished_at=finished_at,
        updated_at=now,
    )
    updated = get_run_or_404(run_id)
    project = get_project_or_404(updated["project_id"])
    payload = {
        "status": new_status,
        "run_name": updated["name"],
        "project_name": project["name"],
        **(event_payload or {}),
    }
    await create_event(event_type, project_id=updated["project_id"], run_id=run_id, payload=payload)
    if new_status in TERMINAL_RUN_STATUSES:
        await create_event(
            "notification.created",
            project_id=updated["project_id"],
            run_id=run_id,
            payload=payload,
        )
    return run_response(updated)


init_db()
