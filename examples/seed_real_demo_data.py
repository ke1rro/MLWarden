from __future__ import annotations

import json
import sys
import traceback

from demo_comparison_report import run_comparison_report
from demo_config import (
    check_backend,
    config_from_args,
    ensure_output_dir,
    ensure_project,
    make_tracker,
    print_run_links,
    write_json,
)


def main(argv: list[str] | None = None) -> int:
    config = config_from_args(argv)
    ensure_output_dir(config.outputs_dir)
    print(f"Checking backend at {config.base_url}...")
    check_backend(config)
    tracker = make_tracker(config)
    project = ensure_project(tracker, config)
    print(f"Using project {project['name']} ({project['id']}).")

    try:
        from demo_pytorch_training import run_pytorch_demos
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "PyTorch demo dependencies are missing. Install them with: "
            "pip install -r examples/requirements-demo.txt"
        ) from exc
    pytorch_results = run_pytorch_demos(tracker, project, config.outputs_dir)

    tensorflow_results = []
    optional_errors: list[str] = []
    try:
        from demo_tensorflow_training import run_tensorflow_demos

        tensorflow_results = run_tensorflow_demos(tracker, project, config.outputs_dir)
    except Exception as exc:  # TensorFlow is optional for the full seed process.
        optional_errors.append(f"TensorFlow demo failed: {exc}")
        traceback.print_exc()

    report_result = run_comparison_report(
        tracker=tracker,
        project=project,
        outputs_dir=config.outputs_dir,
        frontend_url=config.frontend_url,
        pytorch_results=pytorch_results,
        tensorflow_results=tensorflow_results,
    )
    manifest = {
        "project": project,
        "pytorch_runs": pytorch_results,
        "tensorflow_runs": tensorflow_results,
        "summary_report": report_result,
        "optional_errors": optional_errors,
    }
    write_json(config.outputs_dir / "seed_manifest.json", manifest)

    print("\nReal demo data seeded successfully through the SDK.")
    if optional_errors:
        print("\nOptional demo issues:")
        for error in optional_errors:
            print(f"- {error}")
    print_run_links(
        frontend_url=config.frontend_url,
        project_id=project["id"],
        pytorch_results=pytorch_results,
        tensorflow_results=tensorflow_results,
    )
    print(f"\nLocal output files: {config.outputs_dir}")
    print(f"Seed manifest:\n{json.dumps(manifest, indent=2)[:2000]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
