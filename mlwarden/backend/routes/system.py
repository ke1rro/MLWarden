import os

from fastapi import APIRouter

from ..core import settings
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
