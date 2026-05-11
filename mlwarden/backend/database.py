from typing import Any

from .core import (
    decode_row,
    decode_rows,
    execute,
    fetch_all,
    fetch_one,
    json_dumps,
    new_id,
    utc_timestamp,
)


def database_is_healthy() -> bool:
    fetch_one("SELECT 1 AS ok")
    return True


def list_project_rows(include_deleted: bool = False) -> list[dict[str, Any]]:
    if include_deleted:
        rows = fetch_all("SELECT * FROM projects ORDER BY created_at DESC")
    else:
        rows = fetch_all(
            "SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC"
        )
    return decode_rows("projects", rows)


def insert_project(project: dict[str, Any]) -> None:
    execute(
        """
        INSERT INTO projects (id, name, description, tags, metadata, created_at, updated_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            project["id"],
            project["name"],
            project["description"],
            json_dumps(project["tags"]),
            json_dumps(project["metadata"]),
            project["created_at"],
            project["updated_at"],
            project["deleted_at"],
        ),
    )


def update_project_row(project_id: str, updated: dict[str, Any]) -> None:
    execute(
        """
        UPDATE projects
        SET name = ?, description = ?, tags = ?, metadata = ?, updated_at = ?
        WHERE id = ?
        """,
        (
            updated["name"],
            updated["description"],
            json_dumps(updated["tags"]),
            json_dumps(updated["metadata"]),
            updated["updated_at"],
            project_id,
        ),
    )


def soft_delete_project(project_id: str, deleted_at: str) -> None:
    execute(
        "UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ?",
        (deleted_at, deleted_at, project_id),
    )


def project_stats(project_id: str) -> dict[str, Any]:
    return (
        fetch_one(
            """
        SELECT
            COUNT(*) AS run_count,
            SUM(CASE WHEN status = 'running' AND deleted_at IS NULL THEN 1 ELSE 0 END) AS running_run_count,
            MAX(created_at) AS latest_run_at
        FROM runs
        WHERE project_id = ? AND deleted_at IS NULL
        """,
            (project_id,),
        )
        or {}
    )


def get_project_row(project_id: str) -> dict[str, Any] | None:
    return decode_row(
        "projects", fetch_one("SELECT * FROM projects WHERE id = ?", (project_id,))
    )


def get_run_row(run_id: str) -> dict[str, Any] | None:
    return decode_row("runs", fetch_one("SELECT * FROM runs WHERE id = ?", (run_id,)))


def get_table_row(run_id: str, table_name: str) -> dict[str, Any] | None:
    return decode_row(
        "tables_meta",
        fetch_one(
            "SELECT * FROM tables_meta WHERE run_id = ? AND name = ?",
            (run_id, table_name),
        ),
    )


def list_run_rows(
    *,
    project_id: str,
    status: str | None,
    name: str | None,
    sort: str,
    limit: int,
    offset: int,
) -> tuple[list[dict[str, Any]], int]:
    clauses = ["project_id = ?", "deleted_at IS NULL"]
    params: list[Any] = [project_id]
    if status:
        clauses.append("status = ?")
        params.append(status)
    if name:
        clauses.append("name LIKE ?")
        params.append(f"%{name}%")
    order_field = sort.lstrip("-")
    allowed_sort = {"created_at", "started_at", "finished_at", "status", "name"}
    if order_field not in allowed_sort:
        order_field = "created_at"
    direction = "DESC" if sort.startswith("-") else "ASC"
    where = " AND ".join(clauses)
    rows = fetch_all(
        f"""
        SELECT * FROM runs
        WHERE {where}
        ORDER BY {order_field} {direction}
        LIMIT ? OFFSET ?
        """,
        (*params, limit, offset),
    )
    total = fetch_one(f"SELECT COUNT(*) AS total FROM runs WHERE {where}", params)
    return decode_rows("runs", rows), int(total["total"] if total else 0)


def insert_run(run: dict[str, Any]) -> None:
    execute(
        """
        INSERT INTO runs (
            id, project_id, name, description, status, tags, metadata, summary,
            started_at, finished_at, created_at, updated_at, deleted_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            run["id"],
            run["project_id"],
            run["name"],
            run["description"],
            run["status"],
            json_dumps(run["tags"]),
            json_dumps(run["metadata"]),
            json_dumps(run["summary"]),
            run["started_at"],
            run["finished_at"],
            run["created_at"],
            run["updated_at"],
            run["deleted_at"],
        ),
    )


