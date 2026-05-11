# Backend Test Suite

These pytest tests are written as a backend contract for the requirements in
`mlwarden_requirements.md`. They intentionally avoid frontend code.

Run from the repository root:

```bash
python -m pytest mlwarden/backend/tests
```

The suite sets deterministic test configuration before importing the app:

- `APP_USERS=admin:password`
- `APP_API_KEY=dev-api-key`
- `APP_DATABASE_URL=sqlite:///<temporary test db>`
- `APP_ARTIFACT_ROOT=<temporary artifact dir>`
- `APP_MAX_UPLOAD_MB=1`

By default the app is discovered from `app.main:app`, `app.main:create_app`, or
`app.app:app`. If the backend exposes a different entry point, run with:

```bash
MLWARDEN_BACKEND_APP="your.module:app" python -m pytest mlwarden/backend/tests
```

Useful subsets:

```bash
python -m pytest mlwarden/backend/tests/test_auth.py
python -m pytest mlwarden/backend/tests/test_uploads.py
python -m pytest -m websocket mlwarden/backend/tests
python -m pytest -m sdk mlwarden/backend/tests
```

This is a TDD suite, so a scaffolded backend is expected to fail many tests at
first. The failure messages are meant to point at the missing API behavior.

