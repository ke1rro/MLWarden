import argparse
import csv
import json
import os
import platform
import socket
import sys
import time
import traceback
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SDK_ROOT = PROJECT_ROOT / "mlwarden" / "sdk"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "outputs" / "sklearn_digits_live_demo"
DEFAULT_BASE_URL = "http://localhost:8000"
DEFAULT_TOKEN = "dev-api-key"
DEFAULT_PROJECT_NAME = "sklearn-live-demo"
LEARNING_RATE = 0.01

if str(SDK_ROOT) not in sys.path:
    sys.path.insert(0, str(SDK_ROOT))

from mlwarden import Tracker  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Train a live sklearn digits classifier and stream MLWarden metrics."
    )
    parser.add_argument("--base-url", default=None, help="MLWarden backend URL.")
    parser.add_argument("--token", "--api-key", dest="token", default=None, help="API token/key.")
    parser.add_argument(
        "--project-name",
        "--project",
        dest="project_name",
        default=None,
        help="Project name to create or reuse.",
    )
    parser.add_argument("--epochs", type=int, default=25, help="Number of partial_fit epochs.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed.")
    parser.add_argument("--test-size", type=float, default=0.2, help="Validation split fraction.")
    parser.add_argument(
        "--sleep-between-epochs",
        type=float,
        default=0.7,
        help="Delay between epochs so live updates are visible.",
    )
    parser.add_argument(
        "--output-dir",
        "--outputs-dir",
        dest="output_dir",
        default=None,
        help="Directory for generated images and artifacts.",
    )
    return parser


def resolve_arg(value: str | None, *env_names: str, default: str) -> str:
    if value:
        return value
    for env_name in env_names:
        env_value = os.environ.get(env_name)
        if env_value:
            return env_value
    return default


def import_demo_dependencies() -> dict[str, Any]:
    try:
        import joblib
        import matplotlib

        matplotlib.use("Agg")

        import matplotlib.pyplot as plt
        import numpy as np
        from sklearn.datasets import load_digits
        from sklearn.linear_model import SGDClassifier
        from sklearn.metrics import (
            accuracy_score,
            classification_report,
            confusion_matrix,
            f1_score,
            log_loss,
        )
        from sklearn.model_selection import train_test_split
        from sklearn.preprocessing import StandardScaler
    except ImportError as exc:
        raise RuntimeError(
            "Missing demo dependency. Install dependencies with: "
            ".venv/bin/python -m pip install -r examples/requirements-demo.txt"
        ) from exc

    return {
        "accuracy_score": accuracy_score,
        "classification_report": classification_report,
        "confusion_matrix": confusion_matrix,
        "f1_score": f1_score,
        "joblib": joblib,
        "load_digits": load_digits,
        "log_loss": log_loss,
        "np": np,
        "plt": plt,
        "SGDClassifier": SGDClassifier,
        "StandardScaler": StandardScaler,
        "train_test_split": train_test_split,
    }


