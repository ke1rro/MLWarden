import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import matplotlib
import numpy as np
from demo_config import DEMO_TAGS, demo_metadata, ensure_output_dir, write_csv, write_json

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402


@dataclass(frozen=True)
class PyTorchSpec:
    run_name: str
    learning_rate: float
    hidden_dim: int
    dropout: float
    seed: int
    epochs: int = 10
    batch_size: int = 32
    notes: str = "Ablation run"


PYTORCH_SPECS = [
    PyTorchSpec("pytorch-mlp-lr-1e-2", 1e-2, 32, 0.0, 1101, notes="Fast baseline"),
    PyTorchSpec("pytorch-mlp-lr-1e-3", 1e-3, 32, 0.0, 1102, notes="Stable baseline"),
    PyTorchSpec("pytorch-mlp-hidden-16", 5e-3, 16, 0.0, 1103, notes="Smaller MLP"),
    PyTorchSpec("pytorch-mlp-hidden-64", 5e-3, 64, 0.0, 1104, notes="Wider MLP"),
    PyTorchSpec("pytorch-mlp-dropout", 5e-3, 32, 0.25, 1105, notes="Dropout ablation"),
]

FAILURE_SPEC = PyTorchSpec(
    "pytorch-intentional-failure-demo",
    5e-3,
    32,
    0.0,
    1199,
    epochs=4,
    notes="Intentional controlled failure after real metrics",
)


def _torch_modules():
    try:
        import torch
        import torch.nn as nn
        import torch.nn.functional as functional
    except ImportError as exc:
        raise RuntimeError(
            "PyTorch is not installed. Install demo dependencies with: "
            "pip install -r examples/requirements-demo.txt"
        ) from exc
    return torch, nn, functional


def _make_dataset(seed: int) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    samples_per_class = 220
    class_zero = rng.normal(loc=(-1.25, -0.85), scale=(0.55, 0.65), size=(samples_per_class, 2))
    class_one = rng.normal(loc=(1.05, 0.95), scale=(0.65, 0.55), size=(samples_per_class, 2))
    bridge_zero = rng.normal(loc=(-0.1, 0.85), scale=(0.45, 0.38), size=(40, 2))
    bridge_one = rng.normal(loc=(0.35, -0.55), scale=(0.42, 0.40), size=(40, 2))

    x = np.vstack([class_zero, bridge_zero, class_one, bridge_one]).astype("float32")
    y = np.array(
        [0] * (samples_per_class + len(bridge_zero)) + [1] * (samples_per_class + len(bridge_one)),
        dtype="int64",
    )
    indices = rng.permutation(len(x))
    train_size = int(len(x) * 0.78)
    train_idx, val_idx = indices[:train_size], indices[train_size:]
    return x[train_idx], y[train_idx], x[val_idx], y[val_idx]


def _build_model(nn: Any, input_dim: int, hidden_dim: int, dropout: float) -> Any:
    layers: list[Any] = [
        nn.Linear(input_dim, hidden_dim),
        nn.ReLU(),
        nn.Linear(hidden_dim, hidden_dim),
        nn.ReLU(),
    ]
    if dropout > 0:
        layers.append(nn.Dropout(dropout))
    layers.append(nn.Linear(hidden_dim, 2))
    return nn.Sequential(*layers)


def _accuracy(logits: Any, labels: Any) -> float:
    predictions = logits.argmax(dim=1)
    return float((predictions == labels).float().mean().item())


def _train_epoch(
    *,
    torch: Any,
    model: Any,
    loss_fn: Any,
    optimizer: Any,
    x_train: Any,
    y_train: Any,
    batch_size: int,
) -> tuple[float, float]:
    model.train()
    indices = torch.randperm(x_train.shape[0])
    weighted_loss = 0.0
    weighted_accuracy = 0.0
    for start in range(0, x_train.shape[0], batch_size):
        batch_idx = indices[start : start + batch_size]
        xb, yb = x_train[batch_idx], y_train[batch_idx]
        optimizer.zero_grad()
        logits = model(xb)
        loss = loss_fn(logits, yb)
        loss.backward()
        optimizer.step()
        batch_count = len(batch_idx)
        weighted_loss += float(loss.item()) * batch_count
        weighted_accuracy += _accuracy(logits.detach(), yb) * batch_count
    total = float(x_train.shape[0])
    return weighted_loss / total, weighted_accuracy / total


