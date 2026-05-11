FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt pyproject.toml readme.md ./
COPY mlwarden ./mlwarden

RUN python -m pip install --no-cache-dir --upgrade pip setuptools wheel \
    && python -m pip install --no-cache-dir -r requirements.txt \
    && python -m pip install --no-cache-dir -e .

ENV APP_ENV=production
ENV APP_DATABASE_URL=sqlite:////data/mlwarden.sqlite3
ENV APP_ARTIFACT_ROOT=/data/artifacts
ENV APP_MAX_UPLOAD_MB=512
ENV APP_CORS_ORIGINS=http://localhost:5173
ENV APP_AUTH_TOKEN_TTL_MINUTES=1440

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "mlwarden/backend"]

