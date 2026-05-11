from typing import Any, Callable

from conftest import (
    assert_status,
    assert_utc_timestamp,
    assert_uuid,
    extract_items,
    response_body,
)
from fastapi.testclient import TestClient


def test_health_and_version_endpoints(client: TestClient) -> None:
    health_response = client.get("/api/health")
    assert_status(health_response, 200)
    health = response_body(health_response)
    assert health["status"] == "ok"
    assert health["database"] == "ok"
    assert health["artifact_storage"] == "ok"

    version_response = client.get("/api/version")
    assert_status(version_response, 200)
    version = response_body(version_response)
    assert isinstance(version.get("version"), str) and version["version"]


def test_recent_events_endpoint_returns_run_events(
    client: TestClient,
    auth_headers: dict[str, str],
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)
    client.post(f"/api/runs/{run['id']}/start", headers=api_key_headers)
    client.post(f"/api/runs/{run['id']}/finish", headers=api_key_headers)

    response = client.get(
        "/api/events/recent", params={"limit": 20}, headers=auth_headers
    )
    assert_status(response, 200)
    events = extract_items(response_body(response), "events")
    matched = [event for event in events if event.get("run_id") == run["id"]]
    assert matched
    assert {"run.started", "run.finished"}.issubset(
        {event["type"] for event in matched}
    )
    assert all("payload" in event for event in matched)
    assert all(assert_utc_timestamp(event["created_at"]) for event in matched)


def test_chart_configuration_crud(
    client: TestClient,
    auth_headers: dict[str, str],
    project_factory: Callable[..., dict[str, Any]],
) -> None:
    project = project_factory()
    create_response = client.post(
        f"/api/projects/{project['id']}/charts",
        json={
            "name": "Loss by step",
            "chart_type": "line",
            "config": {
                "data_source": "metrics",
                "x": {"field": "step"},
                "y": {"metric": "loss"},
                "group_by": "run.name",
                "filters": {},
                "echarts_option_override": {"grid": {"top": 16}},
            },
        },
        headers=auth_headers,
    )
    assert_status(create_response, {200, 201})
    chart = response_body(create_response)
    assert_uuid(chart["id"])
    assert chart["project_id"] == project["id"]
    assert chart["name"] == "Loss by step"
    assert chart["chart_type"] == "line"
    assert chart["config"]["y"]["metric"] == "loss"

    list_response = client.get(
        f"/api/projects/{project['id']}/charts", headers=auth_headers
    )
    assert_status(list_response, 200)
    charts = extract_items(response_body(list_response), "charts")
    assert any(item["id"] == chart["id"] for item in charts)

    detail_response = client.get(f"/api/charts/{chart['id']}", headers=auth_headers)
    assert_status(detail_response, 200)
    assert response_body(detail_response)["id"] == chart["id"]

    patch_response = client.patch(
        f"/api/charts/{chart['id']}",
        json={"name": "Accuracy by step", "chart_type": "scatter"},
        headers=auth_headers,
    )
    assert_status(patch_response, 200)
    patched = response_body(patch_response)
    assert patched["name"] == "Accuracy by step"
    assert patched["chart_type"] == "scatter"
    assert_utc_timestamp(patched["updated_at"])

    delete_response = client.delete(f"/api/charts/{chart['id']}", headers=auth_headers)
    assert_status(delete_response, {200, 202, 204})
