const now = '2026-05-11T10:20:00Z'

export const projects = [
  {
    id: 'learnable-wavelets',
    name: 'learnable-wavelets',
    description: 'Wavelet-based image compression experiments with neural analysis transforms.',
    tags: ['vision', 'compression', 'research'],
    latestRun: '2026-05-11 10:16',
  },
  {
    id: 'jpeg2000-baselines',
    name: 'jpeg2000-baselines',
    description: 'Classical codec comparisons and rate-distortion baselines.',
    tags: ['codec', 'baseline'],
    latestRun: '2026-05-10 21:04',
  },
  {
    id: 'invoice-ocr-pipeline',
    name: 'invoice-ocr-pipeline',
    description: 'OCR extraction workflow with validation tables and document previews.',
    tags: ['ocr', 'pipeline', 'documents'],
    latestRun: '2026-05-10 18:45',
  },
  {
    id: 'nightly-data-preprocessing',
    name: 'nightly-data-preprocessing',
    description: 'Scheduled data-quality checks and feature generation jobs.',
    tags: ['etl', 'nightly'],
    latestRun: '2026-05-09 03:12',
  },
]

export const runs = [
  {
    id: 'run-dulcet-snowflake-18',
    projectId: 'learnable-wavelets',
    name: 'dulcet-snowflake-18',
    description: 'Best candidate from the latest wavelet-search sweep.',
    status: 'finished',
    created: '2026-05-11 10:01',
    started: '12:02:18',
    finished: '12:16:50',
    duration: '14m 32s',
    worker: 'gpu-worker-01',
    tags: ['best', 'v2', 'celeba'],
    notes: 'Reached the current validation PSNR target with stable loss curves.',
    params: {
      learning_rate: 0.001,
      batch_size: 32,
      model: 'learnable-wavelet-v2',
      optimizer: 'adamw',
      epochs: 3,
    },
    metadata: {
      git_commit: 'abc123f',
      hostname: 'gpu-worker-01',
      dataset: 'CelebA validation split',
      cuda: '12.4',
    },
    bestPsnr: 30.07,
    finalLoss: 0.0039,
  },
  {
    id: 'run-baseline-resnet',
    projectId: 'learnable-wavelets',
    name: 'baseline-resnet',
    description: 'ResNet feature extractor baseline.',
    status: 'running',
    created: '2026-05-11 09:12',
    started: '11:20:05',
    finished: null,
    duration: '51m 11s',
    worker: 'gpu-worker-02',
    tags: ['baseline', 'resnet'],
    notes: 'Still training; validation loss has flattened after epoch two.',
    params: {
      learning_rate: 0.0007,
      batch_size: 48,
      model: 'resnet18-compressor',
      optimizer: 'adamw',
      epochs: 5,
    },
    metadata: {
      git_commit: '9fe7721',
      hostname: 'gpu-worker-02',
      dataset: 'CelebA train split',
    },
    bestPsnr: 29.64,
    finalLoss: 0.0048,
  },
  {
    id: 'run-polyphase-rotation-search',
    projectId: 'learnable-wavelets',
    name: 'polyphase-rotation-search',
    description: 'Rotation-grid search for polyphase filters.',
    status: 'failed',
    created: '2026-05-10 18:34',
    started: '18:34:41',
    finished: '18:42:03',
    duration: '7m 22s',
    worker: 'gpu-worker-03',
    tags: ['search', 'polyphase'],
    notes: 'Failed after artifact upload due to invalid checkpoint metadata.',
    params: {
      learning_rate: 0.0015,
      batch_size: 24,
      model: 'polyphase-wavelet-v1',
      optimizer: 'adamw',
      epochs: 2,
    },
    metadata: {
      git_commit: '771a9db',
      hostname: 'gpu-worker-03',
      error: 'Checkpoint metadata missing filter_bank',
    },
    bestPsnr: 28.91,
    finalLoss: 0.0062,
  },
  {
    id: 'run-compression-ablation-v3',
    projectId: 'learnable-wavelets',
    name: 'compression-ablation-v3',
    description: 'Ablation sweep for entropy penalty and reconstruction loss.',
    status: 'cancelled',
    created: '2026-05-09 15:18',
    started: '15:20:44',
    finished: '15:31:08',
    duration: '10m 24s',
    worker: 'gpu-worker-01',
    tags: ['ablation', 'cancelled'],
    notes: 'Cancelled after hyperparameter range was corrected.',
    params: {
      learning_rate: 0.002,
      batch_size: 32,
      model: 'learnable-wavelet-v2',
      optimizer: 'adamw',
      epochs: 8,
    },
    metadata: {
      git_commit: '77aa019',
      hostname: 'gpu-worker-01',
    },
    bestPsnr: 27.84,
    finalLoss: 0.0091,
  },
  {
    id: 'run-jpeg2000-quality-sweep',
    projectId: 'jpeg2000-baselines',
    name: 'jpeg2000-quality-sweep',
    description: 'Quality sweep over JP2 codec settings.',
    status: 'finished',
    created: '2026-05-10 21:04',
    started: '21:04:00',
    finished: '21:12:34',
    duration: '8m 34s',
    worker: 'cpu-worker-01',
    tags: ['jpeg2000', 'sweep'],
    notes: 'Reference sweep completed.',
    params: {
      codec: 'jpeg2000',
      quality_min: 20,
      quality_max: 95,
      images: 1200,
    },
    metadata: {
      git_commit: 'f19c300',
      hostname: 'cpu-worker-01',
    },
    bestPsnr: 31.52,
    finalLoss: 0.0032,
  },
  {
    id: 'run-mask-threshold-search',
    projectId: 'invoice-ocr-pipeline',
    name: 'mask-threshold-search',
    description: 'Threshold search for document mask generation.',
    status: 'finished',
    created: '2026-05-10 18:45',
    started: '18:45:12',
    finished: '18:59:01',
    duration: '13m 49s',
    worker: 'ocr-worker-02',
    tags: ['ocr', 'threshold'],
    notes: 'Improved F1 on low-contrast invoices.',
    params: {
      threshold_min: 0.35,
      threshold_max: 0.8,
      model: 'unet-mask-v4',
      batch_size: 16,
    },
    metadata: {
      git_commit: 'aa30bc2',
      hostname: 'ocr-worker-02',
    },
    bestPsnr: null,
    finalLoss: 0.021,
  },
  {
    id: 'run-feature-store-refresh',
    projectId: 'nightly-data-preprocessing',
    name: 'feature-store-refresh',
    description: 'Nightly user and transaction feature refresh.',
    status: 'created',
    created: '2026-05-09 03:12',
    started: null,
    finished: null,
    duration: 'queued',
    worker: 'scheduler',
    tags: ['etl', 'queued'],
    notes: 'Waiting for upstream source snapshot.',
    params: {
      partition: '2026-05-09',
      rows_expected: 2400000,
    },
    metadata: {
      hostname: 'scheduler-01',
      cadence: 'nightly',
    },
    bestPsnr: null,
    finalLoss: null,
  },
]

