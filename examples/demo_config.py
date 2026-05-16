import argparse
import csv
import json
import os
import platform
import socket
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SDK_ROOT = PROJECT_ROOT / "mlwarden" / "sdk"
DEFAULT_OUTPUTS_DIR = Path(__file__).resolve().parent / "outputs"

if str(SDK_ROOT) not in sys.path:
    sys.path.insert(0, str(SDK_ROOT))

DEFAULT_BASE_URL = "http://localhost:8000"
DEFAULT_API_KEY = "dev-api-key"
DEFAULT_PROJECT = "demo-pytorch-tensorflow"
DEFAULT_FRONTEND_URL = "http://localhost:5173"
DEFAULT_USERNAME = "admin"
DEFAULT_PASSWORD = "password"

DEMO_TAGS = ["demo", "real-data", "sdk", "presentation"]


@dataclass(frozen=True)
class DemoConfig:
    base_url: str
    api_key: str
    username: str
    password: str
    project: str
    frontend_url: str
    outputs_dir: Path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Seed real MLWarden demo data through the existing Python SDK."
    )
    parser.add_argument("--base-url", default=None, help="Backend URL.")
    parser.add_argument("--api-key", default=None, help="Worker API key.")
    parser.add_argument("--username", default=None, help="UI username for token fallback.")
    parser.add_argument("--password", default=None, help="UI password for token fallback.")
    parser.add_argument("--project", default=None, help="Project name to create/reuse.")
    parser.add_argument("--frontend-url", default=None, help="Frontend URL to print.")
    parser.add_argument(
        "--outputs-dir",
        default=None,
        help="Directory for generated local demo artifacts.",
    )
    return parser


def config_from_args(argv: list[str] | None = None) -> DemoConfig:
    args = build_parser().parse_args(argv)
    base_url = (
        args.base_url
        or os.environ.get("MINI_TRACKER_URL")
        or os.environ.get("MLWARDEN_URL")
        or DEFAULT_BASE_URL
    )
    api_key = (
        args.api_key
        or os.environ.get("MINI_TRACKER_API_KEY")
        or os.environ.get("MLWARDEN_API_KEY")
        or DEFAULT_API_KEY
    )
    username = (
        args.username
        or os.environ.get("MINI_TRACKER_USERNAME")
        or os.environ.get("MLWARDEN_USERNAME")
        or DEFAULT_USERNAME
    )
    password = (
        args.password
        or os.environ.get("MINI_TRACKER_PASSWORD")
        or os.environ.get("MLWARDEN_PASSWORD")
        or DEFAULT_PASSWORD
    )
    project = (
        args.project
        or os.environ.get("MINI_TRACKER_PROJECT")
        or os.environ.get("MLWARDEN_PROJECT")
        or DEFAULT_PROJECT
    )
    frontend_url = (
        args.frontend_url or os.environ.get("MINI_TRACKER_FRONTEND_URL") or DEFAULT_FRONTEND_URL
    )
    outputs_dir = Path(args.outputs_dir or DEFAULT_OUTPUTS_DIR).expanduser().resolve()
    return DemoConfig(
        base_url=base_url.rstrip("/"),
        api_key=api_key,
        username=username,
        password=password,
        project=project,
        frontend_url=frontend_url.rstrip("/"),
        outputs_dir=outputs_dir,
    )


def auth_header(token: str | None) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"} if token else {}


def token_is_accepted(base_url: str, token: str | None) -> bool:
    if not token:
        return False

    import httpx

    response = httpx.get(
        f"{base_url}/api/projects",
        headers=auth_header(token),
        params={"limit": 1},
        timeout=5.0,
    )
    if response.status_code == 401:
        return False
    response.raise_for_status()
    return True


def login_token(config: DemoConfig) -> str:
    import httpx

    response = httpx.post(
        f"{config.base_url}/api/auth/login",
        json={"username": config.username, "password": config.password},
        timeout=5.0,
    )
    response.raise_for_status()
    return str(response.json()["access_token"])


def resolve_auth_token(config: DemoConfig) -> str:
    try:
        if token_is_accepted(config.base_url, config.api_key):
            return config.api_key
    except Exception:
        pass

    try:
        return login_token(config)
    except Exception as exc:
        raise RuntimeError(
            "Demo authentication failed. Set APP_API_KEY=dev-api-key before starting "
            "the backend, pass --api-key with the configured key, or pass "
            "--username/--password for a valid UI account."
        ) from exc


def make_tracker(config: DemoConfig):
    from mlwarden import Tracker

    return Tracker(
        base_url=config.base_url,
        api_key=resolve_auth_token(config),
        project=config.project,
        timeout=60.0,
    )


def ensure_project(tracker: Any, config: DemoConfig) -> dict[str, Any]:
    return tracker.get_or_create_project(
        config.project,
        description="Real SDK-seeded PyTorch and TensorFlow demo project.",
    )


def check_backend(config: DemoConfig) -> dict[str, Any]:
    import httpx

    url = f"{config.base_url}/api/health"
    headers = {"Authorization": f"Bearer {config.api_key}"} if config.api_key else {}
    try:
        response = httpx.get(url, headers=headers, timeout=5.0)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise RuntimeError(
            f"Backend is not reachable at {url}. Start the FastAPI server first."
        ) from exc
    return response.json()


def ensure_output_dir(base_dir: Path, run_name: str | None = None) -> Path:
    target = base_dir / run_name if run_name else base_dir
    target.mkdir(parents=True, exist_ok=True)
    return target


def git_commit() -> str:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=PROJECT_ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return "demo-commit"
    return result.stdout.strip() or "demo-commit"


def demo_metadata(
    *,
    framework: str,
    framework_version: str,
    device: str = "cpu",
    created_by: str = "examples/seed_real_demo_data.py",
) -> dict[str, Any]:
    return {
        "hostname": socket.gethostname() or "demo-worker-01",
        "git_commit": git_commit(),
        "python_version": platform.python_version(),
        "framework_version": framework_version,
        "framework": framework,
        "device": device,
        "created_by": created_by,
    }


def write_json(path: Path, payload: dict[str, Any] | list[dict[str, Any]]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    return path


def write_csv(path: Path, rows: Iterable[dict[str, Any]]) -> Path:
    rows = list(rows)
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


def print_run_links(
    *,
    frontend_url: str,
    project_id: str,
    pytorch_results: list[dict[str, Any]],
    tensorflow_results: list[dict[str, Any]],
) -> None:
    example_pytorch = next(
        (item for item in pytorch_results if item.get("status") == "finished"),
        pytorch_results[0] if pytorch_results else None,
    )
    example_tensorflow = tensorflow_results[0] if tensorflow_results else None
    print("\nOpen the frontend:")
    print(f"- Projects: {frontend_url}/projects")
    print(f"- Demo project: {frontend_url}/projects/{project_id}")
    if example_pytorch:
        print(f"- Example PyTorch run: {frontend_url}/runs/{example_pytorch['run_id']}")
    if example_tensorflow:
        print(f"- Example TensorFlow run: {frontend_url}/runs/{example_tensorflow['run_id']}")

    print("\nSuggested presentation flow:")
    print("1. Open Projects page and show the demo project.")
    print("2. Open Project Detail and show mixed PyTorch/TensorFlow runs.")
    print("3. Open a PyTorch run and show Charts, Logs, Tables, Images, Artifacts.")
    print("4. Open a TensorFlow run and show regression metrics/images.")
    print("5. Open the failed run and show failed status/error logs.")
    print("6. Open the summary report run and show comparison table/artifacts.")