def update_run_row(run_id: str, updated: dict[str, Any]) -> None:
    execute(
        """
        UPDATE runs
        SET name = ?, description = ?, status = ?, tags = ?, metadata = ?, summary = ?, updated_at = ?
        WHERE id = ?
        """,
        (
            updated["name"],
            updated["description"],
            updated["status"],
            json_dumps(updated["tags"]),
            json_dumps(updated["metadata"]),
            json_dumps(updated["summary"]),
            updated["updated_at"],
            run_id,
        ),
    )


def update_run_status_row(
    run_id: str,
    *,
    status: str,
    summary: dict[str, Any],
    started_at: str | None,
    finished_at: str | None,
    updated_at: str,
) -> None:
    execute(
        """
        UPDATE runs
        SET status = ?, summary = ?, started_at = ?, finished_at = ?, updated_at = ?
        WHERE id = ?
        """,
        (status, json_dumps(summary), started_at, finished_at, updated_at, run_id),
    )


def upsert_run_params(run_id: str, params: dict[str, Any]) -> None:
    now = utc_timestamp()
    for key, value in params.items():
        execute(
            """
            INSERT INTO run_params (id, run_id, key, value, value_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(run_id, key) DO UPDATE SET
                value = excluded.value,
                value_json = excluded.value_json
            """,
            (new_id(), run_id, str(key), str(value), json_dumps(value), now),
        )


def list_run_params(run_id: str) -> list[dict[str, Any]]:
    return fetch_all(
        "SELECT * FROM run_params WHERE run_id = ? ORDER BY key", (run_id,)
    )


def insert_event(event: dict[str, Any]) -> None:
    execute(
        """
        INSERT INTO events (id, project_id, run_id, type, payload, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            event["id"],
            event["project_id"],
            event["run_id"],
            event["type"],
            json_dumps(event["payload"]),
            event["created_at"],
        ),
    )


def list_run_event_rows(
    run_id: str, *, limit: int, offset: int
) -> tuple[list[dict[str, Any]], int]:
    rows = fetch_all(
        "SELECT * FROM events WHERE run_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?",
        (run_id, limit, offset),
    )
    total = fetch_one(
        "SELECT COUNT(*) AS total FROM events WHERE run_id = ?", (run_id,)
    )
    return decode_rows("events", rows), int(total["total"] if total else 0)


def recent_event_rows(limit: int) -> list[dict[str, Any]]:
    return decode_rows(
        "events",
        fetch_all("SELECT * FROM events ORDER BY created_at DESC LIMIT ?", (limit,)),
    )


def insert_metric(metric: dict[str, Any]) -> None:
    execute(
        """
        INSERT INTO metrics (id, run_id, name, value, step, timestamp, context, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            metric["id"],
            metric["run_id"],
            metric["name"],
            metric["value"],
            metric["step"],
            metric["timestamp"],
            json_dumps(metric["context"]),
            metric["created_at"],
        ),
    )


def get_metric_summary_row(run_id: str, name: str) -> dict[str, Any] | None:
    return fetch_one(
        "SELECT * FROM metric_summaries WHERE run_id = ? AND name = ?", (run_id, name)
    )


def increment_metric_summary(
    run_id: str, name: str, value: float, step: int | None
) -> None:
    now = utc_timestamp()
    if get_metric_summary_row(run_id, name):
        execute(
            """
            UPDATE metric_summaries
            SET latest_value = ?, latest_step = ?, min_value = MIN(min_value, ?),
                max_value = MAX(max_value, ?), count = count + 1, updated_at = ?
            WHERE run_id = ? AND name = ?
            """,
            (value, step, value, value, now, run_id, name),
        )
    else:
        execute(
            """
            INSERT INTO metric_summaries (
                id, run_id, name, latest_value, latest_step, min_value, max_value, count, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (new_id(), run_id, name, value, step, value, value, 1, now),
        )


def metric_rows(run_id: str, names: list[str]) -> list[dict[str, Any]]:
    if names:
        placeholders = ",".join("?" for _ in names)
        rows = fetch_all(
            f"""
            SELECT * FROM metrics
            WHERE run_id = ? AND name IN ({placeholders})
            ORDER BY name ASC, COALESCE(step, 9223372036854775807) ASC, timestamp ASC
            """,
            (run_id, *names),
        )
    else:
        rows = fetch_all(
            """
            SELECT * FROM metrics
            WHERE run_id = ?
            ORDER BY name ASC, COALESCE(step, 9223372036854775807) ASC, timestamp ASC
            """,
            (run_id,),
        )
    return decode_rows("metrics", rows)


def metric_summary_rows(run_id: str) -> list[dict[str, Any]]:
    return fetch_all(
        "SELECT * FROM metric_summaries WHERE run_id = ? ORDER BY name", (run_id,)
    )


def insert_log(log: dict[str, Any]) -> None:
    execute(
        """
        INSERT INTO logs (id, run_id, level, message, timestamp, context, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            log["id"],
            log["run_id"],
            log["level"],
            log["message"],
            log["timestamp"],
            json_dumps(log["context"]),
            log["created_at"],
        ),
    )


