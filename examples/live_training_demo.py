import argparse
import math
import random
import struct
import sys
import time
import zlib
from pathlib import Path

from demo_config import (
    check_backend,
    config_from_args,
    ensure_output_dir,
    ensure_project,
    make_tracker,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Start one long-running live MLWarden demo run and stream metrics."
    )
    parser.add_argument("--base-url", default=None, help="Backend URL.")
    parser.add_argument("--api-key", default=None, help="Worker API key.")
    parser.add_argument("--username", default=None, help="UI username for token fallback.")
    parser.add_argument("--password", default=None, help="UI password for token fallback.")
    parser.add_argument("--project", default=None, help="Project name.")
    parser.add_argument("--frontend-url", default=None, help="Frontend URL to print.")
    parser.add_argument("--outputs-dir", default=None, help="Directory for generated demo files.")
    parser.add_argument("--steps", type=int, default=180, help="Number of training steps.")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between steps in seconds.")
    return parser


def _set_pixel(
    pixels: bytearray, width: int, height: int, x: int, y: int, color: tuple[int, int, int]
) -> None:
    if x < 0 or y < 0 or x >= width or y >= height:
        return
    offset = (y * width + x) * 3
    pixels[offset : offset + 3] = bytes(color)


def _fill_rect(
    pixels: bytearray,
    width: int,
    height: int,
    box: tuple[int, int, int, int],
    color: tuple[int, int, int],
) -> None:
    x0, y0, x1, y1 = box
    for y in range(max(0, y0), min(height, y1)):
        for x in range(max(0, x0), min(width, x1)):
            _set_pixel(pixels, width, height, x, y, color)


def _fill_ellipse(
    pixels: bytearray,
    width: int,
    height: int,
    box: tuple[int, int, int, int],
    color: tuple[int, int, int],
) -> None:
    x0, y0, x1, y1 = box
    rx = max(1, (x1 - x0) / 2)
    ry = max(1, (y1 - y0) / 2)
    cx = x0 + rx
    cy = y0 + ry
    for y in range(max(0, y0), min(height, y1)):
        for x in range(max(0, x0), min(width, x1)):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                _set_pixel(pixels, width, height, x, y, color)


def _png_chunk(chunk_type: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + chunk_type
        + data
        + struct.pack(">I", zlib.crc32(chunk_type + data) & 0xFFFFFFFF)
    )


def _write_png(path: Path, width: int, height: int, pixels: bytearray) -> None:
    rows = [b"\x00" + pixels[y * width * 3 : (y + 1) * width * 3] for y in range(height)]
    content = b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            _png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)),
            _png_chunk(b"IDAT", zlib.compress(b"".join(rows), 9)),
            _png_chunk(b"IEND", b""),
        ]
    )
    path.write_bytes(content)


def write_preview(path: Path, step: int, total_steps: int) -> Path:
    rng = random.Random(10_000 + step)
    width, height = 384, 256
    pixels = bytearray([238, 242, 255] * width * height)
    tile_w, tile_h = 84, 84
    progress = step / max(1, total_steps)

    for index in range(8):
        col = index % 4
        row = index // 4
        x0 = 18 + col * 92
        y0 = 24 + row * 104
        bg = (rng.randint(205, 245), rng.randint(210, 245), rng.randint(220, 250))
        _fill_rect(pixels, width, height, (x0, y0, x0 + tile_w, y0 + tile_h), bg)
        _fill_rect(pixels, width, height, (x0, y0, x0 + tile_w, y0 + 2), (203, 213, 225))
        _fill_rect(
            pixels, width, height, (x0, y0 + tile_h - 2, x0 + tile_w, y0 + tile_h), (203, 213, 225)
        )
        _fill_rect(pixels, width, height, (x0, y0, x0 + 2, y0 + tile_h), (203, 213, 225))
        _fill_rect(
            pixels, width, height, (x0 + tile_w - 2, y0, x0 + tile_w, y0 + tile_h), (203, 213, 225)
        )

        cx = x0 + tile_w // 2 + rng.randint(-3, 3)
        cy = y0 + 38 + rng.randint(-2, 2)
        skin = (rng.randint(190, 238), rng.randint(145, 205), rng.randint(115, 180))
        hair = (rng.randint(35, 90), rng.randint(28, 75), rng.randint(30, 80))
        _fill_ellipse(pixels, width, height, (cx - 23, cy - 25, cx + 23, cy + 25), skin)
        _fill_ellipse(pixels, width, height, (cx - 25, cy - 30, cx + 25, cy + 6), hair)
        _fill_ellipse(pixels, width, height, (cx - 10, cy - 5, cx - 6, cy - 1), (17, 24, 39))
        _fill_ellipse(pixels, width, height, (cx + 6, cy - 5, cx + 10, cy - 1), (17, 24, 39))
        _fill_rect(pixels, width, height, (cx - 8, cy + 10, cx + 8, cy + 12), (127, 29, 29))

        confidence = min(0.99, 0.48 + progress * 0.45 + rng.uniform(-0.04, 0.04))
        bar_y = y0 + tile_h - 12
        _fill_rect(
            pixels, width, height, (x0 + 10, bar_y, x0 + tile_w - 10, bar_y + 5), (219, 234, 254)
        )
        _fill_rect(
            pixels,
            width,
            height,
            (x0 + 10, bar_y, x0 + 10 + int((tile_w - 20) * confidence), bar_y + 5),
            (37, 99, 235),
        )

    path.parent.mkdir(parents=True, exist_ok=True)
    _write_png(path, width, height, pixels)
    return path


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    config = config_from_args(
        [
            *(["--base-url", args.base_url] if args.base_url else []),
            *(["--api-key", args.api_key] if args.api_key else []),
            *(["--username", args.username] if args.username else []),
            *(["--password", args.password] if args.password else []),
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
                    write_preview(preview_path, step, args.steps),
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
