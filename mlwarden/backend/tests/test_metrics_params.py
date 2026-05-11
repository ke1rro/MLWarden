from __future__ import annotations

from typing import Any, Callable

from conftest import (
    assert_error_response,
    assert_status,
    assert_utc_timestamp,
    extract_items,
    response_body,
)
from fastapi.testclient import TestClient


def test_log_single_and_batch_metrics_then_query_series_and_summary(
    client: TestClient,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)

    single_response = client.post(
        f"/api/runs/{run['id']}/metrics",
        json={
            "name": "loss",
            "value": 0.9,
            "step": 1,
            "timestamp": "2026-05-11T10:00:00Z",
            "context": {"split": "train"},
        },
        headers=api_key_headers,
    )
    assert_status(single_response, {200, 201})
    metric = response_body(single_response)
    assert metric["name"] == "loss"
    assert metric["value"] == 0.9
    assert metric["step"] == 1
    assert metric["context"]["split"] == "train"
    assert_utc_timestamp(metric["timestamp"])

    batch_response = client.post(
        f"/api/runs/{run['id']}/metrics/batch",
        json={
            "metrics": [
                {
                    "name": "loss",
                    "value": 0.5,
                    "step": 2,
                    "context": {"split": "train"},
                },
                {"name": "accuracy", "value": 0.7, "step": 1},
                {"name": "accuracy", "value": 0.8, "step": 2},
            ]
        },
        headers=api_key_headers,
    )
    assert_status(batch_response, {200, 201})
    batch = response_body(batch_response)
    assert batch.get("created_count") == 3 or len(extract_items(batch, "metrics")) == 3

    query_response = client.get(
        f"/api/runs/{run['id']}/metrics",
        params={"names": "loss,accuracy"},
        headers=api_key_headers,
    )
    assert_status(query_response, 200)
    series = response_body(query_response)["series"]
    assert [point["step"] for point in series["loss"]] == [1, 2]
    assert [point["value"] for point in series["accuracy"]] == [0.7, 0.8]
    assert all("timestamp" in point for point in series["loss"])

    summary_response = client.get(
        f"/api/runs/{run['id']}/metrics/summary", headers=api_key_headers
    )
    assert_status(summary_response, 200)
    summaries = extract_items(response_body(summary_response), "summaries", "metrics")
    by_name = {summary["name"]: summary for summary in summaries}
    assert by_name["loss"]["latest_value"] == 0.5
    assert by_name["loss"]["latest_step"] == 2
    assert by_name["loss"]["min_value"] == 0.5
    assert by_name["loss"]["max_value"] == 0.9
    assert by_name["loss"]["count"] == 2


def test_metric_value_must_be_numeric(
    client: TestClient,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)

    response = client.post(
        f"/api/runs/{run['id']}/metrics",
        json={"name": "loss", "value": "not-a-number"},
        headers=api_key_headers,
    )

    assert_error_response(response, {400, 422}, code="validation_error")


def test_run_params_can_be_replaced_and_queried(
    client: TestClient,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)

    put_response = client.put(
        f"/api/runs/{run['id']}/params",
        json={
            "params": {
                "learning_rate": 0.001,
                "batch_size": 32,
                "optimizer": "adam",
                "schedule": {"warmup": 100, "decay": "cosine"},
            }
        },
        headers=api_key_headers,
    )
    assert_status(put_response, {200, 201})

    get_response = client.get(f"/api/runs/{run['id']}/params", headers=api_key_headers)
    assert_status(get_response, 200)
    params = response_body(get_response)
    if isinstance(params, dict) and "params" in params:
        params = params["params"]

    assert params["learning_rate"]["value"] == "0.001"
    assert params["learning_rate"]["value_json"] == 0.001
    assert params["batch_size"]["value"] == "32"
    assert params["schedule"]["value_json"] == {"warmup": 100, "decay": "cosine"}
