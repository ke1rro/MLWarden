import importlib.util
import io
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

TENSORFLOW_MISSING_MESSAGE = (
    "TensorFlow is not installed. Install demo dependencies with:\n"
    "pip install -r examples/requirements-demo.txt"
)


@dataclass(frozen=True)
class TensorFlowSpec:
    run_name: str
    learning_rate: float
    hidden_dim: int
    noise_std: float
    seed: int
    epochs: int = 10
    batch_size: int = 32
    notes: str = "Regression demo"


TENSORFLOW_SPECS = [
    TensorFlowSpec(
        "tensorflow-regression-baseline",
        3e-3,
        32,
        0.08,
        2101,
        notes="Baseline sine regressor",
    ),
    TensorFlowSpec("tensorflow-regression-wide", 3e-3, 64, 0.08, 2102, notes="Wider Keras MLP"),
    TensorFlowSpec(
        "tensorflow-regression-small-lr",
        5e-4,
        32,
        0.08,
        2103,
        notes="Smaller learning rate",
    ),
    TensorFlowSpec(
        "tensorflow-regression-noisy-data",
        3e-3,
        32,
        0.18,
        2104,
        notes="Noisier synthetic target",
    ),
]


def tensorflow_available() -> bool:
    return importlib.util.find_spec("tensorflow") is not None


def _tensorflow_module():
    if not tensorflow_available():
        return None
    import tensorflow as tf

    return tf


def _make_dataset(
    seed: int, noise_std: float
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    x = rng.uniform(-3.2, 3.2, size=(520, 1)).astype("float32")
    y = (
        np.sin(x[:, 0]) + 0.28 * np.sin(2.3 * x[:, 0]) + rng.normal(0.0, noise_std, size=len(x))
    ).astype("float32")
    indices = rng.permutation(len(x))
    train_size = int(len(x) * 0.78)
    train_idx, val_idx = indices[:train_size], indices[train_size:]
    return x[train_idx], y[train_idx, None], x[val_idx], y[val_idx, None]


def _build_model(tf: Any, hidden_dim: int, learning_rate: float) -> Any:
    model = tf.keras.Sequential(
        [
            tf.keras.layers.Input(shape=(1,)),
            tf.keras.layers.Dense(hidden_dim, activation="relu"),
            tf.keras.layers.Dense(hidden_dim, activation="relu"),
            tf.keras.layers.Dense(1),
        ]
    )
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
        loss="mse",
        metrics=[tf.keras.metrics.MeanAbsoluteError(name="mae")],
    )
    return model


def _prediction_rows(
    x_val: np.ndarray, y_val: np.ndarray, predictions: np.ndarray, limit: int = 60
) -> list[dict[str, Any]]:
    rows = []
    for idx in range(min(limit, len(x_val))):
        target = float(y_val[idx, 0])
        prediction = float(predictions[idx, 0])
        rows.append(
            {
                "sample_id": f"val-{idx + 1:04d}",
                "x": round(float(x_val[idx, 0]), 6),
                "target": round(target, 6),
                "prediction": round(prediction, 6),
                "absolute_error": round(abs(target - prediction), 6),
            }
        )
    return rows


def _plot_prediction_curve(
    model: Any, x_train: np.ndarray, y_train: np.ndarray, path: Path
) -> None:
    x_line = np.linspace(-3.4, 3.4, 240, dtype="float32")[:, None]
    predictions = model.predict(x_line, verbose=0)
    plt.figure(figsize=(7, 4.6))
    order = np.argsort(x_train[:, 0])
    plt.scatter(x_train[:, 0], y_train[:, 0], s=13, alpha=0.36, label="train samples")
    plt.plot(
        x_line[:, 0],
        np.sin(x_line[:, 0]) + 0.28 * np.sin(2.3 * x_line[:, 0]),
        color="#222222",
        linewidth=1.5,
        label="signal",
    )
    plt.plot(x_line[:, 0], predictions[:, 0], color="#d1495b", linewidth=2.2, label="model")
    plt.plot(x_train[order[:4], 0], y_train[order[:4], 0], alpha=0.0)
    plt.title("Keras sine regression prediction curve")
    plt.xlabel("x")
    plt.ylabel("y")
    plt.grid(alpha=0.22)
    plt.legend()
    plt.tight_layout()
    plt.savefig(path, dpi=140)
    plt.close()