def write_json(path: Path, payload: dict[str, Any]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    return path


def write_csv(path: Path, rows: list[dict[str, Any]]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames: list[str] = []
    for row in rows:
        for key in row:
            if key not in fieldnames:
                fieldnames.append(key)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return path


def utc_run_suffix() -> str:
    return datetime.now(UTC).strftime("%Y%m%d-%H%M%S")


def prepare_dataset(deps: dict[str, Any], seed: int, test_size: float) -> dict[str, Any]:
    digits = deps["load_digits"]()
    np = deps["np"]
    x = digits.data.astype("float64")
    y = digits.target.astype("int64")
    indices = np.arange(len(y))
    split = deps["train_test_split"](
        x,
        y,
        indices,
        test_size=test_size,
        random_state=seed,
        stratify=y,
    )
    x_train, x_val, y_train, y_val, train_indices, val_indices = split
    scaler = deps["StandardScaler"]()
    x_train_scaled = scaler.fit_transform(x_train)
    x_val_scaled = scaler.transform(x_val)
    return {
        "classes": np.array(sorted(set(y.tolist()))),
        "digits": digits,
        "scaler": scaler,
        "train_indices": train_indices,
        "val_indices": val_indices,
        "x_train": x_train_scaled,
        "x_val": x_val_scaled,
        "y_train": y_train,
        "y_val": y_val,
    }


def evaluate_model(
    deps: dict[str, Any],
    model: Any,
    x_values: Any,
    y_values: Any,
    classes: Any,
) -> dict[str, Any]:
    proba = model.predict_proba(x_values)
    predictions = model.classes_[proba.argmax(axis=1)]
    return {
        "accuracy": float(deps["accuracy_score"](y_values, predictions)),
        "f1_macro": float(deps["f1_score"](y_values, predictions, average="macro")),
        "loss": float(deps["log_loss"](y_values, proba, labels=classes)),
        "predictions": predictions,
        "probabilities": proba,
    }


def metric_payloads(
    *,
    epoch: int,
    epoch_time_sec: float,
    learning_rate: float,
    samples_seen: int,
    train_eval: dict[str, Any],
    val_eval: dict[str, Any],
) -> list[dict[str, Any]]:
    return [
        {
            "name": "train_loss",
            "value": train_eval["loss"],
            "step": epoch,
            "context": {"epoch": epoch, "split": "train"},
        },
        {
            "name": "val_loss",
            "value": val_eval["loss"],
            "step": epoch,
            "context": {"epoch": epoch, "split": "validation"},
        },
        {
            "name": "train_accuracy",
            "value": train_eval["accuracy"],
            "step": epoch,
            "context": {"epoch": epoch, "split": "train"},
        },
        {
            "name": "val_accuracy",
            "value": val_eval["accuracy"],
            "step": epoch,
            "context": {"epoch": epoch, "split": "validation"},
        },
        {
            "name": "val_f1_macro",
            "value": val_eval["f1_macro"],
            "step": epoch,
            "context": {"epoch": epoch, "split": "validation"},
        },
        {
            "name": "epoch_time_sec",
            "value": epoch_time_sec,
            "step": epoch,
            "context": {"epoch": epoch, "phase": "training"},
        },
        {
            "name": "learning_rate",
            "value": learning_rate,
            "step": epoch,
            "context": {"epoch": epoch, "phase": "optimization"},
        },
        {
            "name": "samples_seen",
            "value": samples_seen,
            "step": epoch,
            "context": {"epoch": epoch, "phase": "training"},
        },
    ]


def create_charts(run: Any) -> None:
    chart_specs = [
        (
            "Accuracy over epochs",
            ["train_accuracy", "val_accuracy"],
            "val_accuracy",
            "Accuracy",
        ),
        ("Loss over epochs", ["train_loss", "val_loss"], "val_loss", "Loss"),
        ("Validation F1 macro", ["val_f1_macro"], "val_f1_macro", "F1 macro"),
        ("Epoch time", ["epoch_time_sec"], "epoch_time_sec", "Seconds"),
    ]
    for name, metrics, primary_metric, y_label in chart_specs:
        config = {
            "source": "metrics",
            "data_source": "metrics",
            "runId": run.id,
            "run_id": run.id,
            "metrics": metrics,
            "metric": primary_metric,
            "xAxis": "step",
            "x_axis": "step",
            "yAxis": primary_metric,
            "y_axis": primary_metric,
            "title": name,
            "xAxisLabel": "Epoch",
            "yAxisLabel": y_label,
            "showLegend": len(metrics) > 1,
            "showTooltip": True,
            "smooth": True,
        }
        try:
            run.create_chart(name, chart_type="line", config=config)
        except Exception as exc:
            try:
                run.log_log(
                    f"Chart creation skipped: {name}",
                    level="warning",
                    context={"error": str(exc), "chart": name},
                )
            except Exception:
                print(f"Warning: chart creation failed for {name}: {exc}", file=sys.stderr)


def plot_confusion_matrix(
    deps: dict[str, Any],
    matrix: Any,
    classes: Any,
    path: Path,
) -> Path:
    plt = deps["plt"]
    fig, ax = plt.subplots(figsize=(7, 6))
    image = ax.imshow(matrix, interpolation="nearest", cmap="Blues")
    fig.colorbar(image, ax=ax, fraction=0.046, pad=0.04)
    ax.set(
        title="Confusion matrix",
        xlabel="Predicted label",
        ylabel="True label",
        xticks=range(len(classes)),
        yticks=range(len(classes)),
        xticklabels=classes,
        yticklabels=classes,
    )
    threshold = matrix.max() / 2 if matrix.size else 0
    for row in range(matrix.shape[0]):
        for col in range(matrix.shape[1]):
            color = "white" if matrix[row, col] > threshold else "black"
            ax.text(col, row, int(matrix[row, col]), ha="center", va="center", color=color)
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)
    return path


def plot_prediction_grid(
    deps: dict[str, Any],
    *,
    digits: Any,
    indices: Any,
    path: Path,
    predictions: Any,
    probabilities: Any,
    title: str,
    true_labels: Any,
) -> Path:
    plt = deps["plt"]
    count = min(16, len(indices))
    fig, axes = plt.subplots(4, 4, figsize=(8, 8))
    for axis in axes.flat:
        axis.axis("off")
    for slot, sample_position in enumerate(range(count)):
        axis = axes.flat[slot]
        original_index = int(indices[sample_position])
        confidence = float(probabilities[sample_position].max())
        axis.imshow(digits.images[original_index], cmap="gray_r")
        axis.set_title(
            f"true {int(true_labels[sample_position])} / pred {int(predictions[sample_position])}\n"
            f"conf {confidence:.2f}",
            fontsize=9,
        )
        axis.axis("off")
    fig.suptitle(title, fontsize=13)
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)
    return path


