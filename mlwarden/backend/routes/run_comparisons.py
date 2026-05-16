from statistics import median
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from ..core import (
    ApiError,
    Principal,
    get_project_or_404,
    get_run_or_404,
    new_id,
    require_dict,
    require_principal,
    safe_string,
    utc_timestamp,
)
from ..database import (
    delete_run_comparison_row,
    get_run_comparison_row,
    insert_run_comparison,
    metric_rows,
    metric_summary_rows,
    run_comparison_rows,
    update_run_comparison_row,
)
from ..models import RunCompareRequest, RunComparisonCreate, RunComparisonUpdate

router = APIRouter()


def unique_values(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        text = safe_string(value).strip()
        if text and text not in seen:
            seen.add(text)
            result.append(text)
    return result


def validate_project_runs(project_id: str, run_ids: list[str]) -> list[dict[str, Any]]:
    run_ids = unique_values(run_ids)
    if len(run_ids) < 2:
        raise ApiError(422, "validation_error", "Select at least two runs to compare")

    runs = [get_run_or_404(run_id) for run_id in run_ids]
    invalid = [run["id"] for run in runs if run.get("project_id") != project_id]
    if invalid:
        raise ApiError(
            422,
            "validation_error",
            "All compared runs must belong to the requested project",
            {"run_ids": invalid},
        )
    return runs


def metric_direction(metric: str, requested: str = "auto") -> str:
    if requested in {"maximize", "minimize"}:
        return requested
    lowered = metric.lower()
    if any(token in lowered for token in ("loss", "error", "wer", "perplexity")):
        return "minimize"
    return "maximize"


def x_value(point: dict[str, Any], x_axis: str, index: int) -> Any:
    if x_axis == "timestamp":
        return point.get("timestamp")
    if x_axis == "epoch":
        return point.get("context", {}).get("epoch", point.get("step", index))
    return point.get("step", index)


def smooth_points(points: list[dict[str, Any]], smoothing: float) -> list[dict[str, Any]]:
    if smoothing <= 0 or not points:
        return points
    alpha = max(0.0, min(0.95, smoothing))
    smoothed: list[dict[str, Any]] = []
    previous: float | None = None
    for point in points:
        value = float(point["value"])
        previous = value if previous is None else previous * alpha + value * (1 - alpha)
        smoothed.append({**point, "value": previous})
    return smoothed


def aggregate_values(values: list[float], mode: str) -> float | None:
    if not values:
        return None
    if mode == "mean":
        return sum(values) / len(values)
    if mode == "median":
        return float(median(values))
    if mode == "min":
        return min(values)
    if mode == "max":
        return max(values)
    return None


def aggregate_metric_series(
    runs: list[dict[str, Any]], metric: str, mode: str
) -> list[dict[str, Any]]:
    if mode == "none":
        return []

    by_x: dict[Any, list[float]] = {}
    for run in runs:
        for point in run["metrics"].get(metric, []):
            key = point.get("x", point.get("step"))
            by_x.setdefault(key, []).append(float(point["value"]))

    aggregated: list[dict[str, Any]] = []
    for index, key in enumerate(sorted(by_x, key=lambda value: str(value))):
        value = aggregate_values(by_x[key], mode)
        if value is not None:
            aggregated.append(
                {"x": key, "step": key if isinstance(key, int) else index, "value": value}
            )
    return aggregated


def best_run_summary(
    runs: list[dict[str, Any]], primary_metric: str, direction: str
) -> dict[str, Any]:
    best_run: dict[str, Any] | None = None
    best_value: float | None = None
    for run in runs:
        values = [point["value"] for point in run["metrics"].get(primary_metric, [])]
        if not values:
            continue
        candidate = min(values) if direction == "minimize" else max(values)
        if best_value is None:
            best_run = run
            best_value = candidate
            continue
        if (direction == "minimize" and candidate < best_value) or (
            direction == "maximize" and candidate > best_value
        ):
            best_run = run
            best_value = candidate

    return {
        "primary_metric": primary_metric,
        "metric_direction": direction,
        "best_run_id": best_run["id"] if best_run else None,
        "best_run_name": best_run["name"] if best_run else None,
        "best_value": best_value,
    }


def comparison_or_404(project_id: str, comparison_id: str) -> dict[str, Any]:
    comparison = get_run_comparison_row(comparison_id)
    if not comparison or comparison.get("project_id") != project_id:
        raise ApiError(404, "not_found", "Run comparison not found")
    return comparison


@router.post("/api/projects/{project_id}/runs/compare")
async def compare_runs(
    project_id: str,
    body: RunCompareRequest,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    get_project_or_404(project_id)
    payload = body.model_dump()
    runs = validate_project_runs(project_id, payload.get("run_ids", []))
    metrics = unique_values(payload.get("metrics", []))
    if not metrics:
        raise ApiError(422, "validation_error", "Select at least one metric to compare")

    x_axis = payload.get("x_axis", "step")
    smoothing = float(payload.get("smoothing") or 0)
    aggregation = payload.get("aggregation", "none")
    colors = [
        "#2563eb",
        "#16a34a",
        "#dc2626",
        "#9333ea",
        "#0891b2",
        "#ea580c",
        "#0f766e",
        "#be123c",
    ]

    response_runs: list[dict[str, Any]] = []
    schema: list[dict[str, Any]] = []
    summary_names = {
        run["id"]: {row["name"] for row in metric_summary_rows(run["id"])} for run in runs
    }

    for metric in metrics:
        available = [run["id"] for run in runs if metric in summary_names[run["id"]]]
        schema.append(
            {
                "metric_name": metric,
                "available_in_run_ids": available,
                "missing_in_run_ids": [run["id"] for run in runs if run["id"] not in available],
                "value_type": "number",
            }
        )

    for index, run in enumerate(runs):
        rows = metric_rows(run["id"], metrics)
        grouped: dict[str, list[dict[str, Any]]] = {metric: [] for metric in metrics}
        for row_index, row in enumerate(rows):
            grouped.setdefault(row["name"], []).append(
                {
                    "x": x_value(row, x_axis, row_index),
                    "step": row.get("step"),
                    "epoch": row.get("context", {}).get("epoch"),
                    "timestamp": row.get("timestamp"),
                    "value": row["value"],
                    "context": row.get("context", {}),
                }
            )
        response_runs.append(
            {
                "id": run["id"],
                "name": run["name"],
                "color": colors[index % len(colors)],
                "status": run["status"],
                "metrics": {
                    metric: smooth_points(points, smoothing) for metric, points in grouped.items()
                },
            }
        )

    aggregates = {
        metric: aggregate_metric_series(response_runs, metric, aggregation)
        for metric in metrics
        if aggregation != "none"
    }
    primary_metric = metrics[0]
    direction = metric_direction(primary_metric, payload.get("metric_direction", "auto"))

    return {
        "project_id": project_id,
        "runs": response_runs,
        "metric_schema": schema,
        "aggregates": aggregates,
        "summary": best_run_summary(response_runs, primary_metric, direction),
    }


@router.get("/api/projects/{project_id}/run-comparisons")
async def list_run_comparisons(
    project_id: str,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    get_project_or_404(project_id)
    return {"items": run_comparison_rows(project_id)}


@router.post("/api/projects/{project_id}/run-comparisons")
async def create_run_comparison(
    project_id: str,
    body: RunComparisonCreate,
    principal: Principal = Depends(require_principal),
) -> JSONResponse:
    get_project_or_404(project_id)
    payload = body.model_dump()
    run_ids = unique_values(payload.get("run_ids", []))
    validate_project_runs(project_id, run_ids)
    name = safe_string(payload.get("name")).strip()
    if not name:
        raise ApiError(422, "validation_error", "Comparison name is required")
    now = utc_timestamp()
    comparison = {
        "id": new_id(),
        "project_id": project_id,
        "name": name,
        "run_ids": run_ids,
        "primary_metric": safe_string(payload.get("primary_metric"), None),
        "x_axis": payload.get("x_axis", "step"),
        "chart_settings": require_dict(payload.get("chart_settings"), "chart_settings"),
        "created_by": principal.username if principal.kind == "user" else None,
        "created_at": now,
        "updated_at": now,
    }
    insert_run_comparison(comparison)
    return JSONResponse(status_code=201, content=comparison)


@router.get("/api/projects/{project_id}/run-comparisons/{comparison_id}")
async def get_run_comparison(
    project_id: str,
    comparison_id: str,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    get_project_or_404(project_id)
    return comparison_or_404(project_id, comparison_id)


@router.patch("/api/projects/{project_id}/run-comparisons/{comparison_id}")
async def update_run_comparison(
    project_id: str,
    comparison_id: str,
    body: RunComparisonUpdate,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    get_project_or_404(project_id)
    current = comparison_or_404(project_id, comparison_id)
    payload = body.model_dump(exclude_unset=True)
    run_ids = unique_values(payload.get("run_ids", current["run_ids"]))
    validate_project_runs(project_id, run_ids)
    updated = {
        **current,
        "name": safe_string(payload.get("name", current["name"])).strip(),
        "run_ids": run_ids,
        "primary_metric": payload.get("primary_metric", current.get("primary_metric")),
        "x_axis": payload.get("x_axis", current.get("x_axis", "step")),
        "chart_settings": require_dict(
            payload.get("chart_settings", current.get("chart_settings")), "chart_settings"
        ),
        "updated_at": utc_timestamp(),
    }
    if not updated["name"]:
        raise ApiError(422, "validation_error", "Comparison name is required")
    update_run_comparison_row(comparison_id, updated)
    return comparison_or_404(project_id, comparison_id)


@router.delete("/api/projects/{project_id}/run-comparisons/{comparison_id}")
async def delete_run_comparison(
    project_id: str,
    comparison_id: str,
    _: Principal = Depends(require_principal),
) -> JSONResponse:
    get_project_or_404(project_id)
    comparison_or_404(project_id, comparison_id)
    delete_run_comparison_row(comparison_id)
    return JSONResponse(status_code=200, content={"deleted": True, "id": comparison_id})