export const notifications = [
  {
    id: 'notif-1',
    type: 'run.finished',
    title: 'Run finished',
    message: 'dulcet-snowflake-18 finished with val.psnr 30.07',
    timestamp: now,
  },
  {
    id: 'notif-2',
    type: 'backend.disconnected',
    title: 'Backend connection lost',
    message: 'Frontend is showing mock data in prototype mode.',
    timestamp: '2026-05-11T10:16:00Z',
  },
]

function makeTrend(start, end, count, jitter = 0.03) {
  return Array.from({ length: count }, (_, index) => {
    const progress = count === 1 ? 1 : index / (count - 1)
    const wave = Math.sin(index * 1.7) * jitter
    return {
      step: index + 1,
      value: Number((start + (end - start) * progress + wave).toFixed(4)),
      timestamp: `2026-05-11T10:${String(index + 1).padStart(2, '0')}:00Z`,
    }
  })
}

export const metricSeriesByRunId = {
  'run-dulcet-snowflake-18': {
    'val.psnr': makeTrend(28.88, 30.07, 12, 0.06),
    'val.loss': makeTrend(0.0051, 0.0039, 12, 0.00008),
    'val.best_psnr': makeTrend(28.88, 30.07, 12, 0.02).map((point, index, points) => ({
      ...point,
      value: Math.max(...points.slice(0, index + 1).map((item) => item.value)),
    })),
    'train.loss': makeTrend(0.0171, 0.0041, 40, 0.0004),
    epoch: makeTrend(1, 3, 12, 0),
    learning_rate: makeTrend(0.001, 0.00045, 12, 0.00001),
    'gpu.memory_mb': makeTrend(14200, 15180, 24, 95),
    'throughput.samples_per_sec': makeTrend(218, 244, 24, 4),
  },
  'run-baseline-resnet': {
    'val.psnr': makeTrend(27.9, 29.64, 12, 0.05),
    'val.loss': makeTrend(0.0072, 0.0048, 12, 0.00012),
    'val.best_psnr': makeTrend(27.9, 29.64, 12, 0.02),
    'train.loss': makeTrend(0.022, 0.0062, 40, 0.0005),
    epoch: makeTrend(1, 3, 12, 0),
    learning_rate: makeTrend(0.0007, 0.00042, 12, 0.00001),
    'gpu.memory_mb': makeTrend(11600, 11940, 24, 80),
    'throughput.samples_per_sec': makeTrend(180, 196, 24, 3),
  },
}