def _evaluate(
    torch: Any, model: Any, loss_fn: Any, x_val: Any, y_val: Any
) -> tuple[float, float, Any]:
    model.eval()
    with torch.no_grad():
        logits = model(x_val)
        loss = float(loss_fn(logits, y_val).item())
        accuracy = _accuracy(logits, y_val)
    return loss, accuracy, logits


def _prediction_rows(
    torch: Any, x_val: Any, y_val: Any, logits: Any, limit: int = 60
) -> list[dict[str, Any]]:
    probabilities = torch.softmax(logits, dim=1)
    rows = []
    for idx in range(min(limit, x_val.shape[0])):
        pred = int(probabilities[idx].argmax().item())
        confidence = float(probabilities[idx, pred].item())
        true_label = int(y_val[idx].item())
        rows.append(
            {
                "sample_id": f"val-{idx + 1:04d}",
                "x1": round(float(x_val[idx, 0].item()), 6),
                "x2": round(float(x_val[idx, 1].item()), 6),
                "true_label": true_label,
                "predicted_label": pred,
                "confidence": round(confidence, 6),
                "correct": pred == true_label,
            }
        )
    return rows


def _plot_loss(metrics: list[dict[str, Any]], path: Path) -> None:
    epochs = [row["epoch"] for row in metrics]
    plt.figure(figsize=(7, 4.2))
    plt.plot(epochs, [row["train.loss"] for row in metrics], marker="o", label="train.loss")
    plt.plot(epochs, [row["val.loss"] for row in metrics], marker="o", label="val.loss")
    plt.xlabel("Epoch")
    plt.ylabel("Cross entropy")
    plt.title("PyTorch MLP loss")
    plt.grid(alpha=0.25)
    plt.legend()
    plt.tight_layout()
    plt.savefig(path, dpi=140)
    plt.close()


def _plot_accuracy(metrics: list[dict[str, Any]], path: Path) -> None:
    epochs = [row["epoch"] for row in metrics]
    plt.figure(figsize=(7, 4.2))
    plt.plot(
        epochs,
        [row["train.accuracy"] for row in metrics],
        marker="o",
        label="train.accuracy",
    )
    plt.plot(
        epochs,
        [row["val.accuracy"] for row in metrics],
        marker="o",
        label="val.accuracy",
    )
    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")
    plt.ylim(0.0, 1.05)
    plt.title("PyTorch MLP accuracy")
    plt.grid(alpha=0.25)
    plt.legend()
    plt.tight_layout()
    plt.savefig(path, dpi=140)
    plt.close()


def _plot_confusion_matrix(torch: Any, y_val: Any, logits: Any, path: Path) -> None:
    predictions = logits.argmax(dim=1).cpu().numpy()
    truth = y_val.cpu().numpy()
    matrix = np.zeros((2, 2), dtype=int)
    for actual, pred in zip(truth, predictions, strict=False):
        matrix[int(actual), int(pred)] += 1
    plt.figure(figsize=(4.8, 4.2))
    plt.imshow(matrix, cmap="Blues")
    plt.title("Validation confusion matrix")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.xticks([0, 1])
    plt.yticks([0, 1])
    for row in range(2):
        for col in range(2):
            plt.text(col, row, str(matrix[row, col]), ha="center", va="center", color="black")
    plt.tight_layout()
    plt.savefig(path, dpi=140)
    plt.close()


