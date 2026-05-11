from __future__ import annotations

from typing import Any, Callable

from conftest import (
    assert_error_response,
    assert_status,
    assert_utc_timestamp,
    assert_uuid,
    extract_items,
    response_body,
)
from fastapi.testclient import TestClient


def test_create_run_and_fetch_detail(
    client: TestClient,
    auth_headers: dict[str, str],
    project_factory: Callable[..., dict[str, Any]],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    project = project_factory()
    run = run_factory(
        project=project,
        params={"learning_rate": 0.001, "batch_size": 32},
        tags=["baseline", "resnet"],
        metadata={"git_commit": "abc123", "hostname": "worker-1"},
    )

    detail_response = client.get(f"/api/runs/{run['id']}", headers=auth_headers)
    assert_status(detail_response, 200)
    detail = response_body(detail_response)
    assert_uuid(detail["id"])
    assert detail["project_id"] == project["id"]
    assert detail["status"] == "created"
    assert detail["tags"] == ["baseline", "resnet"]
    assert detail["metadata"]["git_commit"] == "abc123"
    assert_utc_timestamp(detail["created_at"])


def test_run_lifecycle_start_finish_and_events(
    client: TestClient,
    api_key_headers: dict[str, str],
    auth_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)

    start_response = client.post(
        f"/api/runs/{run['id']}/start", headers=api_key_headers
    )
    assert_status(start_response, 200)
    started = response_body(start_response)
    assert started["status"] == "running"
    assert_utc_timestamp(started["started_at"])

    finish_response = client.post(
        f"/api/runs/{run['id']}/finish",
        json={"summary": {"best_accuracy": 0.94, "final_loss": 0.21}},
        headers=api_key_headers,
    )
    assert_status(finish_response, 200)
    finished = response_body(finish_response)
    assert finished["status"] == "finished"
    assert finished["summary"]["best_accuracy"] == 0.94
    assert_utc_timestamp(finished["finished_at"])

    events_response = client.get(f"/api/runs/{run['id']}/events", headers=auth_headers)
    assert_status(events_response, 200)
    events = extract_items(response_body(events_response), "events")
    event_types = {event["type"] for event in events}
    assert {"run.created", "run.started", "run.finished"}.issubset(event_types)


def test_run_fail_records_error_payload(
    client: TestClient,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)
    client.post(f"/api/runs/{run['id']}/start", headers=api_key_headers)

    response = client.post(
        f"/api/runs/{run['id']}/fail",
        json={
            "error_message": "Out of memory",
            "error_type": "RuntimeError",
            "traceback": "Traceback text",
        },
        headers=api_key_headers,
    )

    assert_status(response, 200)
    body = response_body(response)
    assert body["status"] == "failed"
    assert body["summary"]["error_message"] == "Out of memory"
    assert body["summary"]["error_type"] == "RuntimeError"
    assert_utc_timestamp(body["finished_at"])


def test_authenticated_user_can_cancel_created_run(
    client: TestClient,
    auth_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory()

    response = client.post(f"/api/runs/{run['id']}/cancel", headers=auth_headers)

    assert_status(response, 200)
    body = response_body(response)
    assert body["status"] == "cancelled"
    assert_utc_timestamp(body["finished_at"])


def test_terminal_run_cannot_transition_without_resume_endpoint(
    client: TestClient,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)
    client.post(f"/api/runs/{run['id']}/start", headers=api_key_headers)
    client.post(f"/api/runs/{run['id']}/finish", headers=api_key_headers)

    response = client.post(
        f"/api/runs/{run['id']}/fail", json={}, headers=api_key_headers
    )

    assert_error_response(response, {400, 409})


def test_list_runs_supports_status_name_tag_and_sort_filters(
    client: TestClient,
    auth_headers: dict[str, str],
    project_factory: Callable[..., dict[str, Any]],
    run_factory: Callable[..., dict[str, Any]],
    unique_name: Callable[[str], str],
) -> None:
    project = project_factory()
    matching_name = unique_name("filter-match")
    running_run = run_factory(
        project=project, name=matching_name, tags=["nightly", "gpu"]
    )
    run_factory(project=project, name=unique_name("filter-other"), tags=["daily"])
    client.post(f"/api/runs/{running_run['id']}/start", headers=auth_headers)

    response = client.get(
        f"/api/projects/{project['id']}/runs",
        params={
            "status": "running",
            "name": "filter-match",
            "tags": "nightly",
            "sort": "-created_at",
        },
        headers=auth_headers,
    )

    assert_status(response, 200)
    runs = extract_items(response_body(response), "runs")
    assert runs, "Expected the running run to be returned"
    assert all(run["status"] == "running" for run in runs)
    assert any(run["id"] == running_run["id"] for run in runs)