export const logsByRunId = {
  'run-dulcet-snowflake-18': [
    ['12:02:18', 'info', 'Run started on worker gpu-worker-01', { worker: 'gpu-worker-01' }],
    ['12:02:21', 'info', 'Loaded dataset CelebA validation split', { records: 12400 }],
    ['12:03:44', 'info', 'Epoch 1 completed: val.psnr=29.42', { epoch: 1 }],
    ['12:06:12', 'warn', 'Artifact upload took 4.2s', { artifact: 'checkpoint.pt' }],
    ['12:08:10', 'info', 'New best checkpoint saved', { val_psnr: 29.91 }],
    ['12:16:50', 'info', 'Run finished successfully', { final_loss: 0.0039 }],
  ],
  'run-baseline-resnet': [
    ['11:20:05', 'info', 'Run started on worker gpu-worker-02', { worker: 'gpu-worker-02' }],
    ['11:26:12', 'info', 'Epoch 1 completed: val.psnr=28.81', { epoch: 1 }],
    ['11:41:50', 'warn', 'Validation plateau detected', { patience: 2 }],
    ['12:06:23', 'info', 'Streaming latest metric batch', { count: 24 }],
  ],
}

export const tablesByRunId = {
  'run-dulcet-snowflake-18': [
    {
      name: 'validation_predictions',
      rows: [
        { image_id: 'img001', psnr: 30.41, bpp: 0.182, codec: 'wavelet-v2', split: 'validation', metadata: { crop: 'center', ok: true } },
        { image_id: 'img002', psnr: 29.98, bpp: 0.176, codec: 'wavelet-v2', split: 'validation', metadata: { crop: 'full', ok: true } },
        { image_id: 'img003', psnr: 31.02, bpp: 0.193, codec: 'wavelet-v2', split: 'validation', metadata: { crop: 'center', ok: true } },
        { image_id: 'img004', psnr: 28.77, bpp: 0.162, codec: 'wavelet-v2', split: 'validation', metadata: { crop: 'edge', ok: false } },
        { image_id: 'img005', psnr: 30.12, bpp: 0.184, codec: 'wavelet-v2', split: 'validation', metadata: { crop: 'full', ok: true } },
      ],
    },
    {
      name: 'compression_summary',
      rows: [
        { image_id: 'batch-a', psnr: 30.07, bpp: 0.181, codec: 'wavelet-v2', split: 'validation', metadata: { images: 512 } },
        { image_id: 'batch-b', psnr: 29.84, bpp: 0.179, codec: 'wavelet-v2', split: 'validation', metadata: { images: 512 } },
      ],
    },
    {
      name: 'image_quality_metrics',
      rows: [
        { image_id: 'img001', psnr: 30.41, bpp: 0.182, codec: 'wavelet-v2', split: 'validation', metadata: { ssim: 0.943 } },
        { image_id: 'img002', psnr: 29.98, bpp: 0.176, codec: 'wavelet-v2', split: 'validation', metadata: { ssim: 0.936 } },
      ],
    },
  ],
}

