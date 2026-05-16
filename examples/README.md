# Real SDK Demo Data

These examples create real backend data through the existing MLWarden Python SDK. They do not create frontend mock data, hardcode React state, or fake charts in the browser.

The seed flow writes real projects, runs, params, metrics, logs, tables, images, artifacts, and events into the backend database. The frontend should then read those backend records through its normal API integration.

## Start The App

From the repository root, start the backend and frontend in separate terminals.

```bash
uvicorn mlwarden.backend.app:app --reload --host 0.0.0.0 --port 8000
```

```bash
cd mlwarden/frontend
npm install
npm run dev
```

If your local startup command differs, use the existing project command. The demo scripts expect the backend at `http://localhost:8000` by default.

## Install Demo Dependencies

```bash
pip install -r examples/requirements-demo.txt
```

The PyTorch demo requires `torch`. TensorFlow is optional for the full seed process; if it is missing, TensorFlow runs are skipped and the seed still creates PyTorch runs plus the summary report.

## Seed Real Data

```bash
scripts/load_data.sh \
  --base-url http://localhost:8000 \
  --api-key dev-api-key \
  --project demo-pytorch-tensorflow
```

The same values can come from environment variables:

```bash
export MINI_TRACKER_URL=http://localhost:8000
export MINI_TRACKER_API_KEY=dev-api-key
export MINI_TRACKER_PROJECT=demo-pytorch-tensorflow
scripts/load_data.sh
```

Generated local files are written under `examples/outputs/` and uploaded through the SDK.

## What Gets Created

PyTorch classification runs train a real CPU MLP on synthetic Gaussian blobs:

- `pytorch-mlp-lr-1e-2`
- `pytorch-mlp-lr-1e-3`
- `pytorch-mlp-hidden-16`
- `pytorch-mlp-hidden-64`
- `pytorch-mlp-dropout`
- `pytorch-intentional-failure-demo`

Each PyTorch run logs real params, per-epoch training/validation metrics, logs, a validation predictions table, PNG plots, and artifacts. The intentional failure run logs real metrics first, then raises a controlled exception so the SDK marks the run as failed.

TensorFlow regression runs train a real Keras MLP on synthetic sine-wave data:

- `tensorflow-regression-baseline`
- `tensorflow-regression-wide`
- `tensorflow-regression-small-lr`
- `tensorflow-regression-noisy-data`

Each TensorFlow run logs real params, per-epoch loss/MAE metrics, logs, prediction tables, PNG plots, and artifacts.

The `demo-summary-report` run logs comparison metrics, a `run_comparison` table, and report artifacts:

- `framework_comparison.csv`
- `best_runs_summary.json`
- `demo_report.md`

## Frontend Pages To Open

After seeding, open:

- Projects: `http://localhost:5173/projects`
- Demo project: printed by the seed script as `/projects/<project_id>`
- Example runs: printed by the seed script as `/runs/<run_id>`

Presentation flow:

1. Open Projects and show the real demo project.
2. Open Project Detail and compare PyTorch/TensorFlow runs and statuses.
3. Open a PyTorch run and show Charts, Logs, Tables, Images, Artifacts, and Events.
4. Open a TensorFlow run and show regression metrics/images.
5. Open the failed PyTorch run and show failed status and error events.
6. Open `demo-summary-report` and show comparison table/artifacts.

## Troubleshooting

If TensorFlow is not installed, the script prints:

```txt
TensorFlow is not installed. Install demo dependencies with:
pip install -r examples/requirements-demo.txt
```

This is expected on machines where TensorFlow is not available. Install the demo requirements to include TensorFlow runs.

If the script cannot reach `/api/health`, start the backend first or pass the correct backend URL with `--base-url`.
