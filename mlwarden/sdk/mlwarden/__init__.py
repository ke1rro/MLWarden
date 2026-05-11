import json
import os
import traceback as traceback_module
from pathlib import Path
from typing import Any

import httpx


class TrackerError(RuntimeError):
    pass


class Tracker:
    def __init__(
        self,
        *,
        base_url: str | None = None,
        api_key: str | None = None,
        project: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        self.base_url = (
            base_url or os.environ.get("MLWARDEN_URL") or "http://localhost:8000"
        ).rstrip("/")
        self.api_key = api_key or os.environ.get("MLWARDEN_API_KEY")
        self.project_name = project or os.environ.get("MLWARDEN_PROJECT") or "default"
        self.client = httpx.Client(base_url=self.base_url, timeout=timeout)

    @property
    def headers(self) -> dict[str, str]:
        if not self.api_key:
            return {}
        return {"Authorization": f"Bearer {self.api_key}"}

    def request(self, method: str, path: str, **kwargs: Any) -> Any:
        headers = {**self.headers, **kwargs.pop("headers", {})}
        response = self.client.request(method, path, headers=headers, **kwargs)
        if response.status_code >= 400:
            try:
                detail = response.json()
            except ValueError:
                detail = response.text
            raise TrackerError(
                f"{method} {path} failed with {response.status_code}: {detail}"
            )
        if not response.content:
            return {}
        return response.json()

    def get_or_create_project(
        self, name: str, description: str | None = None
    ) -> dict[str, Any]:
        projects = self.request("GET", "/api/projects", params={"name": name})
        items = (
            projects
            if isinstance(projects, list)
            else projects.get("items", projects.get("projects", []))
        )
        for project in items:
            if project.get("name") == name:
                return project
        return self.request(
            "POST",
            "/api/projects",
            json={"name": name, "description": description, "tags": [], "metadata": {}},
        )

    def create_run(
        self,
        project: str | dict[str, Any] | None = None,
        name: str | None = None,
        params: dict[str, Any] | None = None,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> "Run":
        project_obj = (
            project
            if isinstance(project, dict)
            else self.get_or_create_project(project or self.project_name)
        )
        run_data = self.request(
            "POST",
            f"/api/projects/{project_obj['id']}/runs",
            json={
                "name": name,
                "params": params or {},
                "tags": tags or [],
                "metadata": metadata or {},
            },
        )
        return Run(self, run_data)

    def run(
        self,
        *,
        name: str | None = None,
        params: dict[str, Any] | None = None,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> "Run":
        return self.create_run(name=name, params=params, tags=tags, metadata=metadata)


class Run:
    def __init__(self, tracker: Tracker, data: dict[str, Any]) -> None:
        self.tracker = tracker
        self.data = data
        self.id = data["id"]
        self.project_id = data.get("project_id")

    def __enter__(self) -> "Run":
        self.start()
        return self

    def __exit__(self, exc_type: Any, exc: BaseException | None, tb: Any) -> bool:
        if exc is None:
            self.finish()
            return False
        self.fail(
            str(exc),
            error_type=exc.__class__.__name__,
            traceback="".join(traceback_module.format_exception(exc_type, exc, tb)),
        )
        return False

    def start(self) -> dict[str, Any]:
        self.data = self.tracker.request("POST", f"/api/runs/{self.id}/start")
        return self.data

    def finish(self, summary: dict[str, Any] | None = None) -> dict[str, Any]:
        self.data = self.tracker.request(
            "POST", f"/api/runs/{self.id}/finish", json={"summary": summary or {}}
        )
        return self.data

    def fail(
        self,
        error_message: str,
        error_type: str | None = None,
        traceback: str | None = None,
    ) -> dict[str, Any]:
        payload = {
            "error_message": error_message,
            "error_type": error_type,
            "traceback": traceback,
        }
        self.data = self.tracker.request(
            "POST", f"/api/runs/{self.id}/fail", json=payload
        )
        return self.data

    def log_metric(
        self,
        name: str,
        value: float,
        step: int | None = None,
        timestamp: str | None = None,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"name": name, "value": value}
        if step is not None:
            payload["step"] = step
        if timestamp is not None:
            payload["timestamp"] = timestamp
        if context is not None:
            payload["context"] = context
        return self.tracker.request(
            "POST", f"/api/runs/{self.id}/metrics", json=payload
        )

    def log_metrics(self, metrics: list[dict[str, Any]]) -> dict[str, Any]:
        return self.tracker.request(
            "POST", f"/api/runs/{self.id}/metrics/batch", json={"metrics": metrics}
        )

    def log_params(self, params: dict[str, Any]) -> dict[str, Any]:
        return self.tracker.request(
            "PUT", f"/api/runs/{self.id}/params", json={"params": params}
        )

    def log_log(
        self,
        message: str,
        level: str = "info",
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return self.tracker.request(
            "POST",
            f"/api/runs/{self.id}/logs",
            json={"level": level, "message": message, "context": context or {}},
        )

    def log_table(
        self,
        name: str,
        rows: list[dict[str, Any]],
        columns: list[dict[str, Any]] | None = None,
        mode: str = "replace",
    ) -> dict[str, Any]:
        if mode == "append":
            return self.append_table_rows(name, rows)
        return self.tracker.request(
            "PUT",
            f"/api/runs/{self.id}/tables/{name}",
            json={"columns": columns or [], "rows": rows, "metadata": {}},
        )

    def append_table_rows(
        self, name: str, rows: list[dict[str, Any]]
    ) -> dict[str, Any]:
        return self.tracker.request(
            "POST", f"/api/runs/{self.id}/tables/{name}/rows", json={"rows": rows}
        )

    def log_image(
        self,
        path: str | Path,
        name: str | None = None,
        step: int | None = None,
        caption: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        file_path = Path(path)
        data = {"name": name or file_path.stem}
        if step is not None:
            data["step"] = str(step)
        if caption is not None:
            data["caption"] = caption
        if metadata is not None:
            data["metadata"] = json.dumps(metadata)
        with file_path.open("rb") as file:
            return self.tracker.request(
                "POST",
                f"/api/runs/{self.id}/images",
                data=data,
                files={"file": (file_path.name, file, "application/octet-stream")},
            )

    def log_artifact(
        self,
        path: str | Path,
        name: str | None = None,
        artifact_path: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        file_path = Path(path)
        data: dict[str, str] = {}
        if name is not None:
            data["name"] = name
        if artifact_path is not None:
            data["artifact_path"] = artifact_path
        if metadata is not None:
            data["metadata"] = json.dumps(metadata)
        with file_path.open("rb") as file:
            return self.tracker.request(
                "POST",
                f"/api/runs/{self.id}/artifacts",
                data=data,
                files={"file": (file_path.name, file, "application/octet-stream")},
            )


__all__ = ["Tracker", "TrackerError", "Run"]
