from __future__ import annotations

import base64
import importlib
import json
import os
import sys
import tempfile
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Callable

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

TEST_ROOT = Path(
    os.environ.get(
        "MLWARDEN_TEST_ROOT",
        tempfile.mkdtemp(prefix="mlwarden-backend-tests-"),
    )
)
ARTIFACT_ROOT = TEST_ROOT / "artifacts"
DB_PATH = TEST_ROOT / "mlwarden-test.sqlite3"

TEST_USERNAME = "admin"
TEST_PASSWORD = "password"
TEST_API_KEY = "dev-api-key"

DEFAULT_TEST_ENV = {
    "APP_ENV": "test",
    "APP_SECRET_KEY": "test-secret-key-for-contract-suite",
    "APP_USERS": f"{TEST_USERNAME}:{TEST_PASSWORD}",
    "APP_API_KEY": TEST_API_KEY,
    "APP_DATABASE_URL": f"sqlite:///{DB_PATH}",
    "APP_ARTIFACT_ROOT": str(ARTIFACT_ROOT),
    "APP_MAX_UPLOAD_MB": "1",
    "APP_CORS_ORIGINS": "http://testserver,http://localhost:5173",
    "APP_AUTH_TOKEN_TTL_MINUTES": "60",
    "APP_ALLOW_PROJECT_DELETE": "true",
    "APP_ALLOW_RUN_DELETE": "true",
    "APP_ENABLE_SWAGGER": "false",
}

if not os.environ.get("MLWARDEN_TEST_KEEP_ENV"):
    os.environ.update(DEFAULT_TEST_ENV)
else:
    for key, value in DEFAULT_TEST_ENV.items():
        os.environ.setdefault(key, value)

ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)

PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
)


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line("markers", "contract: backend REST API contract tests")
    config.addinivalue_line("markers", "websocket: backend WebSocket contract tests")
    config.addinivalue_line("markers", "sdk: Python worker SDK contract tests")


def _load_object(target: str) -> Any:
    module_name, sep, attr_name = target.partition(":")
    if not sep:
        raise ValueError(f"App target must use 'module:attribute' format: {target}")
    module = importlib.import_module(module_name)
    return getattr(module, attr_name)


def _load_fastapi_app() -> Any:
    candidates = [
        os.environ.get("MLWARDEN_BACKEND_APP"),
        "app.main:app",
        "app.main:create_app",
        "app.app:app",
    ]

    errors: list[str] = []
    for target in [candidate for candidate in candidates if candidate]:
        try:
            loaded = _load_object(target)
            app = (
                loaded()
                if callable(loaded) and not isinstance(loaded, FastAPI)
                else loaded
            )
        except Exception as exc:  # pragma: no cover - error text is for implementers.
            errors.append(f"{target}: {exc!r}")
            continue

        if isinstance(app, FastAPI) or callable(app):
            return app

        errors.append(f"{target}: loaded object is not an ASGI/FastAPI app")

    pytest.fail(
        "Could not import the backend FastAPI app. Set MLWARDEN_BACKEND_APP to "
        "'module:app' or expose app.main:app/app.main:create_app.\n" + "\n".join(errors)
    )


@pytest.fixture(scope="session")
def fastapi_app() -> Any:
    return _load_fastapi_app()


@pytest.fixture()
def client(fastapi_app: Any) -> TestClient:
    with TestClient(fastapi_app) as test_client:
        yield test_client


def response_body(response: Any) -> Any:
    try:
        return response.json()
    except ValueError:
        pytest.fail(
            f"Expected JSON response, got {response.status_code}: {response.text}"
        )


def assert_status(response: Any, expected: int | set[int]) -> None:
    expected_set = {expected} if isinstance(expected, int) else expected
    assert response.status_code in expected_set, (
        f"Expected status {sorted(expected_set)}, got {response.status_code}.\n"
        f"Body: {response.text}"
    )


def assert_error_response(
    response: Any,
    expected_status: int | set[int] | None = None,
    *,
    code: str | None = None,
) -> dict[str, Any]:
    if expected_status is not None:
        assert_status(response, expected_status)
    body = response_body(response)
    assert isinstance(body, dict), body
    assert "error" in body, (
        "Error responses must use the documented {'error': {'code', 'message', 'details'}} "
        f"shape. Got: {body}"
    )
    error = body["error"]
    assert isinstance(error, dict), body
    assert isinstance(error.get("code"), str) and error["code"], body
    assert isinstance(error.get("message"), str) and error["message"], body
    assert "details" in error, body
    if code is not None:
        assert error["code"] == code, body
    return body