def _plot_residuals(y_val: np.ndarray, predictions: np.ndarray, path: Path) -> None:
    residuals = (predictions[:, 0] - y_val[:, 0]).astype("float32")
    plt.figure(figsize=(6.4, 4.2))
    plt.hist(residuals, bins=24, color="#33658a", edgecolor="white")
    plt.title("Validation residual histogram")
    plt.xlabel("prediction - target")
    plt.ylabel("count")
    plt.grid(axis="y", alpha=0.2)
    plt.tight_layout()
    plt.savefig(path, dpi=140)
    plt.close()


def _plot_loss(metrics: list[dict[str, Any]], path: Path) -> None:
    epochs = [row["epoch"] for row in metrics]
    plt.figure(figsize=(7, 4.2))
    plt.plot(epochs, [row["train.loss"] for row in metrics], marker="o", label="train.loss")
    plt.plot(epochs, [row["val.loss"] for row in metrics], marker="o", label="val.loss")
    plt.title("TensorFlow Keras regression loss")
    plt.xlabel("Epoch")
    plt.ylabel("MSE")
    plt.grid(alpha=0.25)
    plt.legend()
    plt.tight_layout()
    plt.savefig(path, dpi=140)
    plt.close()


def _model_summary_text(model: Any) -> str:
    buffer = io.StringIO()
    model.summary(print_fn=lambda line: buffer.write(line + "\n"))
    return buffer.getvalue()


