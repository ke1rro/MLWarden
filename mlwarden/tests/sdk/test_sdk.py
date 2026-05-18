import importlib
import sys
import threading
import time
from pathlib import Path
from typing import Any

import httpx
import pytest
import uvicorn
from fastapi import FastAPI, HTTPException, Request

TEST_API_KEY = "dev-api-key"

SDK_ROOT = Path(__file__).resolve().parents[2] / "sdk"
if str(SDK_ROOT) not in sys.path:
    sys.path.insert(0, str(SDK_ROOT))


@pytest.fixture()
def sdk_mock_server(free_tcp_port: int) -> tuple[str, list[dict[str, Any]]]:
    app = FastAPI()
    calls: list[dict[str, Any]] = []
    project = {"id": "project-sdk", "name": "sdk-project"}
    run = {"id": "run-sdk", "project_id": project["id"], "name": "baseline-resnet"}

    def require_auth(request: Request) -> str:
        authorization = request.headers.get("authorization")
        api_key = request.headers.get("x-api-key")
        if authorization == f"Bearer {TEST_API_KEY}":
            return authorization
        if api_key == TEST_API_KEY:
            return f"X-API-Key {api_key}"
        raise HTTPException(status_code=401, detail="missing or invalid worker credentials")

    async def json_body(request: Request) -> dict[str, Any]:
        if request.headers.get("content-type", "").startswith("application/json"):
            return await request.json()
        return {}

    @app.get("/__ready")
    async def ready() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/projects")
    async def list_projects(request: Request, name: str | None = None) -> dict[str, Any]:
        auth = require_auth(request)
        calls.append({"name": "list_projects", "auth": auth, "query_name": name})
        items = [project] if name in {None, project["name"]} else []
        return {"items": items}

    @app.post("/api/projects")
    async def create_project(request: Request) -> dict[str, Any]:
        auth = require_auth(request)
        body = await json_body(request)
        calls.append({"name": "create_project", "auth": auth, "body": body})
        return project

    @app.post("/api/projects/{project_id}/runs")
    async def create_run(project_id: str, request: Request) -> dict[str, Any]:
        auth = require_auth(request)
        body = await json_body(request)
        calls.append({"name": "create_run", "auth": auth, "project_id": project_id, "body": body})
        return {**run, "status": "created", "created_at": "2026-05-11T10:00:00Z"}

    @app.post("/api/runs/{run_id}/start")
    async def start_run(run_id: str, request: Request) -> dict[str, Any]:
        auth = require_auth(request)
        calls.append({"name": "start_run", "auth": auth, "run_id": run_id})
        return {**run, "status": "running"}

    @app.post("/api/runs/{run_id}/finish")
    async def finish_run(run_id: str, request: Request) -> dict[str, Any]:
        auth = require_auth(request)
        body = await json_body(request)
        calls.append({"name": "finish_run", "auth": auth, "run_id": run_id, "body": body})
        return {**run, "status": "finished"}

    @app.post("/api/runs/{run_id}/fail")
    async def fail_run(run_id: str, request: Request) -> dict[str, Any]:
        auth = require_auth(request)
        body = await json_body(request)
        calls.append({"name": "fail_run", "auth": auth, "run_id": run_id, "body": body})
        return {**run, "status": "failed"}

    @app.put("/api/runs/{run_id}/params")
    async def put_params(run_id: str, request: Request) -> dict[str, Any]:
        auth = require_auth(request)
        body = await json_body(request)
        calls.append({"name": "put_params", "auth": auth, "run_id": run_id, "body": body})
        return {"params": body.get("params", body)}

    @app.post("/api/runs/{run_id}/metrics")
    async def log_metric(run_id: str, request: Request) -> dict[str, Any]:
        auth = require_auth(request)
        body = await json_body(request)
        calls.append({"name": "log_metric", "auth": auth, "run_id": run_id, "body": body})
        return body

    @app.post("/api/runs/{run_id}/logs")
    async def append_log(run_id: str, request: Request) -> dict[str, Any]:
        auth = require_auth(request)
        body = await json_body(request)
        calls.append({"name": "append_log", "auth": auth, "run_id": run_id, "body": body})
        return body

    @app.post("/api/projects/{project_id}/charts")
    async def create_chart(project_id: str, request: Request) -> dict[str, Any]:
        auth = require_auth(request)
        body = await json_body(request)
        calls.append({"name": "create_chart", "auth": auth, "project_id": project_id, "body": body})
        return {
            "id": "chart-sdk",
            "project_id": project_id,
            "name": body["name"],
            "chart_type": body["chart_type"],
            "config": body.get("config") or {},
        }

    base_url = f"http://127.0.0.1:{free_tcp_port}"
    config = uvicorn.Config(
        app,
        host="127.0.0.1",
        port=free_tcp_port,
        log_level="warning",
        lifespan="off",
        ws="websockets-sansio",
    )
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    deadline = time.monotonic() + 5.0
    while time.monotonic() < deadline:
        try:
            response = httpx.get(f"{base_url}/__ready", timeout=0.2)
            if response.status_code == 200:
                break
        except httpx.HTTPError:
            time.sleep(0.05)
    else:
        server.should_exit = True
        pytest.fail("SDK mock FastAPI server did not start in time")

    yield base_url, calls

    server.should_exit = True
    thread.join(timeout=5)


