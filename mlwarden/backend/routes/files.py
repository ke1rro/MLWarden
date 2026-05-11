from typing import Any

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import JSONResponse, Response

from ..core import (
    IMAGE_CONTENT_TYPES,
    ApiError,
    Principal,
    create_event,
    get_run_or_404,
    image_dimensions,
    new_id,
    normalize_limit_offset,
    parse_json_object,
    read_upload_bytes,
    require_principal,
    resolve_storage_path,
    sanitize_filename,
    storage_path_for,
    utc_timestamp,
    validate_artifact_path,
)
from ..database import (
    artifact_rows,
    get_artifact_row,
    get_image_row,
    image_rows,
    insert_artifact,
    insert_image,
)

router = APIRouter()


@router.post("/api/runs/{run_id}/images")
async def upload_image(
    run_id: str,
    file: UploadFile = File(...),
    name: str | None = Form(default=None),
    step: int | None = Form(default=None),
    caption: str | None = Form(default=None),
    metadata: str | None = Form(default=None),
    _: Principal = Depends(require_principal),
) -> JSONResponse:
    run = get_run_or_404(run_id)
    content_type = file.content_type or "application/octet-stream"
    if content_type not in IMAGE_CONTENT_TYPES:
        raise ApiError(
            415,
            "unsupported_image_type",
            "Only PNG, JPEG, and WebP images are supported",
        )
    content = await read_upload_bytes(file)
    parsed_metadata = parse_json_object(metadata)
    width, height = image_dimensions(content_type, content)
    original_filename = file.filename or "image"
    storage_path, absolute_path = storage_path_for(run, "images", original_filename)
    absolute_path.write_bytes(content)
    image = {
        "id": new_id(),
        "run_id": run_id,
        "name": name or sanitize_filename(original_filename, "image"),
        "original_filename": original_filename,
        "content_type": content_type,
        "size_bytes": len(content),
        "width": width,
        "height": height,
        "step": step,
        "caption": caption,
        "metadata": parsed_metadata,
        "storage_path": storage_path,
        "created_at": utc_timestamp(),
    }
    insert_image(image)
    await create_event(
        "image.uploaded",
        project_id=run["project_id"],
        run_id=run_id,
        payload={"image_id": image["id"], "name": image["name"], "step": image["step"]},
    )
    return JSONResponse(status_code=201, content=image)


@router.get("/api/runs/{run_id}/images")
async def list_images(
    run_id: str,
    limit: int = 100,
    offset: int = 0,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    get_run_or_404(run_id)
    limit, offset = normalize_limit_offset(limit, offset)
    rows, total = image_rows(run_id, limit=limit, offset=offset)
    return {
        "items": rows,
        "limit": limit,
        "offset": offset,
        "total": total,
    }


@router.get("/api/images/{image_id}")
async def get_image(
    image_id: str, _: Principal = Depends(require_principal)
) -> dict[str, Any]:
    image = get_image_row(image_id)
    if not image:
        raise ApiError(404, "not_found", "Image not found")
    return image


@router.get("/api/images/{image_id}/file")
async def get_image_file(
    image_id: str, _: Principal = Depends(require_principal)
) -> Response:
    image = await get_image(image_id)
    path = resolve_storage_path(image["storage_path"])
    if not path.exists():
        raise ApiError(404, "not_found", "Image file not found")
    return Response(
        content=path.read_bytes(),
        media_type=image["content_type"],
        headers={
            "content-disposition": f"attachment; filename={sanitize_filename(image['original_filename'])}"
        },
    )


@router.post("/api/runs/{run_id}/artifacts")
async def upload_artifact(
    run_id: str,
    file: UploadFile = File(...),
    name: str | None = Form(default=None),
    artifact_path: str | None = Form(default=None),
    metadata: str | None = Form(default=None),
    _: Principal = Depends(require_principal),
) -> JSONResponse:
    run = get_run_or_404(run_id)
    safe_artifact_path = validate_artifact_path(artifact_path)
    content = await read_upload_bytes(file)
    parsed_metadata = parse_json_object(metadata)
    original_filename = file.filename or "artifact"
    content_type = file.content_type or "application/octet-stream"
    storage_path, absolute_path = storage_path_for(run, "artifacts", original_filename)
    absolute_path.write_bytes(content)
    artifact = {
        "id": new_id(),
        "run_id": run_id,
        "name": name or sanitize_filename(original_filename, "artifact"),
        "original_filename": original_filename,
        "artifact_path": safe_artifact_path,
        "content_type": content_type,
        "size_bytes": len(content),
        "metadata": parsed_metadata,
        "storage_path": storage_path,
        "created_at": utc_timestamp(),
    }
    insert_artifact(artifact)
    await create_event(
        "artifact.uploaded",
        project_id=run["project_id"],
        run_id=run_id,
        payload={
            "artifact_id": artifact["id"],
            "name": artifact["name"],
            "artifact_path": artifact["artifact_path"],
        },
    )
    return JSONResponse(status_code=201, content=artifact)


@router.get("/api/runs/{run_id}/artifacts")
async def list_artifacts(
    run_id: str,
    limit: int = 100,
    offset: int = 0,
    _: Principal = Depends(require_principal),
) -> dict[str, Any]:
    get_run_or_404(run_id)
    limit, offset = normalize_limit_offset(limit, offset)
    rows, total = artifact_rows(run_id, limit=limit, offset=offset)
    return {
        "items": rows,
        "limit": limit,
        "offset": offset,
        "total": total,
    }


@router.get("/api/artifacts/{artifact_id}")
async def get_artifact(
    artifact_id: str, _: Principal = Depends(require_principal)
) -> dict[str, Any]:
    artifact = get_artifact_row(artifact_id)
    if not artifact:
        raise ApiError(404, "not_found", "Artifact not found")
    return artifact


@router.get("/api/artifacts/{artifact_id}/download")
async def download_artifact(
    artifact_id: str, _: Principal = Depends(require_principal)
) -> Response:
    artifact = await get_artifact(artifact_id)
    path = resolve_storage_path(artifact["storage_path"])
    if not path.exists():
        raise ApiError(404, "not_found", "Artifact file not found")
    return Response(
        content=path.read_bytes(),
        media_type=artifact["content_type"],
        headers={
            "content-disposition": f"attachment; filename={sanitize_filename(artifact['original_filename'])}"
        },
    )
