import os
from dataclasses import dataclass
from pathlib import Path

DEV_CORS_ORIGINS = [
    *(f"http://localhost:{port}" for port in range(5173, 5180)),
    *(f"http://127.0.0.1:{port}" for port in range(5173, 5180)),
]


@dataclass(frozen=True)
class Settings:
    env: str
    secret_key: str
    users: dict[str, str]
    api_key: str | None
    database_url: str
    artifact_root: Path
    static_frontend_path: Path | None
    max_upload_mb: int
    cors_origins: list[str]
    token_ttl_minutes: int
    allow_project_delete: bool
    allow_run_delete: bool
    version: str = "0.1.0"


def parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def parse_users(raw: str) -> dict[str, str]:
    users: dict[str, str] = {}
    for item in raw.split(","):
        item = item.strip()
        if not item:
            continue
        username, separator, password_hash = item.partition(":")
        if separator and username.strip():
            users[username.strip()] = password_hash.strip()
    return users


def parse_optional_path(value: str | None) -> Path | None:
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    return Path(value).expanduser().resolve()


def load_settings() -> Settings:
    env = os.environ.get("APP_ENV", "development")
    database_url = os.environ.get("APP_DATABASE_URL", "sqlite:///./mlwarden.sqlite3")
    artifact_root = Path(os.environ.get("APP_ARTIFACT_ROOT", "./artifacts")).resolve()
    static_frontend_path = parse_optional_path(os.environ.get("APP_STATIC_FRONTEND_PATH"))
    cors_origins = [
        origin.strip()
        for origin in os.environ.get("APP_CORS_ORIGINS", ",".join(DEV_CORS_ORIGINS[:2])).split(",")
        if origin.strip()
    ]
    if env == "development":
        cors_origins = list(dict.fromkeys([*cors_origins, *DEV_CORS_ORIGINS]))
    return Settings(
        env=env,
        secret_key=os.environ.get("APP_SECRET_KEY", "change-me"),
        users=parse_users(os.environ.get("APP_USERS", "admin:password")),
        api_key=os.environ.get("APP_API_KEY"),
        database_url=database_url,
        artifact_root=artifact_root,
        static_frontend_path=static_frontend_path,
        max_upload_mb=int(os.environ.get("APP_MAX_UPLOAD_MB", "512")),
        cors_origins=cors_origins,
        token_ttl_minutes=int(os.environ.get("APP_AUTH_TOKEN_TTL_MINUTES", "1440")),
        allow_project_delete=parse_bool(os.environ.get("APP_ALLOW_PROJECT_DELETE"), False),
        allow_run_delete=parse_bool(os.environ.get("APP_ALLOW_RUN_DELETE"), False),
    )


settings = load_settings()