@pytest.mark.sdk
def test_tracker_run_context_manager_happy_path(
    sdk_mock_server: tuple[str, list[dict[str, Any]]],
) -> None:
    base_url, calls = sdk_mock_server
    try:
        Tracker = importlib.import_module("mlwarden").Tracker
    except (ImportError, AttributeError) as exc:
        pytest.fail(
            "Expected a mlwarden.Tracker SDK exposing the worker API context manager. "
            f"Import failed with: {exc!r}"
        )

    tracker = Tracker(base_url=base_url, api_key=TEST_API_KEY, project="sdk-project")
    with tracker.run(name="baseline-resnet", params={"learning_rate": 0.001}) as run:
        run.log_params({"batch_size": 32})
        run.log_metric("loss", 0.5, step=1, context={"split": "train"})
        run.log_log("Epoch 1 completed", level="info", context={"epoch": 1})

    call_names = [call["name"] for call in calls]
    assert "create_run" in call_names
    assert "start_run" in call_names
    assert "put_params" in call_names
    assert "log_metric" in call_names
    assert "append_log" in call_names
    assert call_names[-1] == "finish_run"
    assert "fail_run" not in call_names

    metric_call = next(call for call in calls if call["name"] == "log_metric")
    assert metric_call["run_id"] == "run-sdk"
    assert metric_call["body"] == {
        "name": "loss",
        "value": 0.5,
        "step": 1,
        "context": {"split": "train"},
    }


@pytest.mark.sdk
def test_tracker_run_context_manager_reports_failure(
    sdk_mock_server: tuple[str, list[dict[str, Any]]],
) -> None:
    base_url, calls = sdk_mock_server
    Tracker = importlib.import_module("mlwarden").Tracker

    tracker = Tracker(base_url=base_url, api_key=TEST_API_KEY, project="sdk-project")
    with pytest.raises(ValueError):
        with tracker.run(name="failing-run") as run:
            run.log_metric("loss", 1.0, step=0)
            raise ValueError("training failed")

    call_names = [call["name"] for call in calls]
    assert "fail_run" in call_names
    assert "finish_run" not in call_names
    fail_call = next(call for call in calls if call["name"] == "fail_run")
    assert fail_call["run_id"] == "run-sdk"
    assert fail_call["body"]["error_message"] == "training failed"
    assert fail_call["body"]["error_type"] == "ValueError"
    assert "ValueError: training failed" in fail_call["body"]["traceback"]


@pytest.mark.sdk
def test_tracker_uses_environment_aliases(monkeypatch: pytest.MonkeyPatch) -> None:
    Tracker = importlib.import_module("mlwarden").Tracker

    monkeypatch.setenv("MLWARDEN_BASE_URL", "http://env-base-url")
    monkeypatch.setenv("MLWARDEN_URL", "http://legacy-url")
    monkeypatch.setenv("MLWARDEN_TOKEN", "env-token")
    monkeypatch.setenv("MLWARDEN_API_KEY", "legacy-key")

    tracker = Tracker()

    assert tracker.base_url == "http://env-base-url"
    assert tracker.api_key == "env-token"


@pytest.mark.sdk
def test_run_create_chart_uses_project_chart_endpoint(
    sdk_mock_server: tuple[str, list[dict[str, Any]]],
) -> None:
    base_url, calls = sdk_mock_server
    Tracker = importlib.import_module("mlwarden").Tracker

    tracker = Tracker(base_url=base_url, api_key=TEST_API_KEY, project="sdk-project")
    run = tracker.create_run(project={"id": "project-sdk", "name": "sdk-project"})
    chart = run.create_chart(
        "Accuracy over epochs",
        config={
            "source": "metrics",
            "runId": run.id,
            "metric": "val_accuracy",
            "xAxis": "step",
            "yAxis": "val_accuracy",
        },
    )

    assert chart["id"] == "chart-sdk"
    assert chart["project_id"] == "project-sdk"
    assert chart["name"] == "Accuracy over epochs"
    chart_call = next(call for call in calls if call["name"] == "create_chart")
    assert chart_call["project_id"] == "project-sdk"
    assert chart_call["body"] == {
        "name": "Accuracy over epochs",
        "chart_type": "line",
        "config": {
            "source": "metrics",
            "runId": "run-sdk",
            "metric": "val_accuracy",
            "xAxis": "step",
            "yAxis": "val_accuracy",
        },
    }
