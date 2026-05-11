from __future__ import annotations

import queue
import threading
import time
from typing import Any, Callable

import pytest
from conftest import assert_status, assert_utc_timestamp, response_body
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect


def _receive_until_type(
    websocket: Any, expected_type: str, timeout: float = 3.0
) -> dict[str, Any]:
    messages: "queue.Queue[tuple[str, Any]]" = queue.Queue()
    stop = threading.Event()

    def reader() -> None:
        while not stop.is_set():
            try:
                message = websocket.receive_json()
            except Exception as exc:  # pragma: no cover - failure is surfaced below.
                messages.put(("error", exc))
                return
            messages.put(("message", message))
            if isinstance(message, dict) and message.get("type") == expected_type:
                return

    thread = threading.Thread(target=reader, daemon=True)
    thread.start()

    seen: list[Any] = []
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        remaining = max(0.01, deadline - time.monotonic())
        try:
            kind, payload = messages.get(timeout=remaining)
        except queue.Empty:
            break
        if kind == "error":
            pytest.fail(
                f"WebSocket receive failed while waiting for {expected_type!r}: {payload!r}"
            )
        seen.append(payload)
        if isinstance(payload, dict) and payload.get("type") == expected_type:
            stop.set()
            return payload

    stop.set()
    pytest.fail(
        f"Timed out waiting for WebSocket event {expected_type!r}. Seen: {seen}"
    )


@pytest.mark.websocket
def test_websocket_requires_token(client: TestClient) -> None:
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect("/api/ws"):
            pass

    assert exc.value.code in {1008, 4401, 4403}


@pytest.mark.websocket
def test_metric_log_broadcasts_websocket_event(
    client: TestClient,
    auth_token: str,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)

    with client.websocket_connect(
        f"/api/ws?token={auth_token}&run_id={run['id']}"
    ) as websocket:
        response = client.post(
            f"/api/runs/{run['id']}/metrics",
            json={"name": "loss", "value": 0.42, "step": 12},
            headers=api_key_headers,
        )
        assert_status(response, {200, 201})

        message = _receive_until_type(websocket, "metric.logged")

    assert message["type"] == "metric.logged"
    assert message["run_id"] == run["id"]
    assert message["project_id"] == run["project_id"]
    assert_utc_timestamp(message["timestamp"])
    assert message["payload"]["metric_name"] == "loss"
    assert message["payload"]["value"] == 0.42
    assert message["payload"]["step"] == 12


@pytest.mark.websocket
def test_run_completion_broadcasts_notification_event(
    client: TestClient,
    auth_token: str,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)
    client.post(f"/api/runs/{run['id']}/start", headers=api_key_headers)

    with client.websocket_connect(f"/api/ws?token={auth_token}") as websocket:
        response = client.post(
            f"/api/runs/{run['id']}/finish",
            json={"summary": {"final_loss": 0.1}},
            headers=api_key_headers,
        )
        assert_status(response, 200)
        finished = response_body(response)
        assert finished["status"] == "finished"

        message = _receive_until_type(websocket, "run.finished")

    assert message["type"] == "run.finished"
    assert message["run_id"] == run["id"]
    assert message["project_id"] == run["project_id"]
    assert_utc_timestamp(message["timestamp"])
    assert message["payload"]["status"] == "finished"
    assert "run_name" in message["payload"]