def classification_report_rows(report: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for key in [str(index) for index in range(10)] + ["macro avg", "weighted avg"]:
        values = report.get(key)
        if not isinstance(values, dict):
            continue
        rows.append(
            {
                "label": key.replace(" ", "_"),
                "precision": float(values.get("precision", 0.0)),
                "recall": float(values.get("recall", 0.0)),
                "f1_score": float(values.get("f1-score", 0.0)),
                "support": int(values.get("support", 0)),
            }
        )
    return rows


def prediction_rows(
    deps: dict[str, Any],
    *,
    indices: Any,
    predictions: Any,
    probabilities: Any,
    seed: int,
    true_labels: Any,
) -> list[dict[str, Any]]:
    np = deps["np"]
    rng = np.random.default_rng(seed)
    count = min(100, len(true_labels))
    positions = sorted(rng.choice(len(true_labels), size=count, replace=False).tolist())
    rows: list[dict[str, Any]] = []
    for position in positions:
        predicted_label = int(predictions[position])
        true_label = int(true_labels[position])
        rows.append(
            {
                "index": int(indices[position]),
                "true_label": true_label,
                "predicted_label": predicted_label,
                "confidence": float(probabilities[position].max()),
                "correct": predicted_label == true_label,
            }
        )
    return rows


def train_live_run(
    deps: dict[str, Any],
    run: Any,
    dataset: dict[str, Any],
    *,
    epochs: int,
    seed: int,
    sleep_between_epochs: float,
) -> tuple[Any, list[dict[str, Any]], dict[str, Any]]:
    np = deps["np"]
    model = deps["SGDClassifier"](
        loss="log_loss",
        learning_rate="constant",
        eta0=LEARNING_RATE,
        random_state=seed,
    )
    rng = np.random.default_rng(seed)
    rows: list[dict[str, Any]] = []
    best = {"epoch": 0, "val_accuracy": -1.0, "val_f1_macro": -1.0}
    samples_seen = 0

    for epoch in range(1, epochs + 1):
        epoch_started = time.monotonic()
        permutation = rng.permutation(len(dataset["x_train"]))
        x_epoch = dataset["x_train"][permutation]
        y_epoch = dataset["y_train"][permutation]
        if epoch == 1:
            model.partial_fit(x_epoch, y_epoch, classes=dataset["classes"])
        else:
            model.partial_fit(x_epoch, y_epoch)
        samples_seen += len(x_epoch)
        epoch_time_sec = time.monotonic() - epoch_started

        train_eval = evaluate_model(
            deps, model, dataset["x_train"], dataset["y_train"], dataset["classes"]
        )
        val_eval = evaluate_model(
            deps, model, dataset["x_val"], dataset["y_val"], dataset["classes"]
        )
        run.log_metrics(
            metric_payloads(
                epoch=epoch,
                epoch_time_sec=epoch_time_sec,
                learning_rate=LEARNING_RATE,
                samples_seen=samples_seen,
                train_eval=train_eval,
                val_eval=val_eval,
            )
        )
        run.log_log(
            (
                f"Epoch {epoch}/{epochs}: "
                f"train_loss={train_eval['loss']:.4f}, "
                f"val_loss={val_eval['loss']:.4f}, "
                f"val_accuracy={val_eval['accuracy']:.4f}"
            ),
            context={"epoch": epoch, "split": "validation"},
        )

        row = {
            "epoch": epoch,
            "train_loss": float(train_eval["loss"]),
            "val_loss": float(val_eval["loss"]),
            "train_accuracy": float(train_eval["accuracy"]),
            "val_accuracy": float(val_eval["accuracy"]),
            "val_f1_macro": float(val_eval["f1_macro"]),
            "epoch_time_sec": float(epoch_time_sec),
        }
        rows.append(row)
        if row["val_accuracy"] > best["val_accuracy"]:
            best = {
                "epoch": epoch,
                "val_accuracy": row["val_accuracy"],
                "val_f1_macro": row["val_f1_macro"],
            }
            run.log_log(
                "New best validation accuracy",
                context={
                    "epoch": epoch,
                    "val_accuracy": round(row["val_accuracy"], 6),
                    "val_f1_macro": round(row["val_f1_macro"], 6),
                },
            )

        if epoch < epochs and sleep_between_epochs > 0:
            time.sleep(sleep_between_epochs)

    return model, rows, best


def upload_final_outputs(
    deps: dict[str, Any],
    run: Any,
    *,
    args: argparse.Namespace,
    best: dict[str, Any],
    dataset: dict[str, Any],
    duration_sec: float,
    epoch_rows: list[dict[str, Any]],
    model: Any,
    output_dir: Path,
) -> dict[str, Any]:
    np = deps["np"]
    final_train = evaluate_model(
        deps, model, dataset["x_train"], dataset["y_train"], dataset["classes"]
    )
    final_val = evaluate_model(deps, model, dataset["x_val"], dataset["y_val"], dataset["classes"])
    matrix = deps["confusion_matrix"](
        dataset["y_val"], final_val["predictions"], labels=dataset["classes"]
    )
    report = deps["classification_report"](
        dataset["y_val"],
        final_val["predictions"],
        labels=dataset["classes"],
        output_dict=True,
        zero_division=0,
    )
    report_rows = classification_report_rows(report)
    pred_rows = prediction_rows(
        deps,
        indices=dataset["val_indices"],
        predictions=final_val["predictions"],
        probabilities=final_val["probabilities"],
        seed=args.seed,
        true_labels=dataset["y_val"],
    )

    confusion_path = plot_confusion_matrix(
        deps, matrix, dataset["classes"], output_dir / "confusion_matrix.png"
    )
    sample_count = min(16, len(dataset["y_val"]))
    sample_path = plot_prediction_grid(
        deps,
        digits=dataset["digits"],
        indices=dataset["val_indices"][:sample_count],
        path=output_dir / "sample_predictions.png",
        predictions=final_val["predictions"][:sample_count],
        probabilities=final_val["probabilities"][:sample_count],
        title="Sample validation predictions",
        true_labels=dataset["y_val"][:sample_count],
    )

    image_paths = [
        (confusion_path, "confusion_matrix", "Validation confusion matrix"),
        (sample_path, "sample_predictions", "Sample handwritten digit predictions"),
    ]
    misses = np.flatnonzero(final_val["predictions"] != dataset["y_val"])
    if len(misses):
        selected_misses = misses[:16]
        misclassified_path = plot_prediction_grid(
            deps,
            digits=dataset["digits"],
            indices=dataset["val_indices"][selected_misses],
            path=output_dir / "misclassified_examples.png",
            predictions=final_val["predictions"][selected_misses],
            probabilities=final_val["probabilities"][selected_misses],
            title="Misclassified validation examples",
            true_labels=dataset["y_val"][selected_misses],
        )
        image_paths.append(
            (
                misclassified_path,
                "misclassified_examples",
                "Misclassified validation examples",
            )
        )
    else:
        run.log_log(
            "No misclassified validation examples to upload",
            context={"epoch": args.epochs},
        )

    table_columns = {
        "classification_report": [
            {"name": "label", "type": "string"},
            {"name": "precision", "type": "number"},
            {"name": "recall", "type": "number"},
            {"name": "f1_score", "type": "number"},
            {"name": "support", "type": "number"},
        ],
        "predictions_sample": [
            {"name": "index", "type": "number"},
            {"name": "true_label", "type": "number"},
            {"name": "predicted_label", "type": "number"},
            {"name": "confidence", "type": "number"},
            {"name": "correct", "type": "boolean"},
        ],
        "epoch_summary": [
            {"name": "epoch", "type": "number"},
            {"name": "train_loss", "type": "number"},
            {"name": "val_loss", "type": "number"},
            {"name": "train_accuracy", "type": "number"},
            {"name": "val_accuracy", "type": "number"},
            {"name": "val_f1_macro", "type": "number"},
            {"name": "epoch_time_sec", "type": "number"},
        ],
    }
    run.log_table(
        "classification_report",
        report_rows,
        columns=table_columns["classification_report"],
    )
    run.log_table("predictions_sample", pred_rows, columns=table_columns["predictions_sample"])
    run.log_table("epoch_summary", epoch_rows, columns=table_columns["epoch_summary"])

    config = {
        "classes": int(len(dataset["classes"])),
        "dataset": "sklearn.load_digits",
        "epochs": int(args.epochs),
        "features": int(dataset["x_train"].shape[1]),
        "loss": "log_loss",
        "model": "SGDClassifier",
        "random_state": int(args.seed),
        "scaler": "StandardScaler",
        "sleep_between_epochs": float(args.sleep_between_epochs),
        "test_size": float(args.test_size),
    }
    metrics_summary = {
        "best_epoch": int(best["epoch"]),
        "best_val_accuracy": float(best["val_accuracy"]),
        "best_val_f1_macro": float(best["val_f1_macro"]),
        "duration_sec": float(duration_sec),
        "epochs": int(args.epochs),
        "final_train_accuracy": float(final_train["accuracy"]),
        "final_train_loss": float(final_train["loss"]),
        "final_val_accuracy": float(final_val["accuracy"]),
        "final_val_f1_macro": float(final_val["f1_macro"]),
        "final_val_loss": float(final_val["loss"]),
    }

    model_path = output_dir / "model.joblib"
    scaler_path = output_dir / "scaler.joblib"
    deps["joblib"].dump(model, model_path)
    deps["joblib"].dump(dataset["scaler"], scaler_path)
    config_path = write_json(output_dir / "config.json", config)
    summary_path = write_json(output_dir / "metrics_summary.json", metrics_summary)
    report_csv_path = write_csv(output_dir / "classification_report.csv", report_rows)
    matrix_path = output_dir / "confusion_matrix.npy"
    np.save(matrix_path, matrix)

    for image_path, name, caption in image_paths:
        run.log_image(
            image_path,
            name=name,
            step=args.epochs,
            caption=caption,
            metadata={"source": "sklearn_digits_live_demo", "phase": "final"},
        )

    artifact_paths = [
        model_path,
        scaler_path,
        config_path,
        summary_path,
        report_csv_path,
        matrix_path,
    ]
    for artifact_path in artifact_paths:
        run.log_artifact(
            artifact_path,
            name=artifact_path.name,
            artifact_path=f"sklearn_digits/{artifact_path.name}",
            metadata={"source": "sklearn_digits_live_demo"},
        )

    return {
        **metrics_summary,
        "artifact_names": [path.name for path in artifact_paths],
        "image_names": [path.name for path, _name, _caption in image_paths],
        "table_names": ["classification_report", "predictions_sample", "epoch_summary"],
    }


def fail_run(run: Any, output_dir: Path, exc: BaseException) -> None:
    error_summary = {
        "error_message": str(exc),
        "error_type": exc.__class__.__name__,
        "traceback": traceback.format_exc(),
    }
    try:
        run.log_log(
            "Run failed with an exception",
            level="error",
            context={
                "error_type": error_summary["error_type"],
                "error_message": error_summary["error_message"],
            },
        )
    except Exception:
        pass
    try:
        error_path = write_json(output_dir / "error.json", error_summary)
        run.log_artifact(
            error_path,
            name="error.json",
            artifact_path="sklearn_digits/error.json",
            metadata={"source": "sklearn_digits_live_demo", "kind": "error"},
        )
    except Exception:
        pass
    try:
        run.fail(
            error_summary["error_message"],
            error_type=error_summary["error_type"],
            traceback=error_summary["traceback"],
        )
    except Exception:
        pass


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.epochs < 1:
        raise ValueError("--epochs must be at least 1")
    if not 0 < args.test_size < 1:
        raise ValueError("--test-size must be between 0 and 1")

    base_url = resolve_arg(
        args.base_url, "MLWARDEN_BASE_URL", "MLWARDEN_URL", default=DEFAULT_BASE_URL
    )
    token = resolve_arg(args.token, "MLWARDEN_TOKEN", "MLWARDEN_API_KEY", default=DEFAULT_TOKEN)
    project_name = resolve_arg(
        args.project_name,
        "MLWARDEN_PROJECT_NAME",
        "MLWARDEN_PROJECT",
        default=DEFAULT_PROJECT_NAME,
    )
    output_root = Path(
        resolve_arg(args.output_dir, "MLWARDEN_OUTPUT_DIR", default=str(DEFAULT_OUTPUT_DIR))
    ).expanduser()
    run_name = f"mnist-sklearn-digits-{utc_run_suffix()}"
    run_dir = (output_root / run_name).resolve()
    run_dir.mkdir(parents=True, exist_ok=True)

    deps = import_demo_dependencies()
    tracker = Tracker(base_url=base_url, api_key=token, project=project_name, timeout=60.0)
    project = tracker.get_or_create_project(
        project_name,
        description="MNIST-like handwritten digits classification live demo.",
    )
    params = {
        "dataset": "sklearn.load_digits",
        "epochs": args.epochs,
        "loss": "log_loss",
        "model": "SGDClassifier",
        "scaler": "StandardScaler",
        "seed": args.seed,
        "test_size": args.test_size,
    }
    run = tracker.create_run(
        project,
        name=run_name,
        params=params,
        tags=["demo", "live", "sklearn", "digits", "mnist-like"],
        metadata={
            "created_by": "examples/sklearn_digits_live_demo.py",
            "dataset_description": "MNIST-like handwritten digits classification",
            "hostname": socket.gethostname(),
            "python_version": platform.python_version(),
        },
    )
    started = time.monotonic()

    try:
        run.start()
        create_charts(run)
        dataset = prepare_dataset(deps, args.seed, args.test_size)
        run.log_log(
            "Dataset prepared",
            context={
                "features": int(dataset["x_train"].shape[1]),
                "train_samples": int(len(dataset["y_train"])),
                "validation_samples": int(len(dataset["y_val"])),
            },
        )
        model, epoch_rows, best = train_live_run(
            deps,
            run,
            dataset,
            epochs=args.epochs,
            seed=args.seed,
            sleep_between_epochs=args.sleep_between_epochs,
        )
        duration_sec = time.monotonic() - started
        summary = upload_final_outputs(
            deps,
            run,
            args=args,
            best=best,
            dataset=dataset,
            duration_sec=duration_sec,
            epoch_rows=epoch_rows,
            model=model,
            output_dir=run_dir,
        )
        run.log_log("Run finished", context=summary)
        run.finish(summary=summary)
        print(f"Finished run {run.id} in project {project['id']}")
        return 0
    except Exception as exc:
        fail_run(run, run_dir, exc)
        raise


if __name__ == "__main__":
    sys.exit(main())
