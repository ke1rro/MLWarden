from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from ..core import (
    ApiError,
    Principal,
    get_project_or_404,
    get_run_or_404,
    new_id,
    normalize_limit_offset,
    require_dict,
    require_principal,
    safe_string,
    utc_timestamp,
)
from ..database import (
    chart_rows,
    delete_chart_row,
    get_chart_row,
    insert_chart,
    list_run_event_rows,
    recent_event_rows,
    update_chart_row,
)
from ..models import ChartCreate, ChartUpdate

router = APIRouter()


@router.get("/api/runs/{run_id}/events")
async def list_run_events(
    run_id: str,
    limit: int = 100,
    offset: int = 0,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    get_run_or_404(run_id)
    limit, offset = normalize_limit_offset(limit, offset)
    rows, total = list_run_event_rows(run_id, limit=limit, offset=offset)
    return {
        "items": rows,
        "limit": limit,
        "offset": offset,
        "total": total,
    }


@router.get("/api/events/recent")
async def recent_events(
    limit: int = 100,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    limit, _ = normalize_limit_offset(limit, 0)
    return {"items": recent_event_rows(limit), "limit": limit, "offset": 0}


@router.get("/api/projects/{project_id}/charts")
async def list_charts(
    project_id: str,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    get_project_or_404(project_id)
    return {"items": chart_rows(project_id)}


@router.post("/api/projects/{project_id}/charts")
async def create_chart(
    project_id: str,
    body: ChartCreate,
    principal: Principal = Depends(require_principal),
) -> JSONResponse:
    get_project_or_404(project_id)
    payload = body.model_dump()
    name = safe_string(payload.get("name")).strip()
    chart_type = safe_string(payload.get("chart_type")).strip()
    if not name or not chart_type:
        raise ApiError(
            422, "validation_error", "Chart name and chart_type are required"
        )
    now = utc_timestamp()
    chart = {
        "id": new_id(),
        "project_id": project_id,
        "name": name,
        "chart_type": chart_type,
        "config": require_dict(payload.get("config"), "config"),
        "created_by": principal.username if principal.kind == "user" else None,
        "created_at": now,
        "updated_at": now,
    }
    insert_chart(chart)
    return JSONResponse(status_code=201, content=chart)


@router.get("/api/charts/{chart_id}")
async def get_chart(
    chart_id: str, _: Principal = Depends(require_principal)
) -> dict[str, Any]:
    chart = get_chart_row(chart_id)
    if not chart:
        raise ApiError(404, "not_found", "Chart configuration not found")
    return chart


@router.patch("/api/charts/{chart_id}")
async def update_chart(
    chart_id: str,
    body: ChartUpdate,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    chart = await get_chart(chart_id)
    payload = body.model_dump(exclude_unset=True)
    updated = {
        **chart,
        "name": safe_string(payload.get("name", chart["name"])),
        "chart_type": safe_string(payload.get("chart_type", chart["chart_type"])),
        "config": require_dict(payload.get("config", chart["config"]), "config"),
        "updated_at": utc_timestamp(),
    }
    update_chart_row(chart_id, updated)
    return await get_chart(chart_id)


@router.delete("/api/charts/{chart_id}")
async def delete_chart(
    chart_id: str, _: Principal = Depends(require_principal)
) -> JSONResponse:
    await get_chart(chart_id)
    delete_chart_row(chart_id)
    return JSONResponse(status_code=200, content={"deleted": True, "id": chart_id})