def _run_tensorflow_spec(
    tf: Any, tracker: Any, spec: TensorFlowSpec, outputs_dir: Path
) -> dict[str, Any]:
    tf.keras.utils.set_random_seed(spec.seed)
    run_dir = ensure_output_dir(outputs_dir, spec.run_name)
    started = time.monotonic()
    x_train, y_train, x_val, y_val = _make_dataset(spec.seed, spec.noise_std)
    model = _build_model(tf, spec.hidden_dim, spec.learning_rate)
    params = {
        "framework": "tensorflow",
        "model": "keras-mlp-regressor",
        "dataset": "synthetic-sine-regression",
        "learning_rate": spec.learning_rate,
        "batch_size": spec.batch_size,
        "hidden_dim": spec.hidden_dim,
        "epochs": spec.epochs,
        "noise_std": spec.noise_std,
        "optimizer": "Adam",
        "seed": spec.seed,
        "device": "cpu",
    }
    tags = DEMO_TAGS + ["tensorflow", "regression"]
    tags.append("baseline" if "baseline" in spec.notes.lower() else "ablation")
    metadata = demo_metadata(framework="tensorflow", framework_version=tf.__version__)
    metric_rows: list[dict[str, Any]] = []
    best_val_loss = float("inf")
    best_epoch = 0

    with tracker.run(name=spec.run_name, params=params, tags=tags, metadata=metadata) as run:
        run.log_log("TensorFlow model initialized", context={"hidden_dim": spec.hidden_dim})
        run.log_log(
            "Dataset generated",
            context={"train_samples": len(x_train), "validation_samples": len(x_val)},
        )
        for epoch in range(1, spec.epochs + 1):
            history = model.fit(
                x_train,
                y_train,
                validation_data=(x_val, y_val),
                epochs=1,
                batch_size=spec.batch_size,
                verbose=0,
                shuffle=True,
            )
            train_loss = float(history.history["loss"][0])
            val_loss = float(history.history["val_loss"][0])
            train_mae = float(history.history["mae"][0])
            val_mae = float(history.history["val_mae"][0])
            metric_row = {
                "epoch": epoch,
                "train.loss": round(train_loss, 8),
                "val.loss": round(val_loss, 8),
                "train.mae": round(train_mae, 8),
                "val.mae": round(val_mae, 8),
                "learning_rate": spec.learning_rate,
            }
            metric_rows.append(metric_row)
            run.log_metrics(
                [
                    {"name": "train.loss", "value": train_loss, "step": epoch},
                    {"name": "val.loss", "value": val_loss, "step": epoch},
                    {"name": "train.mae", "value": train_mae, "step": epoch},
                    {"name": "val.mae", "value": val_mae, "step": epoch},
                    {
                        "name": "learning_rate",
                        "value": spec.learning_rate,
                        "step": epoch,
                    },
                    {"name": "epoch", "value": epoch, "step": epoch},
                ]
            )
            run.log_log(
                "Epoch %s completed" % epoch,
                context={"epoch": epoch, "val_loss": round(val_loss, 6)},
            )
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                best_epoch = epoch
                run.log_log(
                    "Validation loss improved",
                    context={"epoch": epoch, "val_loss": round(val_loss, 6)},
                )

        predictions = model.predict(x_val, verbose=0)
        prediction_rows = _prediction_rows(x_val, y_val, predictions)
        columns = [
            {"name": "sample_id", "type": "string"},
            {"name": "x", "type": "number"},
            {"name": "target", "type": "number"},
            {"name": "prediction", "type": "number"},
            {"name": "absolute_error", "type": "number"},
        ]
        run.log_table("validation_predictions", prediction_rows, columns=columns)

        summary_text = _model_summary_text(model)
        summary_text_path = run_dir / "keras_model_summary.txt"
        summary_text_path.write_text(summary_text, encoding="utf-8")
        config_path = write_json(run_dir / "config.json", asdict(spec))
        metrics_path = write_csv(run_dir / "metrics.csv", metric_rows)
        summary = {
            "run_name": spec.run_name,
            "framework": "tensorflow",
            "status": "finished",
            "best_metric_name": "val.loss",
            "best_metric_value": round(best_val_loss, 8),
            "best_epoch": best_epoch,
            "duration_seconds": round(time.monotonic() - started, 3),
            "notes": spec.notes,
        }
        summary_path = write_json(run_dir / "summary.json", summary)

        image_paths = [
            run_dir / "prediction_curve.png",
            run_dir / "residual_histogram.png",
            run_dir / "loss_curve.png",
        ]
        _plot_prediction_curve(model, x_train, y_train, image_paths[0])
        _plot_residuals(y_val, predictions, image_paths[1])
        _plot_loss(metric_rows, image_paths[2])
        for image_path in image_paths:
            run.log_image(
                image_path,
                name=image_path.stem,
                step=spec.epochs,
                caption=f"{spec.run_name} {image_path.stem.replace('_', ' ')}",
                metadata={"kind": "plot", "source": "real-sdk-demo"},
            )

        artifacts = [
            (summary_text_path, "models/keras_model_summary.txt"),
            (config_path, "configs/config.json"),
            (metrics_path, "metrics/metrics.csv"),
            (summary_path, "summaries/summary.json"),
        ]
        for artifact_path, remote_path in artifacts:
            run.log_artifact(
                artifact_path,
                artifact_path=remote_path,
                metadata={"kind": "artifact", "source": "real-sdk-demo"},
            )
        run.log_log("Saved model artifact", context={"path": "models/keras_model_summary.txt"})
        run.log_log("Run finished", context=summary)
        summary["run_id"] = run.id
        summary["num_artifacts"] = len(artifacts)
        summary["num_images"] = len(image_paths)
        return summary


def run_tensorflow_demos(
    tracker: Any, project: dict[str, Any], outputs_dir: Path
) -> list[dict[str, Any]]:
    del project
    tf = _tensorflow_module()
    if tf is None:
        print(TENSORFLOW_MISSING_MESSAGE)
        return []
    return [_run_tensorflow_spec(tf, tracker, spec, outputs_dir) for spec in TENSORFLOW_SPECS]


def main() -> None:
    from demo_config import config_from_args, ensure_project, make_tracker

    config = config_from_args()
    tracker = make_tracker(config)
    project = ensure_project(tracker, config)
    results = run_tensorflow_demos(tracker, project, config.outputs_dir)
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
