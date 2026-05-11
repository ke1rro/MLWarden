FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./

RUN python -m pip install --no-cache-dir --upgrade pip setuptools wheel \
    && python -m pip install --no-cache-dir -r requirements.txt

COPY mlwarden/backend ./backend

ENV APP_ENV=production
ENV APP_DATABASE_URL=sqlite:////data/mlwarden.sqlite3
ENV APP_ARTIFACT_ROOT=/data/artifacts
ENV APP_MAX_UPLOAD_MB=512
ENV APP_CORS_ORIGINS=http://localhost:5173
ENV APP_AUTH_TOKEN_TTL_MINUTES=1440

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3).read()"

CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "/app"]

