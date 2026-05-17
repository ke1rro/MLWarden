import asyncio
import logging
import os
import re
import shutil
import subprocess
import threading
from collections import deque
from contextlib import suppress
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends

from ..core import Principal, require_principal, settings, utc_now, utc_timestamp
from ..database import (
    database_is_healthy,
    insert_system_metric_sample,
    system_metric_sample_rows,
    system_metric_sample_rows_since,
)

router = APIRouter()
SYSTEM_TELEMETRY_INTERVAL_SECONDS = 5
SYSTEM_TELEMETRY_HISTORY_LIMIT = 240
SYSTEM_TELEMETRY_CACHE_SIZE = 1000
logger = logging.getLogger(__name__)
_collector_task: asyncio.Task[None] | None = None
_system_metric_cache: deque[dict[str, Any]] = deque(maxlen=SYSTEM_TELEMETRY_CACHE_SIZE)
_system_metric_cache_lock = threading.RLock()


@router.get("/api/health")
async def health() -> dict[str, str]:
    try:
        database_is_healthy()
        database = "ok"
    except Exception:
        database = "error"
    storage = (
        "ok"
        if settings.artifact_root.exists() and os.access(settings.artifact_root, os.W_OK)
        else "error"
    )
    status = "ok" if database == "ok" and storage == "ok" else "error"
    return {"status": status, "database": database, "artifact_storage": storage}


@router.get("/api/version")
async def version() -> dict[str, str]:
    return {"version": settings.version}


def percentage(used: float, total: float) -> float | None:
    if total <= 0:
        return None
    return round((used / total) * 100, 1)


def read_float(path: Path, divisor: float = 1.0) -> float | None:
    try:
        return round(float(path.read_text(encoding="utf-8").strip()) / divisor, 1)
    except (OSError, ValueError):
        return None


def optional_psutil() -> Any | None:
    try:
        import psutil  # type: ignore
    except ImportError:
        return None
    return psutil


def linux_cpu_usage() -> float | None:
    try:
        lines = Path("/proc/stat").read_text(encoding="utf-8").splitlines()
    except OSError:
        return None
    cpu_line = next((line for line in lines if line.startswith("cpu ")), "")
    values = [float(value) for value in cpu_line.split()[1:]]
    if len(values) < 4:
        return None
    idle = values[3] + (values[4] if len(values) > 4 else 0)
    total = sum(values)
    if total <= 0:
        return None
    return round(((total - idle) / total) * 100, 1)


