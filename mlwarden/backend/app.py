from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .core import ApiError, error_payload, init_db, safe_string, settings
from .routes import (
    auth,
    events_charts,
    files,
    logs,
    metrics,
    projects,
    run_comparisons,
    runs,
    system,
    tables,
    websocket,
)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings.artifact_root.mkdir(parents=True, exist_ok=True)
    init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="MLWarden Backend", version=settings.version, lifespan=lifespan)
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    @app.exception_handler(ApiError)
    async def api_error_handler(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload(exc.code, exc.message, exc.details),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=error_payload("validation_error", "Invalid request", {"errors": exc.errors()}),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, dict) else {}
        code = safe_string(
            detail.get("code"), "not_found" if exc.status_code == 404 else "http_error"
        )
        message = safe_string(detail.get("message"), safe_string(exc.detail, "HTTP error"))
        details = detail.get("details") if isinstance(detail.get("details"), dict) else {}
        return JSONResponse(
            status_code=exc.status_code, content=error_payload(code, message, details)
        )

    for router in (
        system.router,
        auth.router,
        projects.router,
        runs.router,
        run_comparisons.router,
        metrics.router,
        tables.router,
        logs.router,
        files.router,
        events_charts.router,
        websocket.router,
    ):
        app.include_router(router)

    static_path = settings.static_frontend_path
    if static_path and static_path.exists():
        static_root = static_path.resolve()
        index_file = static_root / "index.html"
        if not index_file.is_file():
            return app

        def is_within_static(path: Path) -> bool:
            try:
                path.relative_to(static_root)
                return True
            except ValueError:
                return False

        @app.api_route(
            "/api/{path:path}",
            methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            include_in_schema=False,
        )
        async def api_fallback(_: str) -> JSONResponse:
            return JSONResponse(
                status_code=404,
                content=error_payload("not_found", "Not found", {}),
            )

        @app.get("/", include_in_schema=False)
        async def frontend_root() -> FileResponse:
            return FileResponse(index_file)

        @app.get("/{path:path}", include_in_schema=False)
        async def frontend_fallback(path: str):
            if path.startswith("api/"):
                return JSONResponse(
                    status_code=404,
                    content=error_payload("not_found", "Not found", {}),
                )

            clean_path = path.lstrip("/")
            if not clean_path:
                return FileResponse(index_file)

            requested = (static_root / clean_path).resolve()
            if is_within_static(requested) and requested.is_file():
                return FileResponse(requested)

            return FileResponse(index_file)

    return app


app = create_app()
