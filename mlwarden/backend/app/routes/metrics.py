from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from ..core import (
    ApiError,
    Principal,
    create_event,
    get_run_or_404,
    metric_response,
    new_id,
    require_dict,
    require_principal,
    safe_string,
    utc_timestamp,
)
from ..database import increment_metric_summary
from ..database import insert_metric as insert_metric_row
from ..database import metric_rows, metric_summary_rows
from ..models import MetricBatchCreate, MetricCreate

router = APIRouter()


def insert_metric(run: dict[str, Any], body: MetricCreate) -> dict[str, Any]:
    name = safe_string(body.name).strip()
    if not name:
        raise ApiError(422, "validation_error", "Metric name is required")
    value = body.value
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ApiError(422, "validation_error", "Metric value must be numeric")
    metric = {
        "id": new_id(),
        "run_id": run["id"],
        "name": body.name,
        "value": float(value),
        "step": body.step,
        "timestamp": safe_string(body.timestamp, utc_timestamp()),
        "context": require_dict(body.context, "context"),
        "created_at": utc_timestamp(),
    }
    insert_metric_row(metric)
    increment_metric_summary(run["id"], metric["name"], metric["value"], metric["step"])
    return metric


@router.post("/api/runs/{run_id}/metrics")
async def log_metric(
    run_id: str,
    body: MetricCreate,
    _: Principal = Depends(require_principal),
) -> JSONResponse:
    run = get_run_or_404(run_id)
    metric = insert_metric(run, body)
    await create_event(
        "metric.logged",
        project_id=run["project_id"],
        run_id=run_id,
        payload={
            "metric_name": metric["name"],
            "value": metric["value"],
            "step": metric["step"],
        },
    )
    return JSONResponse(status_code=201, content=metric_response(metric))


@router.post("/api/runs/{run_id}/metrics/batch")
async def log_metric_batch(
    run_id: str,
    body: MetricBatchCreate,
    _: Principal = Depends(require_principal),
) -> JSONResponse:
    run = get_run_or_404(run_id)
    created = [insert_metric(run, metric) for metric in body.metrics]
    await create_event(
        "metric.logged",
        project_id=run["project_id"],
        run_id=run_id,
        payload={
            "count": len(created),
            "metric_names": sorted({metric["name"] for metric in created}),
        },
    )
    return JSONResponse(
        status_code=201, content={"created_count": len(created), "items": created}
    )


@router.get("/api/runs/{run_id}/metrics")
async def query_metrics(
    run_id: str,
    names: str | None = None,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    get_run_or_404(run_id)
    requested = [item.strip() for item in (names or "").split(",") if item.strip()]
    rows = metric_rows(run_id, requested)
    series: dict[str, list[dict[str, Any]]] = {name: [] for name in requested}
    for metric in rows:
        series.setdefault(metric["name"], []).append(
            {
                "step": metric["step"],
                "value": metric["value"],
                "timestamp": metric["timestamp"],
                "context": metric["context"],
            }
        )
    return {"series": series}


@router.get("/api/runs/{run_id}/metrics/summary")
async def metric_summary(
    run_id: str,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    get_run_or_404(run_id)
    return {"items": metric_summary_rows(run_id)}
