from typing import Any, Callable

from conftest import (
    assert_error_response,
    assert_status,
    assert_utc_timestamp,
    extract_items,
    response_body,
)
from fastapi.testclient import TestClient


def test_create_replace_table_append_rows_and_query_with_pagination(
    client: TestClient,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)
    table_name = "validation_results"

    replace_response = client.put(
        f"/api/runs/{run['id']}/tables/{table_name}",
        json={
            "columns": [
                {"name": "image_id", "type": "string"},
                {"name": "score", "type": "number"},
                {"name": "label", "type": "string"},
            ],
            "rows": [{"image_id": "img001", "score": 0.94, "label": "cat"}],
            "metadata": {"split": "validation"},
        },
        headers=api_key_headers,
    )
    assert_status(replace_response, {200, 201})
    table = response_body(replace_response)
    assert table["name"] == table_name
    assert table["metadata"]["split"] == "validation"
    assert_utc_timestamp(table["created_at"])

    append_response = client.post(
        f"/api/runs/{run['id']}/tables/{table_name}/rows",
        json={
            "rows": [
                {"image_id": "img002", "score": 0.87, "label": "dog"},
                {"image_id": "img003", "score": 0.91, "label": "cat"},
            ]
        },
        headers=api_key_headers,
    )
    assert_status(append_response, {200, 201})

    list_response = client.get(f"/api/runs/{run['id']}/tables", headers=api_key_headers)
    assert_status(list_response, 200)
    tables = extract_items(response_body(list_response), "tables")
    assert any(item["name"] == table_name for item in tables)

    page_response = client.get(
        f"/api/runs/{run['id']}/tables/{table_name}",
        params={"limit": 2, "offset": 1},
        headers=api_key_headers,
    )
    assert_status(page_response, 200)
    page = response_body(page_response)
    rows = extract_items(page, "rows")
    assert page.get("limit") == 2
    assert page.get("offset") == 1
    assert page.get("total") == 3
    assert [row["data"]["image_id"] if "data" in row else row["image_id"] for row in rows] == [
        "img002",
        "img003",
    ]


def test_logs_append_and_query_support_level_and_text_filters(
    client: TestClient,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)

    info_response = client.post(
        f"/api/runs/{run['id']}/logs",
        json={
            "level": "info",
            "message": "Epoch 1 completed",
            "timestamp": "2026-05-11T10:02:00Z",
            "context": {"epoch": 1},
        },
        headers=api_key_headers,
    )
    assert_status(info_response, {200, 201})
    info = response_body(info_response)
    assert info["level"] == "info"
    assert info["message"] == "Epoch 1 completed"
    assert info["context"]["epoch"] == 1
    assert_utc_timestamp(info["timestamp"])

    client.post(
        f"/api/runs/{run['id']}/logs",
        json={"level": "warning", "message": "Validation plateau detected"},
        headers=api_key_headers,
    )

    query_response = client.get(
        f"/api/runs/{run['id']}/logs",
        params={"level": "warning", "search": "plateau", "limit": 50, "offset": 0},
        headers=api_key_headers,
    )
    assert_status(query_response, 200)
    body = response_body(query_response)
    logs = extract_items(body, "logs")
    assert body.get("limit") == 50
    assert body.get("offset") == 0
    assert len(logs) == 1
    assert logs[0]["level"] == "warning"
    assert "plateau" in logs[0]["message"]


def test_logs_validation_edge_cases(
    client: TestClient,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)

    # Test empty log message validation
    empty_log = client.post(
        f"/api/runs/{run['id']}/logs",
        json={"message": "   "},
        headers=api_key_headers,
    )
    assert_error_response(empty_log, 422)
