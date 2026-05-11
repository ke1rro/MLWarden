from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from ..core import (
    ApiError,
    Principal,
    create_event,
    get_run_or_404,
    new_id,
    normalize_limit_offset,
    require_dict,
    require_principal,
    safe_string,
    utc_timestamp,
)
from ..database import insert_log, log_rows
from ..models import LogCreate

router = APIRouter()


@router.post("/api/runs/{run_id}/logs")
async def append_log(
    run_id: str,
    body: LogCreate,
    _: Principal = Depends(require_principal),
) -> JSONResponse:
    run = get_run_or_404(run_id)
    message = safe_string(body.message).strip()
    if not message:
        raise ApiError(422, "validation_error", "Log message is required")
    log = {
        "id": new_id(),
        "run_id": run_id,
        "level": safe_string(body.level, "info").lower(),
        "message": message,
        "timestamp": safe_string(body.timestamp, utc_timestamp()),
        "context": require_dict(body.context, "context"),
        "created_at": utc_timestamp(),
    }
    insert_log(log)
    await create_event(
        "log.appended",
        project_id=run["project_id"],
        run_id=run_id,
        payload={"level": log["level"], "message": log["message"]},
    )
    return JSONResponse(status_code=201, content=log)


@router.get("/api/runs/{run_id}/logs")
async def query_logs(
    run_id: str,
    level: str | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    get_run_or_404(run_id)
    limit, offset = normalize_limit_offset(limit, offset)
    rows, total = log_rows(
        run_id, level=level, search=search, limit=limit, offset=offset
    )
    return {
        "items": rows,
        "limit": limit,
        "offset": offset,
        "total": total,
    }