def log_rows(
    run_id: str, *, level: str | None, search: str | None, limit: int, offset: int
) -> tuple[list[dict[str, Any]], int]:
    clauses = ["run_id = ?"]
    params: list[Any] = [run_id]
    if level:
        clauses.append("level = ?")
        params.append(level.lower())
    if search:
        clauses.append("message LIKE ?")
        params.append(f"%{search}%")
    where = " AND ".join(clauses)
    rows = fetch_all(
        f"SELECT * FROM logs WHERE {where} ORDER BY timestamp ASC, created_at ASC LIMIT ? OFFSET ?",
        (*params, limit, offset),
    )
    total = fetch_one(f"SELECT COUNT(*) AS total FROM logs WHERE {where}", params)
    return decode_rows("logs", rows), int(total["total"] if total else 0)


def table_rows_for_run(run_id: str) -> list[dict[str, Any]]:
    tables = decode_rows(
        "tables_meta",
        fetch_all(
            "SELECT * FROM tables_meta WHERE run_id = ? ORDER BY name", (run_id,)
        ),
    )
    for table in tables:
        count = fetch_one(
            "SELECT COUNT(*) AS total FROM table_rows WHERE table_id = ?",
            (table["id"],),
        )
        table["row_count"] = count["total"] if count else 0
    return tables


def find_table_id(run_id: str, table_name: str) -> str | None:
    row = fetch_one(
        "SELECT id FROM tables_meta WHERE run_id = ? AND name = ?", (run_id, table_name)
    )
    return row["id"] if row else None


