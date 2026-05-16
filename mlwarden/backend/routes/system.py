import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends

from ..core import Principal, require_principal, settings
from ..database import database_is_healthy

router = APIRouter()


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
        return None, None, "NVIDIA GPU unavailable"

    first_line = result.stdout.splitlines()[0] if result.stdout.splitlines() else ""
    parts = [part.strip() for part in first_line.split(",")]
    if len(parts) < 3:
        return None, None, "NVIDIA GPU unavailable"
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


@router.get("/api/system/metrics")
async def system_metrics(_: Principal = Depends(require_principal)) -> dict[str, Any]:
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
