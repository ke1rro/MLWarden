from __future__ import annotations

from conftest import (
    TEST_PASSWORD,
    TEST_USERNAME,
    assert_error_response,
    assert_status,
    assert_utc_timestamp,
    response_body,
)
from fastapi.testclient import TestClient


def test_login_returns_bearer_token_and_me_accepts_it(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"username": TEST_USERNAME, "password": TEST_PASSWORD},
    )

    assert_status(response, 200)
    body = response_body(response)
    assert isinstance(body.get("access_token"), str) and body["access_token"]
    assert body.get("token_type") == "bearer"
    assert_utc_timestamp(body.get("expires_at"))

    me_response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert_status(me_response, 200)
    me = response_body(me_response)
    assert me.get("username") == TEST_USERNAME


def test_login_rejects_invalid_password_with_contract_error(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"username": TEST_USERNAME, "password": "definitely-wrong"},
    )

    body = assert_error_response(response, {400, 401})
    assert "access_token" not in body


def test_protected_endpoint_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/auth/me")

    assert_error_response(response, {401, 403})


def test_malformed_bearer_token_is_rejected(client: TestClient) -> None:
    response = client.get(
        "/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
    )

    assert_error_response(response, {401, 403})
