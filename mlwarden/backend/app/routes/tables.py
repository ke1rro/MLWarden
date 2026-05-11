from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from ..core import (
    Principal,
    create_event,
    get_run_or_404,
    get_table_or_404,
    new_id,
    normalize_limit_offset,
    require_dict,
    require_list,
    require_principal,
)
from ..database import append_rows_to_table, paged_table_rows
from ..database import replace_table as replace_table_rows
from ..database import table_rows_for_run
from ..models import TableReplaceRequest, TableRowsAppendRequest

router = APIRouter()


@router.get("/api/runs/{run_id}/tables")
async def list_tables(
    run_id: str,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    get_run_or_404(run_id)
    return {"items": table_rows_for_run(run_id)}


@router.put("/api/runs/{run_id}/tables/{table_name}")
async def replace_table(
    run_id: str,
    table_name: str,
    body: TableReplaceRequest,
    _: Principal = Depends(require_principal),
) -> JSONResponse:
    run = get_run_or_404(run_id)
    columns = [column.model_dump(exclude_none=True) for column in body.columns]
    rows = require_list(body.rows, "rows")
    metadata = require_dict(body.metadata, "metadata")
    replace_table_rows(new_id(), run_id, table_name, columns, metadata, rows)
    await create_event(
        "table.updated",
        project_id=run["project_id"],
        run_id=run_id,
        payload={"table_name": table_name, "mode": "replace", "row_count": len(rows)},
    )
    return JSONResponse(status_code=201, content=get_table_or_404(run_id, table_name))


@router.post("/api/runs/{run_id}/tables/{table_name}/rows")
async def append_table_rows(
    run_id: str,
    table_name: str,
    body: TableRowsAppendRequest,
    _: Principal = Depends(require_principal),
) -> JSONResponse:
    run = get_run_or_404(run_id)
    table = get_table_or_404(run_id, table_name)
    rows = require_list(body.rows, "rows")
    append_rows_to_table(table["id"], rows)
    await create_event(
        "table.updated",
        project_id=run["project_id"],
        run_id=run_id,
        payload={"table_name": table_name, "mode": "append", "row_count": len(rows)},
    )
    return JSONResponse(status_code=201, content={"created_count": len(rows)})


@router.get("/api/runs/{run_id}/tables/{table_name}")
async def get_table_data(
    run_id: str,
    table_name: str,
    limit: int = 100,
    offset: int = 0,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    get_run_or_404(run_id)
    table = get_table_or_404(run_id, table_name)
    limit, offset = normalize_limit_offset(limit, offset)
    decoded, total = paged_table_rows(table["id"], limit=limit, offset=offset)
    return {
        **table,
        "items": decoded,
        "rows": decoded,
        "limit": limit,
        "offset": offset,
        "total": total,
    }