def mac_cpu_usage() -> float | None:
    try:
        result = subprocess.run(
            ["top", "-l", "1", "-n", "0"],
            check=True,
            capture_output=True,
            text=True,
            timeout=3,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    match = re.search(r"CPU usage:\s*([\d.]+)% user,\s*([\d.]+)% sys", result.stdout)
    if not match:
        return None
    return round(float(match.group(1)) + float(match.group(2)), 1)


def cpu_usage() -> float | None:
    psutil = optional_psutil()
    if psutil:
        return round(float(psutil.cpu_percent(interval=0.1)), 1)
    if Path("/proc/stat").exists():
        return linux_cpu_usage()
    mac_usage = mac_cpu_usage()
    if mac_usage is not None:
        return mac_usage
    try:
        load_1m = os.getloadavg()[0]
    except (AttributeError, OSError):
        return None
    return min(100.0, round((load_1m / max(1, os.cpu_count() or 1)) * 100, 1))


def mac_memory_usage() -> tuple[float | None, str] | None:
    try:
        total_result = subprocess.run(
            ["sysctl", "-n", "hw.memsize"],
            check=True,
            capture_output=True,
            text=True,
            timeout=2,
        )
        vm_result = subprocess.run(
            ["vm_stat"],
            check=True,
            capture_output=True,
            text=True,
            timeout=2,
        )
    except (OSError, subprocess.SubprocessError):
        return None

    try:
        total = float(total_result.stdout.strip())
    except ValueError:
        return None

    page_size_match = re.search(r"page size of (\d+) bytes", vm_result.stdout)
    page_size = float(page_size_match.group(1)) if page_size_match else 4096.0
    pages: dict[str, float] = {}
    for line in vm_result.stdout.splitlines():
        if ":" not in line:
            continue
        key, raw_value = line.split(":", 1)
        digits = re.sub(r"[^0-9]", "", raw_value)
        if digits:
            pages[key.strip()] = float(digits)

    free = pages.get("Pages free", 0) + pages.get("Pages speculative", 0)
    used = max(0.0, total - free * page_size)
    return percentage(used, total), f"{used / 1024**3:.1f} / {total / 1024**3:.1f} GB"


def memory_usage() -> tuple[float | None, str]:
    psutil = optional_psutil()
    if psutil:
        memory = psutil.virtual_memory()
        return (
            round(float(memory.percent), 1),
            f"{memory.used / 1024**3:.1f} / {memory.total / 1024**3:.1f} GB",
        )

    meminfo = Path("/proc/meminfo")
    if meminfo.exists():
        values: dict[str, float] = {}
        for line in meminfo.read_text(encoding="utf-8").splitlines():
            parts = line.split()
            if len(parts) >= 2:
                values[parts[0].rstrip(":")] = float(parts[1]) * 1024
        total = values.get("MemTotal", 0)
        available = values.get("MemAvailable", 0)
        used = total - available
        return percentage(used, total), f"{used / 1024**3:.1f} / {total / 1024**3:.1f} GB"

    mac_memory = mac_memory_usage()
    if mac_memory is not None:
        return mac_memory

    return None, "memory sensor unavailable"


def disk_usage() -> tuple[float | None, str]:
    target = settings.artifact_root
    while not target.exists() and target.parent != target:
        target = target.parent
    usage = shutil.disk_usage(target)
    used = usage.total - usage.free
    return percentage(used, usage.total), f"{used / 1024**3:.1f} / {usage.total / 1024**3:.1f} GB"


def cpu_temperature() -> tuple[float | None, str]:
    psutil = optional_psutil()
    if psutil and hasattr(psutil, "sensors_temperatures"):
        try:
            for name, entries in psutil.sensors_temperatures().items():
                for entry in entries:
                    if entry.current is not None:
                        return round(float(entry.current), 1), name
        except (AttributeError, OSError):
            pass

    for path in Path("/sys/class/thermal").glob("thermal_zone*/temp"):
        value = read_float(path, 1000)
        if value is not None:
            label_path = path.parent / "type"
            try:
                label = label_path.read_text(encoding="utf-8").strip()
            except OSError:
                label = path.parent.name
            return value, label
    return None, "CPU temperature sensor unavailable"


def nvidia_gpu_metrics() -> tuple[float | None, float | None, str]:
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=temperature.gpu,utilization.gpu,name",
                "--format=csv,noheader,nounits",
            ],
            check=True,
            capture_output=True,
            text=True,
            timeout=2,
        )
    except (OSError, subprocess.SubprocessError):
        return None, None, "No NVIDIA GPU detected"

    first_line = result.stdout.splitlines()[0] if result.stdout.splitlines() else ""
    parts = [part.strip() for part in first_line.split(",")]
    if len(parts) < 3:
        return None, None, "No NVIDIA GPU detected"
    try:
        temperature = round(float(parts[0]), 1)
    except ValueError:
        temperature = None
    try:
        usage = round(float(parts[1]), 1)
    except ValueError:
        usage = None
    return temperature, usage, parts[2]


def metric(
    metric_id: str,
    label: str,
    value: float | None,
    unit: str,
    detail: str,
) -> dict[str, Any]:
    return {
        "id": metric_id,
        "label": label,
        "value": value,
        "unit": unit,
        "detail": detail,
        "available": value is not None,
    }


def collect_system_metrics() -> dict[str, Any]:
    gpu_temp, gpu_usage, gpu_detail = nvidia_gpu_metrics()
    cpu_temp, cpu_temp_detail = cpu_temperature()
    memory_percent, memory_detail = memory_usage()
    disk_percent, disk_detail = disk_usage()

    return {
        "metrics": [
            metric("gpu-temp", "GPU temp", gpu_temp, "C", gpu_detail),
            metric("cpu-temp", "CPU temp", cpu_temp, "C", cpu_temp_detail),
            metric("gpu-usage", "GPU usage", gpu_usage, "%", gpu_detail),
            metric("cpu-usage", "CPU usage", cpu_usage(), "%", "host CPU"),
            metric("memory", "Memory", memory_percent, "%", memory_detail),
            metric("disk", "Disk", disk_percent, "%", disk_detail),
        ]
    }


def rounded_utc_timestamp() -> str:
    return utc_timestamp(utc_now().replace(microsecond=0))


def metric_by_id(sample: dict[str, Any], metric_id: str) -> dict[str, Any]:
    return next(metric for metric in sample["metrics"] if metric["id"] == metric_id)


