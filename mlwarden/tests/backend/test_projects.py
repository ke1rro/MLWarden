from typing import Any, Callable

from conftest import (
    assert_error_response,
    assert_status,
    assert_utc_timestamp,
    assert_uuid,
    extract_items,
    find_item,
    response_body,
)
from fastapi.testclient import TestClient


def test_project_crud_hides_soft_deleted_project_by_default(
    client: TestClient,
    auth_headers: dict[str, str],
    project_factory: Callable[..., dict[str, Any]],
    unique_name: Callable[[str], str],
) -> None:
    project = project_factory(
        name=unique_name("crud-project"),
        description="Original description",
        tags=["vision", "baseline"],
        metadata={"owner": "qa", "priority": 2},
    )

    assert_uuid(project["id"])
    assert project["description"] == "Original description"
    assert project["tags"] == ["vision", "baseline"]
    assert project["metadata"]["owner"] == "qa"
    assert_utc_timestamp(project.get("created_at"))

    list_response = client.get("/api/projects", headers=auth_headers)
    assert_status(list_response, 200)
    projects = extract_items(response_body(list_response), "projects")
    listed = find_item(projects, project["id"])
    assert listed["name"] == project["name"]
    assert "run_count" in listed
    assert "running_run_count" in listed
    assert "latest_run_at" in listed

    detail_response = client.get(f"/api/projects/{project['id']}", headers=auth_headers)
    assert_status(detail_response, 200)
    detail = response_body(detail_response)
    assert detail["id"] == project["id"]

    updated_name = unique_name("renamed-project")
    patch_response = client.patch(
        f"/api/projects/{project['id']}",
        json={
            "name": updated_name,
            "description": "Updated description",
            "tags": ["production"],
            "metadata": {"owner": "platform"},
        },
        headers=auth_headers,
    )
    assert_status(patch_response, 200)
    patched = response_body(patch_response)
    assert patched["name"] == updated_name
    assert patched["description"] == "Updated description"
    assert patched["tags"] == ["production"]
    assert patched["metadata"]["owner"] == "platform"
    assert_utc_timestamp(patched.get("updated_at"))

    delete_response = client.delete(f"/api/projects/{project['id']}", headers=auth_headers)
    assert_status(delete_response, {200, 202, 204})

    after_delete_response = client.get("/api/projects", headers=auth_headers)
    assert_status(after_delete_response, 200)
    remaining = extract_items(response_body(after_delete_response), "projects")
    assert all(str(item.get("id")) != str(project["id"]) for item in remaining)


def test_project_names_are_unique(
    client: TestClient,
    auth_headers: dict[str, str],
    project_factory: Callable[..., dict[str, Any]],
    unique_name: Callable[[str], str],
) -> None:
    name = unique_name("unique-project")
    project_factory(name=name)

    duplicate_response = client.post(
        "/api/projects",
        json={"name": name},
        headers=auth_headers,
    )

    assert_error_response(duplicate_response, {400, 409})


def test_project_create_requires_authenticated_request(
    client: TestClient,
    unique_name: Callable[[str], str],
) -> None:
    response = client.post("/api/projects", json={"name": unique_name("private-project")})

    assert_error_response(response, {401, 403})


def test_static_api_key_can_create_project_for_worker_flows(
    client: TestClient,
    api_key_headers: dict[str, str],
    unique_name: Callable[[str], str],
) -> None:
    response = client.post(
        "/api/projects",
        json={"name": unique_name("api-key-project")},
        headers=api_key_headers,
    )

    assert_status(response, {200, 201})
    body = response_body(response)
    assert_uuid(body.get("id"))


def test_project_validation_and_errors(
    client: TestClient,
    auth_headers: dict[str, str],
    project_factory: Callable[..., dict[str, Any]],
    unique_name: Callable[[str], str],
) -> None:
    # Test empty project name creation
    empty_create = client.post("/api/projects", json={"name": "   "}, headers=auth_headers)
    assert_error_response(empty_create, 422)

    # Create two projects to test update duplicate conflict
    p1 = project_factory()
    p2 = project_factory()

    # Test empty project name update
    empty_update = client.patch(
        f"/api/projects/{p1['id']}", json={"name": ""}, headers=auth_headers
    )
    assert_error_response(empty_update, 422)

    # Test updating p1 to p2's name (conflict)
    conflict_update = client.patch(
        f"/api/projects/{p1['id']}", json={"name": p2["name"]}, headers=auth_headers
    )
    assert_error_response(conflict_update, 409)

    # Test delete when disabled by overriding env temporarily via monkeypatch if possible,
    # or let's verify if we can mock settings.allow_project_delete.
    # Since settings is already loaded in core.py, let's temporarily toggle it directly.
    from backend.core import settings

    original_allow = settings.allow_project_delete
    try:
        # We need to bypass frozen dataclass restriction using object.__setattr__
        object.__setattr__(settings, "allow_project_delete", False)
        delete_disabled = client.delete(f"/api/projects/{p1['id']}", headers=auth_headers)
        assert_error_response(delete_disabled, 403)
    finally:
        object.__setattr__(settings, "allow_project_delete", original_allow)
