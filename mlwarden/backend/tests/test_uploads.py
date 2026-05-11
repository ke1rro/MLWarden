from __future__ import annotations

import json
from typing import Any, Callable

from conftest import (
    PNG_1X1,
    assert_error_response,
    assert_status,
    assert_utc_timestamp,
    assert_uuid,
    extract_items,
    response_body,
)
from fastapi.testclient import TestClient


def test_image_upload_lists_metadata_and_serves_file(
    client: TestClient,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)

    upload_response = client.post(
        f"/api/runs/{run['id']}/images",
        data={
            "name": "segmentation-preview",
            "step": "7",
            "caption": "Mask overlay",
            "metadata": json.dumps({"split": "validation"}),
        },
        files={"file": ("../unsafe-name.png", PNG_1X1, "image/png")},
        headers=api_key_headers,
    )
    assert_status(upload_response, {200, 201})
    image = response_body(upload_response)
    assert_uuid(image["id"])
    assert image["run_id"] == run["id"]
    assert image["name"] == "segmentation-preview"
    assert image["original_filename"] == "../unsafe-name.png"
    assert image["content_type"] == "image/png"
    assert image["size_bytes"] == len(PNG_1X1)
    assert image["step"] == 7
    assert image["caption"] == "Mask overlay"
    assert image["metadata"]["split"] == "validation"
    assert ".." not in image.get("storage_path", "")
    assert_utc_timestamp(image["created_at"])

    list_response = client.get(f"/api/runs/{run['id']}/images", headers=api_key_headers)
    assert_status(list_response, 200)
    images = extract_items(response_body(list_response), "images")
    assert any(item["id"] == image["id"] for item in images)

    detail_response = client.get(f"/api/images/{image['id']}", headers=api_key_headers)
    assert_status(detail_response, 200)
    assert response_body(detail_response)["id"] == image["id"]

    file_response = client.get(
        f"/api/images/{image['id']}/file", headers=api_key_headers
    )
    assert_status(file_response, 200)
    assert file_response.content == PNG_1X1
    assert file_response.headers["content-type"].startswith("image/png")


def test_image_upload_rejects_unsupported_content_type(
    client: TestClient,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)

    response = client.post(
        f"/api/runs/{run['id']}/images",
        data={"name": "not-an-image"},
        files={"file": ("not-image.txt", b"hello", "text/plain")},
        headers=api_key_headers,
    )

    assert_error_response(response, {400, 415, 422})


def test_image_upload_rejects_invalid_metadata_json(
    client: TestClient,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)

    response = client.post(
        f"/api/runs/{run['id']}/images",
        data={"name": "bad-metadata", "metadata": "{not-json"},
        files={"file": ("sample.png", PNG_1X1, "image/png")},
        headers=api_key_headers,
    )

    assert_error_response(response, {400, 422}, code="validation_error")


def test_artifact_upload_lists_metadata_and_downloads_bytes(
    client: TestClient,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)
    artifact_content = b"model-bytes"

    upload_response = client.post(
        f"/api/runs/{run['id']}/artifacts",
        data={
            "name": "weights",
            "artifact_path": "checkpoints/model.pt",
            "metadata": json.dumps({"epoch": 3}),
        },
        files={"file": ("../model.pt", artifact_content, "application/octet-stream")},
        headers=api_key_headers,
    )
    assert_status(upload_response, {200, 201})
    artifact = response_body(upload_response)
    assert_uuid(artifact["id"])
    assert artifact["run_id"] == run["id"]
    assert artifact["name"] == "weights"
    assert artifact["artifact_path"] == "checkpoints/model.pt"
    assert artifact["original_filename"] == "../model.pt"
    assert artifact["content_type"] == "application/octet-stream"
    assert artifact["size_bytes"] == len(artifact_content)
    assert artifact["metadata"]["epoch"] == 3
    assert ".." not in artifact.get("storage_path", "")
    assert_utc_timestamp(artifact["created_at"])

    list_response = client.get(
        f"/api/runs/{run['id']}/artifacts", headers=api_key_headers
    )
    assert_status(list_response, 200)
    artifacts = extract_items(response_body(list_response), "artifacts")
    assert any(item["id"] == artifact["id"] for item in artifacts)

    detail_response = client.get(
        f"/api/artifacts/{artifact['id']}", headers=api_key_headers
    )
    assert_status(detail_response, 200)
    assert response_body(detail_response)["id"] == artifact["id"]

    download_response = client.get(
        f"/api/artifacts/{artifact['id']}/download", headers=api_key_headers
    )
    assert_status(download_response, 200)
    assert download_response.content == artifact_content


def test_artifact_upload_rejects_path_traversal(
    client: TestClient,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)

    response = client.post(
        f"/api/runs/{run['id']}/artifacts",
        data={"artifact_path": "../../etc/passwd"},
        files={"file": ("payload.bin", b"payload", "application/octet-stream")},
        headers=api_key_headers,
    )

    assert_error_response(response, {400, 422})


def test_artifact_upload_respects_configured_size_limit(
    client: TestClient,
    api_key_headers: dict[str, str],
    run_factory: Callable[..., dict[str, Any]],
) -> None:
    run = run_factory(headers=api_key_headers)
    too_large = b"x" * (1024 * 1024 + 1)

    response = client.post(
        f"/api/runs/{run['id']}/artifacts",
        files={"file": ("too-large.bin", too_large, "application/octet-stream")},
        headers=api_key_headers,
    )

    assert_error_response(response, {400, 413})