def _plot_decision_boundary(torch: Any, model: Any, x_train: Any, y_train: Any, path: Path) -> None:
    x_np = x_train.cpu().numpy()
    y_np = y_train.cpu().numpy()
    x_min, x_max = x_np[:, 0].min() - 0.7, x_np[:, 0].max() + 0.7
    y_min, y_max = x_np[:, 1].min() - 0.7, x_np[:, 1].max() + 0.7
    xx, yy = np.meshgrid(np.linspace(x_min, x_max, 180), np.linspace(y_min, y_max, 180))
    grid = torch.tensor(np.c_[xx.ravel(), yy.ravel()], dtype=torch.float32)
    model.eval()
    with torch.no_grad():
        probs = torch.softmax(model(grid), dim=1)[:, 1].cpu().numpy().reshape(xx.shape)
    plt.figure(figsize=(6.4, 5.2))
    plt.contourf(xx, yy, probs, levels=18, cmap="RdYlBu", alpha=0.76)
    plt.colorbar(label="P(class=1)")
    plt.scatter(
        x_np[:, 0],
        x_np[:, 1],
        c=y_np,
        cmap="coolwarm",
        s=16,
        edgecolor="white",
        linewidth=0.35,
    )
    plt.title("Decision boundary")
    plt.xlabel("x1")
    plt.ylabel("x2")
    plt.tight_layout()
    plt.savefig(path, dpi=140)
    plt.close()


def _artifact_metadata(kind: str) -> dict[str, str]:
    return {"kind": kind, "source": "real-sdk-demo"}


def _log_successful_run(tracker: Any, spec: PyTorchSpec, outputs_dir: Path) -> dict[str, Any]:
    torch, nn, _functional = _torch_modules()
    torch.manual_seed(spec.seed)
    run_dir = ensure_output_dir(outputs_dir, spec.run_name)
    started = time.monotonic()

    x_train_np, y_train_np, x_val_np, y_val_np = _make_dataset(spec.seed)
    x_train = torch.tensor(x_train_np, dtype=torch.float32)
    y_train = torch.tensor(y_train_np, dtype=torch.long)
    x_val = torch.tensor(x_val_np, dtype=torch.float32)
    y_val = torch.tensor(y_val_np, dtype=torch.long)
    model = _build_model(nn, 2, spec.hidden_dim, spec.dropout)
    optimizer = torch.optim.Adam(model.parameters(), lr=spec.learning_rate)
    loss_fn = nn.CrossEntropyLoss()

    params = {
        "framework": "pytorch",
        "model": "tiny-mlp",
        "dataset": "synthetic-gaussian-blobs",
        "learning_rate": spec.learning_rate,
        "batch_size": spec.batch_size,
        "hidden_dim": spec.hidden_dim,
        "epochs": spec.epochs,
        "dropout": spec.dropout,
        "optimizer": "Adam",
        "seed": spec.seed,
        "device": "cpu",
    }
    tags = DEMO_TAGS + ["pytorch", "classification"]
    tags.append("baseline" if "baseline" in spec.notes.lower() else "ablation")
    metadata = demo_metadata(framework="pytorch", framework_version=torch.__version__)
    best_val_accuracy = -1.0
    best_epoch = 0
    rows: list[dict[str, Any]] = []

    with tracker.run(name=spec.run_name, params=params, tags=tags, metadata=metadata) as run:
        run.log_log("Run started", context={"run_name": spec.run_name})
        run.log_log(
            "Dataset generated",
            context={
                "train_samples": len(x_train_np),
                "validation_samples": len(x_val_np),
            },
        )
        run.log_log(
            "Model initialized",
            context={"hidden_dim": spec.hidden_dim, "dropout": spec.dropout},
        )

        for epoch in range(1, spec.epochs + 1):
            train_loss, train_accuracy = _train_epoch(
                torch=torch,
                model=model,
                loss_fn=loss_fn,
                optimizer=optimizer,
                x_train=x_train,
                y_train=y_train,
                batch_size=spec.batch_size,
            )
            val_loss, val_accuracy, logits = _evaluate(torch, model, loss_fn, x_val, y_val)
            metric_row = {
                "epoch": epoch,
                "train.loss": round(train_loss, 8),
                "train.accuracy": round(train_accuracy, 8),
                "val.loss": round(val_loss, 8),
                "val.accuracy": round(val_accuracy, 8),
                "learning_rate": spec.learning_rate,
            }
            rows.append(metric_row)
            run.log_metrics(
                [
                    {"name": "train.loss", "value": train_loss, "step": epoch},
                    {"name": "train.accuracy", "value": train_accuracy, "step": epoch},
                    {"name": "val.loss", "value": val_loss, "step": epoch},
                    {"name": "val.accuracy", "value": val_accuracy, "step": epoch},
                    {
                        "name": "learning_rate",
                        "value": spec.learning_rate,
                        "step": epoch,
                    },
                    {"name": "epoch", "value": epoch, "step": epoch},
                ]
            )
            run.log_log(
                f"Epoch {epoch} completed",
                context={"epoch": epoch, "val_accuracy": round(val_accuracy, 6)},
            )
            if val_accuracy > best_val_accuracy:
                best_val_accuracy = val_accuracy
                best_epoch = epoch
                run.log_log(
                    "New best validation accuracy",
                    context={"epoch": epoch, "val_accuracy": round(val_accuracy, 6)},
                )

        val_loss, val_accuracy, logits = _evaluate(torch, model, loss_fn, x_val, y_val)
        prediction_rows = _prediction_rows(torch, x_val, y_val, logits)
        columns = [
            {"name": "sample_id", "type": "string"},
            {"name": "x1", "type": "number"},
            {"name": "x2", "type": "number"},
            {"name": "true_label", "type": "number"},
            {"name": "predicted_label", "type": "number"},
            {"name": "confidence", "type": "number"},
            {"name": "correct", "type": "boolean"},
        ]
        run.log_table("validation_predictions", prediction_rows, columns=columns)

        model_path = run_dir / "model.pt"
        config_path = write_json(run_dir / "config.json", asdict(spec))
        metrics_path = write_csv(run_dir / "metrics.csv", rows)
        summary = {
            "run_name": spec.run_name,
            "framework": "pytorch",
            "status": "finished",
            "best_metric_name": "val.accuracy",
            "best_metric_value": round(best_val_accuracy, 8),
            "best_epoch": best_epoch,
            "duration_seconds": round(time.monotonic() - started, 3),
            "notes": spec.notes,
        }
        summary_path = write_json(run_dir / "summary.json", summary)
        torch.save(model.state_dict(), model_path)

        image_paths = [
            run_dir / "decision_boundary.png",
            run_dir / "confusion_matrix.png",
            run_dir / "loss_curve.png",
            run_dir / "accuracy_curve.png",
        ]
        _plot_decision_boundary(torch, model, x_train, y_train, image_paths[0])
        _plot_confusion_matrix(torch, y_val, logits, image_paths[1])
        _plot_loss(rows, image_paths[2])
        _plot_accuracy(rows, image_paths[3])
        for image_path in image_paths:
            run.log_image(
                image_path,
                name=image_path.stem,
                step=spec.epochs,
                caption=f"{spec.run_name} {image_path.stem.replace('_', ' ')}",
                metadata=_artifact_metadata("plot"),
            )

        artifacts = [
            (model_path, "models/model.pt"),
            (config_path, "configs/config.json"),
            (metrics_path, "metrics/metrics.csv"),
            (summary_path, "summaries/summary.json"),
        ]
        for artifact_path, remote_path in artifacts:
            run.log_artifact(
                artifact_path,
                artifact_path=remote_path,
                metadata=_artifact_metadata("artifact"),
            )
        run.log_log("Saved model artifact", context={"path": "models/model.pt"})
        run.log_log("Run finished", context=summary)
        summary["run_id"] = run.id
        summary["num_artifacts"] = len(artifacts)
        summary["num_images"] = len(image_paths)
        return summary


