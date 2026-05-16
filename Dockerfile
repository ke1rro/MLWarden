FROM node:20-alpine AS frontend-build

WORKDIR /frontend

ENV VITE_API_BASE_URL=
ENV VITE_WS_BASE_URL=

COPY mlwarden/frontend/package.json mlwarden/frontend/package-lock.json* ./
RUN npm install

COPY mlwarden/frontend ./
RUN npm run build

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY mlwarden/backend/requirements.txt ./

RUN python -m pip install --no-cache-dir --upgrade pip setuptools wheel \
    && python -m pip install --no-cache-dir -r requirements.txt

COPY mlwarden/backend ./backend
COPY --from=frontend-build /frontend/dist /app/static

ENV APP_ENV=production
ENV APP_DATABASE_URL=sqlite:////data/mlwarden.sqlite3
ENV APP_ARTIFACT_ROOT=/data/artifacts
ENV APP_STATIC_FRONTEND_PATH=/app/static
ENV APP_MAX_UPLOAD_MB=512
ENV APP_CORS_ORIGINS=
ENV APP_AUTH_TOKEN_TTL_MINUTES=1440

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3).read()"

CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "/app"]
