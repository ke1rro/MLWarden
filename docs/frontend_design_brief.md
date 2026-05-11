# Frontend-Only Design Brief: Mini MLflow / WandB Experiment Tracker

## Goal

Build a frontend-only visual prototype for a self-hosted experiment tracking application inspired by MLflow and Weights & Biases.

The goal is NOT to implement the backend.
The goal is to validate the UI/UX visually.

Use mock data only. No real API calls. No authentication backend. No WebSocket backend.

The application should look and feel like a compact internal developer tool for tracking machine learning experiments, training runs, workflow executions, logs, metrics, artifacts, images, and charts.

## Product Direction

The UI should combine:

- MLflow-like simplicity:
  - projects
  - runs table
  - run detail page
  - parameters
  - metrics
  - artifacts

- WandB-like workspace experience:
  - chart-first run workspace
  - panel grid
  - run status badge
  - tabs for Charts / Overview / Logs / Tables / Images / Artifacts / Events
  - dense developer-oriented layout
  - quick navigation between project and run views

Do not copy MLflow or WandB branding, colors, icons, exact layout, or source code.
Use them only as high-level product references.

## Technical Constraints

Use:

- React
- Plain JavaScript
- React Router
- Vite
- Apache ECharts
- Plain CSS

Do NOT use:

- TypeScript
- Tailwind CSS
- Material UI
- Ant Design
- Bootstrap
- Chakra UI
- CSS frameworks
- chart wrapper libraries

Use Apache ECharts directly from React components.

## Prototype Scope

Implement frontend-only pages with mock data:

