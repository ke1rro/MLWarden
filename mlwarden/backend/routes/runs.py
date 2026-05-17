from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from ..core import (
    RUN_STATUSES,
    ApiError,
    Principal,
    create_event,
    get_project_or_404,
    get_run_or_404,
    json_loads,
    new_id,
    normalize_limit_offset,
    require_dict,
    require_list,
    require_principal,
    run_response,
    safe_string,
    update_run_status,
    utc_timestamp,
)
from ..database import (
    insert_run,
    list_run_params,
    list_run_rows,
    soft_delete_run,
    update_run_row,
    upsert_run_params,
)
from ..models import ParamsPutRequest, RunCreate, RunFailRequest, RunFinishRequest, RunUpdate

router = APIRouter()


@router.get("/api/projects/{project_id}/runs")
async def list_runs(
    project_id: str,
    status: str | None = None,
    name: str | None = None,
    tags: str | None = None,
    sort: str = "-created_at",
    limit: int = 100,
    offset: int = 0,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    get_project_or_404(project_id)
    limit, offset = normalize_limit_offset(limit, offset)
    runs, total = list_run_rows(
        project_id=project_id,
        status=status,
        name=name,
        sort=sort,
        limit=limit,
        offset=offset,
    )
    if tags:
        wanted = {item.strip() for item in tags.split(",") if item.strip()}
        runs = [run for run in runs if wanted.issubset(set(run.get("tags", [])))]
    return {
        "items": [run_response(run) for run in runs],
        "limit": limit,
        "offset": offset,
        "total": total,
    }


@router.post("/api/projects/{project_id}/runs")
async def create_run(
    project_id: str,
    body: RunCreate,
    _: Principal = Depends(require_principal),
) -> JSONResponse:
    project = get_project_or_404(project_id)
    payload = body.model_dump()
    now = utc_timestamp()
    run = {
        "id": new_id(),
        "project_id": project_id,
        "name": safe_string(payload.get("name"), f"run-{now}"),
        "description": payload.get("description"),
        "status": "created",
        "tags": require_list(payload.get("tags"), "tags"),
        "metadata": require_dict(payload.get("metadata"), "metadata"),
        "summary": {},
        "started_at": None,
        "finished_at": None,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
    insert_run(run)
    params = require_dict(payload.get("params"), "params")
    if params:
        upsert_run_params(run["id"], params)
    await create_event(
        "run.created",
        project_id=project_id,
        run_id=run["id"],
        payload={
            "status": "created",
            "run_name": run["name"],
            "project_name": project["name"],
        },
    )
    return JSONResponse(status_code=201, content=run_response(run))


@router.get("/api/runs/{run_id}")
async def get_run(run_id: str, _: Principal = Depends(require_principal)) -> dict[str, Any]:
    return run_response(get_run_or_404(run_id))


@router.patch("/api/runs/{run_id}")
async def update_run(
    run_id: str,
    body: RunUpdate,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    run = get_run_or_404(run_id)
    payload = body.model_dump(exclude_unset=True)
    status = payload.get("status", run["status"])
    if status not in RUN_STATUSES:
        raise ApiError(422, "validation_error", "Invalid run status")
    updated = {
        **run,
        "name": safe_string(payload.get("name", run["name"])),
        "description": payload.get("description", run.get("description")),
        "status": status,
        "tags": require_list(payload.get("tags", run.get("tags")), "tags"),
        "metadata": require_dict(payload.get("metadata", run.get("metadata")), "metadata"),
        "summary": require_dict(payload.get("summary", run.get("summary")), "summary"),
        "updated_at": utc_timestamp(),
    }
    update_run_row(run_id, updated)
    await create_event(
        "run.updated",
        project_id=run["project_id"],
        run_id=run_id,
        payload={"status": updated["status"], "run_name": updated["name"]},
    )
    return run_response(get_run_or_404(run_id))


@router.delete("/api/runs/{run_id}")
async def delete_run(
    run_id: str,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    run = get_run_or_404(run_id)
    now = utc_timestamp()
    soft_delete_run(run_id, now)
    await create_event(
        "run.deleted",
        project_id=run["project_id"],
        run_id=run_id,
        payload={"run_name": run["name"]},
    )
    return {"id": run_id, "deleted": True}


@router.post("/api/runs/{run_id}/start")
async def start_run(
    run_id: str,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    return await update_run_status(
        run_id,
        "running",
        allowed_from={"created"},
        event_type="run.started",
    )


@router.post("/api/runs/{run_id}/finish")
async def finish_run(
    run_id: str,
    body: RunFinishRequest | None = None,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    return await update_run_status(
        run_id,
        "finished",
        allowed_from={"running"},
        summary=require_dict((body or RunFinishRequest()).summary, "summary"),
        event_type="run.finished",
    )


@router.post("/api/runs/{run_id}/fail")
async def fail_run(
    run_id: str,
    body: RunFailRequest | None = None,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    payload = (body or RunFailRequest()).model_dump(exclude_none=True)
    summary = {
        key: payload[key]
        for key in ("error_message", "error_type", "traceback")
        if key in payload and payload[key] is not None
    }
    return await update_run_status(
        run_id,
        "failed",
        allowed_from={"created", "running"},
        summary=summary,
        event_type="run.failed",
        event_payload=summary,
    )


@router.post("/api/runs/{run_id}/cancel")
async def cancel_run(
    run_id: str,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    return await update_run_status(
        run_id,
        "cancelled",
        allowed_from={"created", "running"},
        event_type="run.cancelled",
    )


@router.put("/api/runs/{run_id}/params")
async def put_params(
    run_id: str,
    body: ParamsPutRequest,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    get_run_or_404(run_id)
    params = require_dict(body.params, "params")
    upsert_run_params(run_id, params)
    return await get_params(run_id)


@router.get("/api/runs/{run_id}/params")
async def get_params(
    run_id: str,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    get_run_or_404(run_id)
    rows = list_run_params(run_id)
    params = {
        row["key"]: {
            "value": row["value"],
            "value_json": json_loads(row.get("value_json"), None),
            "created_at": row["created_at"],
        }
        for row in rows
    }
    return {"params": params}