export const imagesByRunId = {
  'run-dulcet-snowflake-18': [
    { id: 'image-1', name: 'input/img001', group: 'input', step: 8, split: 'validation', size: '512x512', caption: 'Original validation sample', metadata: { image_id: 'img001', bpp: 0.182 } },
    { id: 'image-2', name: 'reconstruction/img001', group: 'reconstruction', step: 8, split: 'validation', size: '512x512', caption: 'Wavelet reconstruction', metadata: { psnr: 30.41, ssim: 0.943 } },
    { id: 'image-3', name: 'error_map/img001', group: 'error_map', step: 8, split: 'validation', size: '512x512', caption: 'Absolute reconstruction error', metadata: { scale: 'x8' } },
    { id: 'image-4', name: 'wavelet_subband/ll', group: 'wavelet_subband', step: 10, split: 'validation', size: '256x256', caption: 'LL subband activation preview', metadata: { channel: 'LL' } },
  ],
}

export const artifactsByRunId = {
  'run-dulcet-snowflake-18': [
    { id: 'artifact-1', name: 'model.pt', path: 'checkpoints/model.pt', size: '94.2 MB', contentType: 'application/octet-stream', created: '2026-05-11 12:16', metadata: { epoch: 3, best: true } },
    { id: 'artifact-2', name: 'config.yaml', path: 'config/config.yaml', size: '4.8 KB', contentType: 'text/yaml', created: '2026-05-11 12:02', metadata: { source: 'worker' } },
    { id: 'artifact-3', name: 'metrics.csv', path: 'reports/metrics.csv', size: '38.1 KB', contentType: 'text/csv', created: '2026-05-11 12:17', metadata: { rows: 80 } },
    { id: 'artifact-4', name: 'visual_comparison.zip', path: 'images/visual_comparison.zip', size: '128.4 MB', contentType: 'application/zip', created: '2026-05-11 12:17', metadata: { images: 64 } },
    { id: 'artifact-5', name: 'report.json', path: 'reports/report.json', size: '12.5 KB', contentType: 'application/json', created: '2026-05-11 12:17', metadata: { schema: 1 } },
  ],
}

export const eventsByRunId = {
  'run-dulcet-snowflake-18': [
    { id: 'event-1', type: 'run.created', timestamp: '12:01:58', payload: { source: 'python-client', project: 'learnable-wavelets' } },
    { id: 'event-2', type: 'run.started', timestamp: '12:02:18', payload: { worker: 'gpu-worker-01' } },
    { id: 'event-3', type: 'metric.logged', timestamp: '12:03:44', payload: { name: 'val.psnr', value: 29.42, step: 4 } },
    { id: 'event-4', type: 'image.uploaded', timestamp: '12:08:10', payload: { name: 'reconstruction/img001', step: 8 } },
    { id: 'event-5', type: 'artifact.uploaded', timestamp: '12:16:41', payload: { name: 'model.pt', size_bytes: 98775819 } },
    { id: 'event-6', type: 'log.appended', timestamp: '12:16:49', payload: { level: 'info', message: 'Run finished successfully' } },
    { id: 'event-7', type: 'run.finished', timestamp: '12:16:50', payload: { status: 'finished', final_loss: 0.0039 } },
  ],
}

export const savedChartsByProjectId = {
  'learnable-wavelets': [
    { id: 'chart-1', name: 'Validation PSNR comparison', type: 'line', metric: 'val.psnr' },
    { id: 'chart-2', name: 'Loss convergence', type: 'area', metric: 'train.loss' },
    { id: 'chart-3', name: 'Throughput by worker', type: 'bar', metric: 'throughput.samples_per_sec' },
  ],
}

export function getProject(projectId) {
  return projects.find((project) => project.id === projectId)
}

export function getRun(runId) {
  return runs.find((run) => run.id === runId)
}

export function getRunsForProject(projectId) {
  return runs.filter((run) => run.projectId === projectId)
}

export function getProjectStats(projectId) {
  const projectRuns = getRunsForProject(projectId)
  return {
    runs: projectRuns.length,
    running: projectRuns.filter((run) => run.status === 'running').length,
    failed: projectRuns.filter((run) => run.status === 'failed').length,
    finished: projectRuns.filter((run) => run.status === 'finished').length,
  }
}