```txt
/login
/projects
/projects/:projectId
/projects/:projectId/charts
/runs/:runId
/settings
````

Default behavior:

* `/login` shows a fake login form.
* On submit, store fake auth state in local state or localStorage.
* Redirect to `/projects`.
* No real backend request.

## Visual Style

The UI should feel like:

* compact
* dense
* developer-oriented
* fast
* technical
* clean
* neutral
* not playful
* not consumer SaaS-like

Use:

* neutral background
* white panels/cards
* subtle borders
* compact spacing
* high contrast text
* clear status colors
* dense but readable tables
* large chart area
* minimal visual noise

The app should resemble a professional internal ML tooling dashboard.

## Color System

Use CSS variables.

Suggested palette:

```css
:root {
  --color-bg: #f7f8fa;
  --color-bg-soft: #f1f3f6;
  --color-panel: #ffffff;
  --color-panel-muted: #fbfcfd;
  --color-border: #d9dee7;
  --color-border-strong: #c7ceda;

  --color-text: #18202f;
  --color-muted: #667085;
  --color-faint: #98a2b3;

  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;

  --color-success: #16a34a;
  --color-success-bg: #dcfce7;

  --color-warning: #d97706;
  --color-warning-bg: #fef3c7;

  --color-danger: #dc2626;
  --color-danger-bg: #fee2e2;

  --color-running: #0891b2;
  --color-running-bg: #cffafe;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;

  --font-sans: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
}
```

## Layout

Use a persistent application shell.

### App Shell

The application should have:

1. Dark top bar
2. Left vertical navigation
3. Main content workspace

### Top Bar

The top bar contains:

* app logo / mark
* breadcrumb path
* search icon or global search field
* notification icon
* help icon
* user avatar

Example breadcrumb:

```txt
MiniTracker > Projects > learnable-wavelets > Runs > dulcet-snowflake-18
```

### Sidebar

The sidebar should be compact and icon-like, similar to developer dashboards.

Navigation items:

* Projects
* Workspace
* Runs
* Charts
* Reports
* Artifacts
* Settings

The active item should be visually highlighted.

### Main Area

The main area should use:

* page header
* tabs where appropriate
* action toolbar
* content panels/cards
* dense tables
* chart grid

## Core Pages

---

# 1. Login Page

Route:

```txt
/login
```

Purpose:

Fake authentication screen for visual validation.

Layout:

* centered login card
* app name
* short description
* username input
* password input
* submit button
* fake error state support
* loading state on submit

Tone:

Minimal, serious, self-hosted developer tool.

Copy example:

```txt
MiniTracker
Self-hosted experiment and workflow tracking.
```

---

# 2. Projects Page

Route:

```txt
/projects
```

Purpose:

Show list of tracked projects.

Layout:

* page title: `Projects`
* subtitle: `Track experiment runs, metrics, artifacts, and workflow outputs.`
* search input
* `New project` button
* summary cards:

  * Total projects
  * Running runs
  * Failed runs
  * Latest activity
* project table or project cards

Project list item should show:

* project name
* description
* number of runs
* number of running runs
* latest run timestamp
* tags
* action menu

Use compact table by default.

Columns:

```txt
Name | Description | Runs | Running | Latest run | Tags | Actions
```

Empty state:

```txt
No projects yet.
Create your first project or connect a worker script.
```

---

# 3. Project Detail Page

Route:

```txt
/projects/:projectId
```

Purpose:

Show a project's runs and saved chart overview.

Layout:

* project header
* project name
* description
* tags
* action buttons:

  * New run
  * Open charts
  * Settings
* run status summary cards
* filters toolbar
* runs table
* small saved charts preview section

Run filters:

* status
* tag
* name search
* metric search
* date range placeholder

Run table columns:

```txt
Status | Run name | Created | Duration | Best PSNR | Final loss | Tags | Worker | Actions
```

Rows should use realistic ML experiment names:

```txt
dulcet-snowflake-18
baseline-resnet
wavelet-ablation-lr-1e-3
jpeg2000-comparison-run
polyphase-rotation-search
```

Run statuses:

```txt
created
running
finished
failed
cancelled
```

Status badges should be very clear.

---

# 4. Run Detail Page

Route:

```txt
/runs/:runId
```

Purpose:

This is the main workspace. It should feel closest to WandB.

A run detail page must expose run status, duration, parameters, tags, metrics, charts, logs, tables, images, artifacts, and event timeline.

## Run Header

The header should include:

* back button
* status dot
* run name
* status badge
* project breadcrumb
* start/end/duration metadata
* action menu

Example:

```txt
← dulcet-snowflake-18    Finished
Project: learnable-wavelets
Started: 12:02:18    Duration: 14m 32s    Worker: gpu-worker-01
```

## Tabs

Use horizontal tabs:

```txt
Charts | Overview | Logs | Tables | Images | Artifacts | Events
```

Default tab:

```txt
Charts
```

The required run detail sections are status, start/end duration, parameters, tags, notes, metrics, charts, logs, tables, images, artifacts, and event timeline.

---

## 4.1 Charts Tab

This is the most important screen for visual validation.

It should look like a WandB-style workspace.

Toolbar:

* search input: `Search panels with regex`
* more button
* settings button
* new report button
* add panels button

Chart grid:

* responsive 3-column grid on large screens
* 2-column grid on medium screens
* 1-column grid on small screens
* each chart is inside a panel card
* panel card has title, chart body, subtle border, optional actions menu

Default chart panels:

1. `val.psnr`
2. `val.loss`
3. `val.best_psnr`
4. `train.loss`
5. `epoch`
6. `learning_rate`
7. `gpu.memory_mb`
8. `throughput.samples_per_sec`

Use ECharts line charts.

Charts should have:

* clean axes
* compact labels
* subtle grid lines
* red or primary colored line
* no heavy chart decoration
* loading and error states available as component variants

Chart panel header:

```txt
val.psnr        ...
```

Panel actions menu can be fake.

---

## 4.2 Overview Tab

Show a compact summary of the run.

Sections:

1. Run summary cards
2. Parameters
3. Metric summary
4. Tags
5. Notes
6. Worker metadata

Layout:

* two-column layout
* left side: status, params, tags
* right side: metric summary, notes, metadata

Parameter table:

```txt
learning_rate    0.001
batch_size       32
model            learnable-wavelet-v2
optimizer        adamw
epochs           3
```

Metric summary table:

```txt
Metric          Latest      Min       Max       Count
val.psnr        30.07       28.88     30.07     12
val.loss        0.0039      0.0039    0.0051    12
train.loss      0.0041      0.0041    0.0171    80
```

---

## 4.3 Logs Tab

Purpose:

Developer-style run logs.

Toolbar:

* search logs
* level filter
* auto-scroll toggle
* clear button placeholder

Log viewer:

* monospace font
* dense rows
* timestamp
* level badge
* message
* context preview

Example rows:

```txt
12:02:18 INFO  Run started on worker gpu-worker-01
12:02:21 INFO  Loaded dataset CelebA validation split
12:03:44 INFO  Epoch 1 completed: val.psnr=29.42
12:06:12 WARN  Artifact upload took 4.2s
12:08:10 INFO  New best checkpoint saved
```

---

## 4.4 Tables Tab

Purpose:

Display structured worker-reported tables.

Layout:

* table selector sidebar or dropdown
* selected table metadata
* paginated data table

Tables:

```txt
validation_predictions
compression_summary
image_quality_metrics
```

Data table requirements:

* sticky header
* pagination controls
* compact cells
* long text truncation
* JSON preview pill/cell
* fake CSV download button

Columns example:

```txt
image_id | psnr | bpp | codec | split | metadata
```

---

## 4.5 Images Tab

Purpose:

Gallery of worker-uploaded images.

Layout:

* filter toolbar
* image grid
* thumbnail cards
* detail drawer/modal on click

Filters:

* image name
* group
* step
* split

Image card:

* thumbnail placeholder
* image name
* step
* caption
* size
* metadata button

Example image groups:

```txt
input
reconstruction
error_map
wavelet_subband
```

Use CSS gradient or placeholder blocks if no real images are included.

---

## 4.6 Artifacts Tab

Purpose:

Artifact browser.

Layout:

* file list or simple tree
* search input
* artifact path column
* download action

Columns:

```txt
Name | Path | Size | Content type | Created | Metadata | Actions
```

Example artifacts:

```txt
model.pt
config.yaml
metrics.csv
visual_comparison.zip
report.json
```

---

## 4.7 Events Tab

Purpose:

Immutable timeline of run events.

Layout:

* vertical timeline
* event type badge
* timestamp
* event payload preview

Events:

```txt
run.created
run.started
metric.logged
image.uploaded
artifact.uploaded
log.appended
run.finished
```

---

# 5. Project Charts Page

Route:

```txt
/projects/:projectId/charts
```

Purpose:

Saved charts and chart builder.

The app should support a chart builder concept where the user can choose visualization type, project, runs, x-axis, y-axis, grouping, aggregation, filters, and optional ECharts override JSON.

Layout:

* page header: `Charts`
* left configuration panel
* right preview panel

Chart builder controls:

* chart type selector:

  * line
  * scatter
  * bar
  * area
* run selector
* data source selector:

  * metrics
  * parameters
  * run metadata
  * table columns
  * events
* x-axis selector
* y-axis selector
* group by selector
* filters section
* advanced ECharts JSON override textarea
* preview button
* save button

Use mock chart preview.

---

# 6. Settings Page

Route:

```txt
/settings
```

Purpose:

Visual-only app settings.

Sections:

* General
* Authentication
* Worker API key
* Artifact storage
* Appearance
* About

Use disabled/fake forms.

Settings page should communicate that this is a self-hosted app.

---

# Component Inventory

Implement these components:

```txt
App
Layout
TopBar
SidebarNav
Breadcrumbs
PageHeader
Tabs
Toolbar
Button
IconButton
StatusBadge
MetricCard
PanelCard
ChartGrid
MetricChart
RunTable
ProjectTable
SearchInput
FilterBar
EmptyState
ErrorState
LoadingState
ToastHost
LogViewer
DataTable
ImageGallery
ArtifactList
EventTimeline
ChartBuilder
JsonPreview
ActionMenu
```

## Component Design Rules

* Keep components small and named.
* Do not place large JSX blocks directly inside route components.
* Route components should compose high-level components.
* Use props and callbacks, but since this is frontend-only, actions can update local mock state.
* Do not add backend integration.
* Do not add real authentication.
* Do not add real WebSocket logic.
* Mock all data in `src/mockData.js`.

## Suggested File Structure

```txt
frontend/
  src/
    main.jsx
    App.jsx
    mockData.js
    routes/
      LoginPage.jsx
      ProjectsPage.jsx
      ProjectDetailPage.jsx
      RunDetailPage.jsx
      ChartsPage.jsx
      SettingsPage.jsx
    components/
      layout/
        Layout.jsx
        TopBar.jsx
        SidebarNav.jsx
        Breadcrumbs.jsx
      common/
        Button.jsx
        IconButton.jsx
        StatusBadge.jsx
        Tabs.jsx
        Toolbar.jsx
        SearchInput.jsx
        EmptyState.jsx
        ErrorState.jsx
        LoadingState.jsx
        ActionMenu.jsx
      projects/
        ProjectTable.jsx
        ProjectSummaryCards.jsx
      runs/
        RunHeader.jsx
        RunTable.jsx
        RunOverview.jsx
        RunChartsWorkspace.jsx
      charts/
        ChartGrid.jsx
        PanelCard.jsx
        MetricChart.jsx
        ChartBuilder.jsx
      logs/
        LogViewer.jsx
      tables/
        DataTable.jsx
      images/
        ImageGallery.jsx
      artifacts/
        ArtifactList.jsx
      events/
        EventTimeline.jsx
      notifications/
        ToastHost.jsx
    styles/
      base.css
      layout.css
      components.css
      tables.css
      charts.css
      forms.css