def replace_table(
    table_id: str,
    run_id: str,
    name: str,
    columns: list[dict[str, Any]],
    metadata: dict[str, Any],
    rows: list[dict[str, Any]],
) -> None:
    now = utc_timestamp()
    existing = find_table_id(run_id, name)
    if existing:
        execute(
            """
            UPDATE tables_meta
            SET columns = ?, metadata = ?, updated_at = ?
            WHERE id = ?
            """,
            (json_dumps(columns), json_dumps(metadata), now, existing),
        )
        execute("DELETE FROM table_rows WHERE table_id = ?", (existing,))
        table_id = existing
    else:
        execute(
            """
            INSERT INTO tables_meta (id, run_id, name, columns, metadata, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                table_id,
                run_id,
                name,
                json_dumps(columns),
                json_dumps(metadata),
                now,
                now,
            ),
        )
    for index, row in enumerate(rows):
        execute(
            """
            INSERT INTO table_rows (id, table_id, row_index, data, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (new_id(), table_id, index, json_dumps(row), now),
        )


def append_rows_to_table(table_id: str, rows: list[dict[str, Any]]) -> None:
    current = fetch_one(
        "SELECT COALESCE(MAX(row_index), -1) AS max_index FROM table_rows WHERE table_id = ?",
        (table_id,),
    )
    start = int(current["max_index"]) + 1
    now = utc_timestamp()
    for offset, row in enumerate(rows):
        execute(
            """
            INSERT INTO table_rows (id, table_id, row_index, data, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (new_id(), table_id, start + offset, json_dumps(row), now),
        )
    execute("UPDATE tables_meta SET updated_at = ? WHERE id = ?", (now, table_id))


def paged_table_rows(
    table_id: str, *, limit: int, offset: int
) -> tuple[list[dict[str, Any]], int]:
    rows = fetch_all(
        """
        SELECT * FROM table_rows
        WHERE table_id = ?
        ORDER BY row_index ASC
        LIMIT ? OFFSET ?
        """,
        (table_id, limit, offset),
    )
    total = fetch_one(
        "SELECT COUNT(*) AS total FROM table_rows WHERE table_id = ?", (table_id,)
    )
    return decode_rows("table_rows", rows), int(total["total"] if total else 0)


def insert_image(image: dict[str, Any]) -> None:
    execute(
        """
        INSERT INTO images (
            id, run_id, name, original_filename, content_type, size_bytes, width, height,
            step, caption, metadata, storage_path, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            image["id"],
            image["run_id"],
            image["name"],
            image["original_filename"],
            image["content_type"],
            image["size_bytes"],
            image["width"],
            image["height"],
            image["step"],
            image["caption"],
            json_dumps(image["metadata"]),
            image["storage_path"],
            image["created_at"],
        ),
    )


def image_rows(
    run_id: str, *, limit: int, offset: int
) -> tuple[list[dict[str, Any]], int]:
    rows = fetch_all(
        "SELECT * FROM images WHERE run_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (run_id, limit, offset),
    )
    total = fetch_one(
        "SELECT COUNT(*) AS total FROM images WHERE run_id = ?", (run_id,)
    )
    return decode_rows("images", rows), int(total["total"] if total else 0)


def get_image_row(image_id: str) -> dict[str, Any] | None:
    return decode_row(
        "images", fetch_one("SELECT * FROM images WHERE id = ?", (image_id,))
    )


def insert_artifact(artifact: dict[str, Any]) -> None:
    execute(
        """
        INSERT INTO artifacts (
            id, run_id, name, original_filename, artifact_path, content_type,
            size_bytes, metadata, storage_path, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            artifact["id"],
            artifact["run_id"],
            artifact["name"],
            artifact["original_filename"],
            artifact["artifact_path"],
            artifact["content_type"],
            artifact["size_bytes"],
            json_dumps(artifact["metadata"]),
            artifact["storage_path"],
            artifact["created_at"],
        ),
    )


def artifact_rows(
    run_id: str, *, limit: int, offset: int
) -> tuple[list[dict[str, Any]], int]:
    rows = fetch_all(
        "SELECT * FROM artifacts WHERE run_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (run_id, limit, offset),
    )
    total = fetch_one(
        "SELECT COUNT(*) AS total FROM artifacts WHERE run_id = ?", (run_id,)
    )
    return decode_rows("artifacts", rows), int(total["total"] if total else 0)


def get_artifact_row(artifact_id: str) -> dict[str, Any] | None:
    return decode_row(
        "artifacts", fetch_one("SELECT * FROM artifacts WHERE id = ?", (artifact_id,))
    )


def chart_rows(project_id: str) -> list[dict[str, Any]]:
    return decode_rows(
        "chart_configs",
        fetch_all(
            "SELECT * FROM chart_configs WHERE project_id = ? ORDER BY created_at DESC",
            (project_id,),
        ),
    )


def insert_chart(chart: dict[str, Any]) -> None:
    execute(
        """
        INSERT INTO chart_configs (id, project_id, name, chart_type, config, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            chart["id"],
            chart["project_id"],
            chart["name"],
            chart["chart_type"],
            json_dumps(chart["config"]),
            chart["created_by"],
            chart["created_at"],
            chart["updated_at"],
        ),
    )


def get_chart_row(chart_id: str) -> dict[str, Any] | None:
    return decode_row(
        "chart_configs",
        fetch_one("SELECT * FROM chart_configs WHERE id = ?", (chart_id,)),
    )


def update_chart_row(chart_id: str, updated: dict[str, Any]) -> None:
    execute(
        """
        UPDATE chart_configs
        SET name = ?, chart_type = ?, config = ?, updated_at = ?
        WHERE id = ?
        """,
        (
            updated["name"],
            updated["chart_type"],
            json_dumps(updated["config"]),
            updated["updated_at"],
            chart_id,
        ),
    )


def delete_chart_row(chart_id: str) -> None:
    execute("DELETE FROM chart_configs WHERE id = ?", (chart_id,))


__all__ = [name for name in globals() if not name.startswith("_")]
