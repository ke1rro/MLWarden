from __future__ import annotations

from typing import Any, Callable

from conftest import PNG_1X1, assert_error_response, assert_status, response_body
from fastapi.testclient import TestClient


def test_bearer_static_api_key_is_accepted_for_worker_endpoints(
    client: TestClient,
    bearer_api_key_headers: dict[str, str],
    unique_name: Callable[[str], str],
) -> None:
    response = client.post(
        "/api/projects",
        json={"name": unique_name("bearer-api-key-project")},
        headers=bearer_api_key_headers,
    )

    assert_status(response, {200, 201})
    assert response_body(response)["name"].startswith("bearer-api-key-project")


def test_artifact_download_requires_authentication(
    client: TestClient,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)
    upload_response = client.post(
        f"/api/runs/{run['id']}/artifacts",
        files={"file": ("model.bin", b"model", "application/octet-stream")},
        headers=api_key_headers,
    )
    assert_status(upload_response, {200, 201})
    artifact_id = response_body(upload_response)["id"]

    response = client.get(f"/api/artifacts/{artifact_id}/download")

    assert_error_response(response, {401, 403})


def test_image_metadata_must_be_json_object(
    client: TestClient,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)
    response = client.post(
        f"/api/runs/{run['id']}/images",
        data={"name": "bad-metadata", "metadata": '["not", "object"]'},
        files={"file": ("sample.png", PNG_1X1, "image/png")},
        headers=api_key_headers,
    )

    assert_error_response(response, {400, 422}, code="validation_error")


def test_created_run_cannot_finish_without_start(
    client: TestClient,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)
    response = client.post(
        f"/api/runs/{run['id']}/finish", json={}, headers=api_key_headers
    )

    assert_error_response(response, {400, 409}, code="invalid_run_status_transition")