```

## Mock Data Requirements

Create realistic mock data for:

* 3 projects
* 8-12 runs
* several run statuses
* metrics over steps
* params
* tags
* logs
* tables
* images
* artifacts
* events
* notifications

Use ML-related examples:

```txt
learnable-wavelets
jpeg2000-baselines
invoice-ocr-pipeline
nightly-data-preprocessing
```

Run names:

```txt
dulcet-snowflake-18
baseline-resnet
polyphase-rotation-search
jpeg2000-quality-sweep
compression-ablation-v3
mask-threshold-search
```

Metrics:

```txt
train.loss
val.loss
val.psnr
val.best_psnr
epoch
learning_rate
accuracy
f1_score
bpp
throughput.samples_per_sec
```

## Interaction Requirements

Frontend-only interactions should work locally:

* fake login
* navigate between pages
* switch tabs
* search projects
* filter runs by status
* open run detail
* switch run detail tabs
* add fake chart panel
* remove fake chart panel
* show fake toast
* open fake image preview
* paginate fake table
* expand JSON preview

No backend required.

## Responsive Behavior

Primary target:

* desktop
* laptop
* medium screens

Mobile support can be basic.

Responsive rules:

* sidebar can collapse on smaller widths
* chart grid goes from 3 columns to 2 to 1
* tables can horizontally scroll
* header actions can wrap

## UX States

Implement visual states for:

* loading
* empty
* error
* success
* disconnected backend
* no metrics
* no logs
* no artifacts
* invalid chart config

The requirements expect clear empty states, readable error states, and loading states for core frontend flows.

## Final Visual Target

The final prototype should make it easy to answer:

1. Does the app feel like a compact ML experiment tracking tool?
2. Is the run workspace useful and readable?
3. Are charts visually central enough?
4. Is navigation between projects, runs, charts, logs, images, and artifacts clear?
5. Does the UI feel closer to a useful self-hosted WandB/MLflow hybrid rather than a generic admin dashboard?

## Important Implementation Notes

* Do not implement backend.
* Do not create API services.
* Do not use fetch.
* Do not use axios.
* Do not use WebSocket.
* Do not create database logic.
* Do not use TypeScript.
* Do not use Tailwind.
* Do not use external UI frameworks.
* Use ECharts directly.
* Keep styling in plain CSS files.
* Prioritize visual completeness over backend correctness.

````

А ось короткий **prompt для Codex**, який можна вставити після цього файлу:

```txt
Use the design brief in docs/frontend_design_brief.md.

Build a frontend-only Vite React prototype for visual validation.

Important:
- No backend.
- No real API calls.
- No fetch/axios.
- No WebSocket implementation.
- Use mock data from src/mockData.js.
- Use React Router routes.
- Use Apache ECharts directly.
- Use plain JavaScript only.
- Use plain CSS only.
- Do not use TypeScript.
- Do not use Tailwind.
- Do not use Material UI, Ant Design, Bootstrap, Chakra, or any component framework.

Implement the full visual prototype:
- login page
- projects page
- project detail with runs table
- run detail workspace with tabs
- charts grid like a WandB-style workspace
- overview tab
- logs tab
- tables tab
- images tab
- artifacts tab
- events tab
- project charts / chart builder page
- settings page

The goal is visual validation of UI/UX, not backend correctness.
