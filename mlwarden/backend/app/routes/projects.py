import sqlite3
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from ..core import (
    ApiError,
    Principal,
    create_event,
    get_project_or_404,
    new_id,
    project_response,
    require_dict,
    require_list,
    require_principal,
    safe_string,
    settings,
    utc_timestamp,
)
from ..database import (
    insert_project,
    list_project_rows,
    soft_delete_project,
    update_project_row,
)
from ..models import ProjectCreate, ProjectUpdate

router = APIRouter()


@router.get("/api/projects")
async def list_projects(
    _: Principal = Depends(require_principal),
    include_deleted: bool = False,
) -> dict[str, Any]:
    return {
        "items": [
            project_response(project)
            for project in list_project_rows(include_deleted=include_deleted)
        ]
    }


@router.post("/api/projects")
async def create_project(
    body: ProjectCreate,
    _: Principal = Depends(require_principal),
) -> JSONResponse:
    payload = body.model_dump()
    name = safe_string(payload.get("name")).strip()
    if not name:
        raise ApiError(422, "validation_error", "Project name is required")
    now = utc_timestamp()
    project = {
        "id": new_id(),
        "name": name,
        "description": payload.get("description"),
        "tags": require_list(payload.get("tags"), "tags"),
        "metadata": require_dict(payload.get("metadata"), "metadata"),
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
    try:
        insert_project(project)
    except sqlite3.IntegrityError as exc:
        raise ApiError(409, "conflict", "Project name already exists") from exc
    await create_event(
        "project.created", project_id=project["id"], payload={"project_name": name}
    )
    return JSONResponse(status_code=201, content=project_response(project))


@router.get("/api/projects/{project_id}")
async def get_project(
    project_id: str,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    return project_response(get_project_or_404(project_id))


@router.patch("/api/projects/{project_id}")
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    project = get_project_or_404(project_id)
    payload = body.model_dump(exclude_unset=True)
    name = safe_string(payload.get("name", project["name"])).strip()
    if not name:
        raise ApiError(422, "validation_error", "Project name is required")
    updated = {
        **project,
        "name": name,
        "description": payload.get("description", project.get("description")),
        "tags": require_list(payload.get("tags", project.get("tags")), "tags"),
        "metadata": require_dict(
            payload.get("metadata", project.get("metadata")), "metadata"
        ),
        "updated_at": utc_timestamp(),
    }
    try:
        update_project_row(project_id, updated)
    except sqlite3.IntegrityError as exc:
        raise ApiError(409, "conflict", "Project name already exists") from exc
    await create_event(
        "project.updated",
        project_id=project_id,
        payload={"project_name": updated["name"]},
    )
    return project_response(get_project_or_404(project_id))


@router.delete("/api/projects/{project_id}")
async def delete_project(
    project_id: str,
    _: Principal = Depends(require_principal),
) -> JSONResponse:
    if not settings.allow_project_delete:
        raise ApiError(403, "delete_disabled", "Project deletion is disabled")
    project = get_project_or_404(project_id)
    now = utc_timestamp()
    soft_delete_project(project_id, now)
    await create_event(
        "project.deleted",
        project_id=project_id,
        payload={"project_name": project["name"]},
    )
    return JSONResponse(status_code=200, content={"deleted": True, "id": project_id})