def _log_failed_run(tracker: Any, spec: PyTorchSpec, outputs_dir: Path) -> dict[str, Any]:
    torch, nn, _functional = _torch_modules()
    torch.manual_seed(spec.seed)
    run_dir = ensure_output_dir(outputs_dir, spec.run_name)
    started = time.monotonic()
    x_train_np, y_train_np, x_val_np, y_val_np = _make_dataset(spec.seed)
    x_train = torch.tensor(x_train_np, dtype=torch.float32)
    y_train = torch.tensor(y_train_np, dtype=torch.long)
    x_val = torch.tensor(x_val_np, dtype=torch.float32)
    y_val = torch.tensor(y_val_np, dtype=torch.long)
    model = _build_model(nn, 2, spec.hidden_dim, spec.dropout)
    optimizer = torch.optim.Adam(model.parameters(), lr=spec.learning_rate)
    loss_fn = nn.CrossEntropyLoss()

    params = {
        "framework": "pytorch",
        "model": "tiny-mlp",
        "dataset": "synthetic-gaussian-blobs",
        "learning_rate": spec.learning_rate,
        "batch_size": spec.batch_size,
        "hidden_dim": spec.hidden_dim,
        "epochs": spec.epochs,
        "optimizer": "Adam",
        "seed": spec.seed,
        "device": "cpu",
        "intentional_failure": True,
    }
    tags = DEMO_TAGS + ["pytorch", "classification", "failed-run"]
    metadata = demo_metadata(framework="pytorch", framework_version=torch.__version__)
    metrics_rows: list[dict[str, Any]] = []
    run_id = ""

    try:
        with tracker.run(name=spec.run_name, params=params, tags=tags, metadata=metadata) as run:
            run_id = run.id
            run.log_log("Run started", context={"run_name": spec.run_name})
            run.log_log("Dataset generated", context={"train_samples": len(x_train_np)})
            for epoch in range(1, spec.epochs + 1):
                train_loss, train_accuracy = _train_epoch(
                    torch=torch,
                    model=model,
                    loss_fn=loss_fn,
                    optimizer=optimizer,
                    x_train=x_train,
                    y_train=y_train,
                    batch_size=spec.batch_size,
                )
                val_loss, val_accuracy, _logits = _evaluate(torch, model, loss_fn, x_val, y_val)
                metrics_rows.append(
                    {
                        "epoch": epoch,
                        "train.loss": round(train_loss, 8),
                        "train.accuracy": round(train_accuracy, 8),
                        "val.loss": round(val_loss, 8),
                        "val.accuracy": round(val_accuracy, 8),
                    }
                )
                run.log_metrics(
                    [
                        {"name": "train.loss", "value": train_loss, "step": epoch},
                        {
                            "name": "train.accuracy",
                            "value": train_accuracy,
                            "step": epoch,
                        },
                        {"name": "val.loss", "value": val_loss, "step": epoch},
                        {"name": "val.accuracy", "value": val_accuracy, "step": epoch},
                        {
                            "name": "learning_rate",
                            "value": spec.learning_rate,
                            "step": epoch,
                        },
                        {"name": "epoch", "value": epoch, "step": epoch},
                    ]
                )
                run.log_log(
                    f"Epoch {epoch} completed",
                    context={"epoch": epoch, "val_accuracy": round(val_accuracy, 6)},
                )
            metrics_path = write_csv(run_dir / "metrics.csv", metrics_rows)
            config_path = write_json(run_dir / "config.json", asdict(spec))
            run.log_artifact(metrics_path, artifact_path="metrics/metrics.csv")
            run.log_artifact(config_path, artifact_path="configs/config.json")
            run.log_log(
                "About to raise intentional demo failure",
                level="error",
                context={"reason": "presentation failed-run status"},
            )
            raise RuntimeError("Intentional demo failure after real training metrics")
    except RuntimeError as exc:
        if str(exc) != "Intentional demo failure after real training metrics":
            raise
        summary = {
            "run_id": run_id,
            "run_name": spec.run_name,
            "framework": "pytorch",
            "status": "failed",
            "best_metric_name": "val.accuracy",
            "best_metric_value": max(row["val.accuracy"] for row in metrics_rows),
            "duration_seconds": round(time.monotonic() - started, 3),
            "notes": "Intentional controlled failure for status and event demos",
            "num_artifacts": 2,
            "num_images": 0,
        }
        write_json(run_dir / "summary.json", summary)
        return summary
    raise AssertionError("Intentional failure run did not fail")


def run_pytorch_demos(
    tracker: Any, project: dict[str, Any], outputs_dir: Path
) -> list[dict[str, Any]]:
    del project
    results = [_log_successful_run(tracker, spec, outputs_dir) for spec in PYTORCH_SPECS]
    results.append(_log_failed_run(tracker, FAILURE_SPEC, outputs_dir))
    return results


def main() -> None:
    from demo_config import config_from_args, ensure_project, make_tracker

    config = config_from_args()
    tracker = make_tracker(config)
    project = ensure_project(tracker, config)
    results = run_pytorch_demos(tracker, project, config.outputs_dir)
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
