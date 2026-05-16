import argparse
import base64
import math
import random
import sys
import time
from pathlib import Path

from demo_config import (
    check_backend,
    config_from_args,
    ensure_output_dir,
    ensure_project,
    make_tracker,
)

PNG_PIXEL = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lK3Q"
    "6wAAAABJRU5ErkJggg=="
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Start one long-running live MLWarden demo run and stream metrics."
    )
    parser.add_argument("--base-url", default=None, help="Backend URL.")
    parser.add_argument("--api-key", default=None, help="Worker API key.")
    parser.add_argument("--project", default=None, help="Project name.")
    parser.add_argument("--frontend-url", default=None, help="Frontend URL to print.")
    parser.add_argument("--outputs-dir", default=None, help="Directory for generated demo files.")
    parser.add_argument("--steps", type=int, default=180, help="Number of training steps.")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between steps in seconds.")
    return parser


def write_preview(path: Path) -> Path:
    path.write_bytes(PNG_PIXEL)
    return path


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    config = config_from_args(
        [
            *(["--base-url", args.base_url] if args.base_url else []),
            *(["--api-key", args.api_key] if args.api_key else []),
            *(["--project", args.project] if args.project else []),
            *(["--frontend-url", args.frontend_url] if args.frontend_url else []),
            *(["--outputs-dir", args.outputs_dir] if args.outputs_dir else []),
        ]
    )
    ensure_output_dir(config.outputs_dir)
    check_backend(config)
    tracker = make_tracker(config)
    project = ensure_project(tracker, config)
    run = tracker.create_run(
        project,
        name=f"live-demo-{int(time.time())}",
        params={"steps": args.steps, "delay_seconds": args.delay, "optimizer": "adamw"},
        tags=["demo", "live", "realtime"],
        metadata={"worker": "live-demo-worker", "created_by": "examples/live_training_demo.py"},
    )
    run.start()
    run.define_panel("Training loss", "train.loss", chart_type="area", area=True, size="lg")
    run.define_panel("Validation accuracy", "val.accuracy", chart_type="line", size="md")
    run.define_panel("GPU usage", "system.gpu_usage", chart_type="area", area=True, size="md")
    run.define_media_panel("Prediction previews", image_name="prediction-preview")

    print(f"Live demo run: {config.frontend_url}/runs/{run.id}")
    preview_path = config.outputs_dir / "live_prediction_preview.png"

    try:
        for step in range(1, args.steps + 1):
            progress = step / args.steps
            noise = random.uniform(-0.018, 0.018)
            train_loss = max(0.04, math.exp(-progress * 4.2) + noise)
            val_accuracy = min(0.99, 0.48 + progress * 0.46 + random.uniform(-0.012, 0.012))
            gpu_usage = min(98, max(42, 72 + math.sin(step / 9) * 16 + random.uniform(-4, 4)))
            run.log_metrics(
                [
                    {"name": "train.loss", "value": train_loss, "step": step},
                    {"name": "val.accuracy", "value": val_accuracy, "step": step},
                    {"name": "system.gpu_usage", "value": gpu_usage, "step": step},
                ]
            )
            if step == 1 or step % 20 == 0:
                run.log_log(
                    f"step {step}/{args.steps}: loss={train_loss:.4f}, val_acc={val_accuracy:.3f}",
                    context={"step": step},
                )
            if step == 1 or step % 60 == 0:
                run.log_image(
                    write_preview(preview_path),
                    name="prediction-preview",
                    step=step,
                    caption=f"Live prediction preview at step {step}",
                    metadata={"panel": "Prediction previews"},
                )
            time.sleep(max(0, args.delay))
    except KeyboardInterrupt:
        run.fail("Live demo interrupted by user", error_type="KeyboardInterrupt")
        raise
    else:
        run.finish(summary={"final_loss": train_loss, "final_accuracy": val_accuracy})
        print(f"Finished live demo run: {config.frontend_url}/runs/{run.id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
