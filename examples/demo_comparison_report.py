import time
from pathlib import Path
from typing import Any

from demo_config import DEMO_TAGS, demo_metadata, ensure_output_dir, write_csv, write_json


def _best_result(results: list[dict[str, Any]], *, maximize: bool) -> dict[str, Any] | None:
    finished = [item for item in results if item.get("status") == "finished"]
    if not finished:
        return None
    return sorted(finished, key=lambda item: item.get("best_metric_value", 0), reverse=maximize)[0]


def _comparison_rows(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for item in results:
        rows.append(
            {
                "run_name": item.get("run_name"),
                "framework": item.get("framework"),
                "status": item.get("status"),
                "best_metric_name": item.get("best_metric_name"),
                "best_metric_value": item.get("best_metric_value"),
                "duration_seconds": item.get("duration_seconds"),
                "notes": item.get("notes", ""),
            }
        )
    return rows


def _report_markdown(
    *,
    project_id: str,
    frontend_url: str,
    rows: list[dict[str, Any]],
    best_pytorch: dict[str, Any] | None,
    best_tensorflow: dict[str, Any] | None,
) -> str:
    lines = [
        "# Real SDK Demo Report",
        "",
        "This report was generated from records written through the existing Python SDK.",
        "",
        "## Frontend Pages",
        "",
        f"- Projects: {frontend_url}/projects",
        f"- Demo project: {frontend_url}/projects/{project_id}",
    ]
    if best_pytorch:
        lines.append(f"- Best PyTorch run: {frontend_url}/runs/{best_pytorch['run_id']}")
    if best_tensorflow:
        lines.append(f"- Best TensorFlow run: {frontend_url}/runs/{best_tensorflow['run_id']}")
    lines.extend(
        [
            "",
            "## Presentation Flow",
            "",
            "1. Open the Projects page and show the real demo project.",
            "2. Open the project detail page and compare run statuses.",
            "3. Open a PyTorch run and show metrics, logs, tables, images, and artifacts.",
            "4. Open a TensorFlow run and show regression charts and prediction tables.",
            "5. Open the failed PyTorch run and show failure status and events.",
            "6. Open this summary report run and show comparison artifacts.",
            "",
            "## Runs",
            "",
            "| Run | Framework | Status | Best Metric | Value | Notes |",
            "| --- | --- | --- | --- | ---: | --- |",
        ]
    )
    for row in rows:
        value = row["best_metric_value"]
        value_text = "" if value is None else f"{float(value):.6f}"
        lines.append(
            "| {run_name} | {framework} | {status} | {best_metric_name} | {value} | {notes} |".format(
                value=value_text,
                **row,
            )
        )
    lines.append("")
    return "\n".join(lines)


def run_comparison_report(
    *,
    tracker: Any,
    project: dict[str, Any],
    outputs_dir: Path,
    frontend_url: str,
    pytorch_results: list[dict[str, Any]],
    tensorflow_results: list[dict[str, Any]],
) -> dict[str, Any]:
    run_dir = ensure_output_dir(outputs_dir, "demo-summary-report")
    started = time.monotonic()
    all_results = pytorch_results + tensorflow_results
    rows = _comparison_rows(all_results)
    best_pytorch = _best_result(pytorch_results, maximize=True)
    best_tensorflow = _best_result(tensorflow_results, maximize=False)
    metrics = {
        "num_pytorch_runs": float(len(pytorch_results)),
        "num_tensorflow_runs": float(len(tensorflow_results)),
        "best_pytorch_val_accuracy": (
            float(best_pytorch["best_metric_value"]) if best_pytorch else 0.0
        ),
        "best_tensorflow_val_loss": (
            float(best_tensorflow["best_metric_value"]) if best_tensorflow else 0.0
        ),
        "num_artifacts": float(sum(item.get("num_artifacts", 0) for item in all_results)),
        "num_images": float(sum(item.get("num_images", 0) for item in all_results)),
    }
    comparison_csv = write_csv(run_dir / "framework_comparison.csv", rows)
    best_summary = {
        "best_pytorch": best_pytorch,
        "best_tensorflow": best_tensorflow,
        "metrics": metrics,
    }
    best_summary_json = write_json(run_dir / "best_runs_summary.json", best_summary)
    report_md = run_dir / "demo_report.md"
    report_md.write_text(
        _report_markdown(
            project_id=project["id"],
            frontend_url=frontend_url,
            rows=rows,
            best_pytorch=best_pytorch,
            best_tensorflow=best_tensorflow,
        ),
        encoding="utf-8",
    )

    params = {
        "framework": "mixed",
        "purpose": "presentation-summary",
        "source": "real-sdk-demo",
    }
    tags = DEMO_TAGS + ["pytorch", "tensorflow", "baseline"]
    metadata = demo_metadata(framework="mixed", framework_version="pytorch-tensorflow")
    with tracker.run(
        name="demo-summary-report", params=params, tags=tags, metadata=metadata
    ) as run:
        run.log_log("Summary report started", context={"project_id": project["id"]})
        for name, value in metrics.items():
            run.log_metric(name, value, step=0)
        run.log_table(
            "run_comparison",
            rows,
            columns=[
                {"name": "run_name", "type": "string"},
                {"name": "framework", "type": "string"},
                {"name": "status", "type": "string"},
                {"name": "best_metric_name", "type": "string"},
                {"name": "best_metric_value", "type": "number"},
                {"name": "duration_seconds", "type": "number"},
                {"name": "notes", "type": "string"},
            ],
        )
        run.log_artifact(comparison_csv, artifact_path="reports/framework_comparison.csv")
        run.log_artifact(best_summary_json, artifact_path="reports/best_runs_summary.json")
        run.log_artifact(report_md, artifact_path="reports/demo_report.md")
        run.log_log("Run finished", context={"rows": len(rows)})
        return {
            "run_id": run.id,
            "run_name": "demo-summary-report",
            "framework": "mixed",
            "status": "finished",
            "best_metric_name": "best_pytorch_val_accuracy",
            "best_metric_value": metrics["best_pytorch_val_accuracy"],
            "duration_seconds": round(time.monotonic() - started, 3),
            "notes": "Presentation summary report",
            "num_artifacts": 3,
            "num_images": 0,
        }


def main() -> None:
    from demo_config import config_from_args, ensure_project, make_tracker

    config = config_from_args()
    tracker = make_tracker(config)
    project = ensure_project(tracker, config)
    result = run_comparison_report(
        tracker=tracker,
        project=project,
        outputs_dir=config.outputs_dir,
        frontend_url=config.frontend_url,
        pytorch_results=[],
        tensorflow_results=[],
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