def assert_uuid(value: Any) -> str:
    parsed = uuid.UUID(str(value))
    return str(parsed)


def assert_utc_timestamp(value: Any) -> str:
    assert (
        isinstance(value, str) and value
    ), f"Expected ISO timestamp string, got {value!r}"
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    assert parsed.tzinfo is not None, f"Timestamp must be timezone-aware UTC: {value!r}"
    assert value.endswith("Z") or normalized.endswith(
        "+00:00"
    ), f"Timestamp must be encoded in UTC: {value!r}"
    return value


def extract_items(body: Any, *candidate_keys: str) -> list[dict[str, Any]]:
    if isinstance(body, list):
        return body
    assert isinstance(body, dict), body
    for key in (*candidate_keys, "items", "data", "results"):
        value = body.get(key)
        if isinstance(value, list):
            return value
    pytest.fail(f"Expected a list response or envelope with items, got: {body}")


def find_item(items: list[dict[str, Any]], item_id: str) -> dict[str, Any]:
    for item in items:
        if str(item.get("id")) == str(item_id):
            return item
    pytest.fail(f"Could not find item id={item_id!r} in {items}")


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def auth_token(client: TestClient) -> str:
    response = client.post(
        "/api/auth/login",
        json={"username": TEST_USERNAME, "password": TEST_PASSWORD},
    )
    assert_status(response, 200)
    body = response_body(response)
    assert isinstance(body.get("access_token"), str) and body["access_token"], body
    assert body.get("token_type") == "bearer", body
    assert_utc_timestamp(body.get("expires_at"))
    return body["access_token"]


@pytest.fixture()
def auth_headers(auth_token: str) -> dict[str, str]:
    return auth_header(auth_token)


@pytest.fixture()
def api_key_headers() -> dict[str, str]:
    return {"X-API-Key": TEST_API_KEY}


@pytest.fixture()
def bearer_api_key_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {TEST_API_KEY}"}


@pytest.fixture()
def unique_name() -> Callable[[str], str]:
    def _unique(prefix: str) -> str:
        return f"{prefix}-{uuid.uuid4().hex[:12]}"

    return _unique


@pytest.fixture()
def unused_tcp_port(free_tcp_port: int) -> int:
    return free_tcp_port


@pytest.fixture()
def project_factory(
    client: TestClient,
    auth_headers: dict[str, str],
    unique_name: Callable[[str], str],
) -> Callable[..., dict[str, Any]]:
    def _create_project(
        *,
        headers: dict[str, str] | None = None,
        name: str | None = None,
        description: str = "Contract test project",
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = {
            "name": name or unique_name("project"),
            "description": description,
            "tags": tags if tags is not None else ["contract", "pytest"],
            "metadata": metadata if metadata is not None else {"suite": "backend"},
        }
        response = client.post(
            "/api/projects", json=payload, headers=headers or auth_headers
        )
        assert_status(response, {200, 201})
        body = response_body(response)
        assert_uuid(body.get("id"))
        assert body["name"] == payload["name"], body
        return body

    return _create_project


@pytest.fixture()
def run_factory(
    client: TestClient,
    auth_headers: dict[str, str],
    project_factory: Callable[..., dict[str, Any]],
    unique_name: Callable[[str], str],
) -> Callable[..., dict[str, Any]]:
    def _create_run(
        *,
        project: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        name: str | None = None,
        params: dict[str, Any] | None = None,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        project = project or project_factory(headers=headers or auth_headers)
        payload = {
            "name": name or unique_name("run"),
            "description": "Contract test run",
            "tags": tags if tags is not None else ["baseline"],
            "params": params if params is not None else {"learning_rate": 0.001},
            "metadata": (
                metadata if metadata is not None else {"hostname": "pytest-worker"}
            ),
        }
        response = client.post(
            f"/api/projects/{project['id']}/runs",
            json=payload,
            headers=headers or auth_headers,
        )
        assert_status(response, {200, 201})
        body = response_body(response)
        assert_uuid(body.get("id"))
        assert str(body.get("project_id")) == str(project["id"]), body
        assert body.get("status") == "created", body
        assert_utc_timestamp(body.get("created_at"))
        return body

    return _create_run