def collect_system_metric_sample() -> dict[str, Any]:
    snapshot = collect_system_metrics()
    gpu_temp = metric_by_id(snapshot, "gpu-temp")
    gpu_usage = metric_by_id(snapshot, "gpu-usage")
    cpu_temp = metric_by_id(snapshot, "cpu-temp")
    cpu_usage_metric = metric_by_id(snapshot, "cpu-usage")
    memory = metric_by_id(snapshot, "memory")
    disk = metric_by_id(snapshot, "disk")
    timestamp = rounded_utc_timestamp()

    return {
        "timestamp": timestamp,
        "gpu_temp": gpu_temp["value"],
        "gpu_usage": gpu_usage["value"],
        "cpu_temp": cpu_temp["value"],
        "cpu_usage": cpu_usage_metric["value"],
        "memory_usage": memory["value"],
        "disk_usage": disk["value"],
        "gpu_detail": gpu_temp["detail"],
        "cpu_temp_detail": cpu_temp["detail"],
        "cpu_usage_detail": cpu_usage_metric["detail"],
        "memory_detail": memory["detail"],
        "disk_detail": disk["detail"],
        "created_at": timestamp,
    }


def system_metric_sample_response(sample: dict[str, Any]) -> dict[str, Any]:
    gpu_detail = sample["gpu_detail"]
    return {
        "timestamp": sample["timestamp"],
        "metrics": [
            metric("gpu-temp", "GPU temp", sample["gpu_temp"], "C", gpu_detail),
            metric("cpu-temp", "CPU temp", sample["cpu_temp"], "C", sample["cpu_temp_detail"]),
            metric("gpu-usage", "GPU usage", sample["gpu_usage"], "%", gpu_detail),
            metric("cpu-usage", "CPU usage", sample["cpu_usage"], "%", sample["cpu_usage_detail"]),
            metric("memory", "Memory", sample["memory_usage"], "%", sample["memory_detail"]),
            metric("disk", "Disk", sample["disk_usage"], "%", sample["disk_detail"]),
        ],
    }


def append_system_metric_cache(sample: dict[str, Any]) -> None:
    with _system_metric_cache_lock:
        if any(item["timestamp"] == sample["timestamp"] for item in _system_metric_cache):
            return
        _system_metric_cache.append(dict(sample))


def load_system_metric_cache() -> None:
    rows = system_metric_sample_rows(SYSTEM_TELEMETRY_CACHE_SIZE)
    with _system_metric_cache_lock:
        _system_metric_cache.clear()
        _system_metric_cache.extend(rows)


def cached_system_metric_rows(limit: int, since: str | None = None) -> list[dict[str, Any]]:
    with _system_metric_cache_lock:
        rows = list(_system_metric_cache)

    if not rows:
        if since:
            return system_metric_sample_rows_since(since, limit)
        return system_metric_sample_rows(limit)

    if since:
        if since >= rows[0]["timestamp"]:
            cached_rows = [row for row in rows if row["timestamp"] > since][:limit]
            return cached_rows or system_metric_sample_rows_since(since, limit)
        return system_metric_sample_rows_since(since, limit)

    if len(rows) < limit:
        return system_metric_sample_rows(limit)
    return rows[-limit:]


def persist_system_metric_sample() -> None:
    sample = collect_system_metric_sample()
    insert_system_metric_sample(sample)
    append_system_metric_cache(sample)


async def run_system_telemetry_collector() -> None:
    while True:
        try:
            await asyncio.to_thread(persist_system_metric_sample)
        except Exception:
            logger.exception("Failed to collect system telemetry sample")
        await asyncio.sleep(SYSTEM_TELEMETRY_INTERVAL_SECONDS)


async def start_system_telemetry_collector() -> None:
    global _collector_task
    if _collector_task and not _collector_task.done():
        return
    await asyncio.to_thread(load_system_metric_cache)
    _collector_task = asyncio.create_task(run_system_telemetry_collector())


async def stop_system_telemetry_collector() -> None:
    global _collector_task
    if not _collector_task:
        return
    _collector_task.cancel()
    with suppress(asyncio.CancelledError):
        await _collector_task
    _collector_task = None


@router.get("/api/system/metrics")
async def system_metrics(_: Principal = Depends(require_principal)) -> dict[str, Any]:
    return await asyncio.to_thread(collect_system_metrics)


@router.get("/api/system/metrics/history")
async def system_metrics_history(
    limit: int = SYSTEM_TELEMETRY_HISTORY_LIMIT,
    since: str | None = None,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    limit = min(max(limit, 1), 1000)
    rows = await asyncio.to_thread(cached_system_metric_rows, limit, since)
    samples = [system_metric_sample_response(row) for row in rows]
    return {"samples": samples}
