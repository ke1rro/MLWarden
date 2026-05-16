from typing import Any, Callable

from conftest import assert_status, assert_uuid, extract_items, response_body
from fastapi.testclient import TestClient


def log_metric(
    client: TestClient,
    run_id: str,
    headers: dict[str, str],
    name: str,
    value: float,
    step: int,
) -> None:
    response = client.post(
        f"/api/runs/{run_id}/metrics",
        json={"name": name, "value": value, "step": step},
        headers=headers,
    )
    assert_status(response, {200, 201})


def test_compare_runs_and_saved_comparison_crud(
    client: TestClient,
    auth_headers: dict[str, str],
    project_factory: Callable[..., dict[str, Any]],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    project = project_factory()
    baseline = run_factory(project=project, name="baseline")
    challenger = run_factory(project=project, name="challenger")

    for step, value in [(1, 25.0), (2, 27.0)]:
        log_metric(client, baseline["id"], auth_headers, "val.psnr", value, step)
    for step, value in [(1, 26.0), (2, 31.0)]:
        log_metric(client, challenger["id"], auth_headers, "val.psnr", value, step)
    log_metric(client, baseline["id"], auth_headers, "train.loss", 0.8, 1)
    log_metric(client, challenger["id"], auth_headers, "train.loss", 0.6, 1)

    compare_response = client.post(
        f"/api/projects/{project['id']}/runs/compare",
        json={
            "run_ids": [baseline["id"], challenger["id"]],
            "metrics": ["val.psnr", "train.loss"],
            "x_axis": "step",
            "smoothing": 0,
            "aggregation": "none",
        },
        headers=auth_headers,
    )
    assert_status(compare_response, 200)
    comparison_data = response_body(compare_response)
    assert comparison_data["project_id"] == project["id"]
    assert len(comparison_data["runs"]) == 2
    assert comparison_data["summary"]["best_run_id"] == challenger["id"]
    assert comparison_data["summary"]["best_value"] == 31.0
    assert comparison_data["metric_schema"][0]["metric_name"] == "val.psnr"

    create_response = client.post(
        f"/api/projects/{project['id']}/run-comparisons",
        json={
            "name": "PSNR comparison",
            "run_ids": [baseline["id"], challenger["id"]],
            "primary_metric": "val.psnr",
            "x_axis": "step",
            "chart_settings": {"metrics": ["val.psnr"], "showLegend": True},
        },
        headers=auth_headers,
    )
    assert_status(create_response, {200, 201})
    saved = response_body(create_response)
    assert_uuid(saved["id"])
    assert saved["run_ids"] == [baseline["id"], challenger["id"]]

    list_response = client.get(
        f"/api/projects/{project['id']}/run-comparisons",
        headers=auth_headers,
    )
    assert_status(list_response, 200)
    assert any(item["id"] == saved["id"] for item in extract_items(response_body(list_response)))

    patch_response = client.patch(
        f"/api/projects/{project['id']}/run-comparisons/{saved['id']}",
        json={"name": "Updated comparison", "chart_settings": {"metrics": ["train.loss"]}},
        headers=auth_headers,
    )
    assert_status(patch_response, 200)
    assert response_body(patch_response)["name"] == "Updated comparison"

    delete_response = client.delete(
        f"/api/projects/{project['id']}/run-comparisons/{saved['id']}",
        headers=auth_headers,
    )
    assert_status(delete_response, 200)
