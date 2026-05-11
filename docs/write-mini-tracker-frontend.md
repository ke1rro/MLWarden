---
name: write-mini-tracker-frontend
description: Build or refactor the frontend for a self-hosted Mini MLflow/WandB experiment tracking app. Use this skill when implementing React plain-JavaScript UI screens, components, mock data, ECharts charts, routing, layout, and visual prototype behavior. Do not use this skill for backend implementation or architecture review reports.
---

# Write Mini Tracker Frontend

You are implementing the frontend of a lightweight, self-hosted experiment and workflow tracking platform inspired by MLflow and Weights & Biases.

Your job is to write clean, maintainable React frontend code that visually validates the product UI/UX. This skill is for **building the frontend**, not for producing an architecture review report.

## 1. Product Goal

Build a frontend UI for a compact internal developer tool used to track:

- ML training runs
- data-processing workflows
- image-processing pipelines
- long-running computational jobs
- metrics
- parameters
- logs
- charts
- tables
- images
- artifacts
- run events and notifications

The product direction is:

```text
MLflow-like simplicity
+ WandB-like run workspace
+ our own lightweight self-hosted UI
```

Use MLflow and WandB only as **high-level product references**. Do not copy their branding, colors, icons, exact layouts, or source code.

## 2. Implementation Mode

By default, implement a **frontend-only visual prototype**.

That means:

- Use mock data.
- Do not implement a backend.
- Do not call a real API.
- Do not use `fetch`.
- Do not use `axios`.
- Do not implement real WebSockets.
- Do not create database logic.
- Do not create backend routes.
- Do not implement real authentication.

The purpose is to validate the UI visually and interactively.

If an existing frontend already exists, improve it incrementally while preserving its conventions unless they conflict with these requirements.

## 3. Required Frontend Stack

Use:

- React
- Plain JavaScript
- React Router
- Vite
- Apache ECharts
- Plain CSS

Do not use:

- TypeScript
- Tailwind CSS
- Material UI
- Ant Design
- Bootstrap
- Chakra UI
- CSS frameworks
- component frameworks
- chart wrapper libraries

Apache ECharts must be used directly from React components.

## 4. Core Design Principles

### 4.1 Single Level of Abstraction

Every component must operate at one consistent abstraction level.

Pages should compose:

- layout components
- page headers
- feature sections
- domain-level components

Feature components should compose:

- smaller feature components
- common UI components
- compact named render units

Low-level UI components should compose:

- HTML primitives
- styling
- small interaction behavior

Avoid mixing high-level product components with large raw JSX blocks in the same component.

Bad:

```jsx
export default function RunDetailPage() {
  return (
    <AppLayout title="Run">
      <RunHeader run={run} />
      <div className="chart-card">
        <h3>val.loss</h3>
        <div ref={chartRef} />
      </div>
      <div className="log-row">
        <span>12:02:18</span>
        <span>Run started</span>
      </div>
    </AppLayout>
  );
}
```

Good:

```jsx
export default function RunDetailPage() {
  return (
    <AppLayout title={run.name}>
      <RunHeader run={run} />
      <RunWorkspace run={run} />
    </AppLayout>
  );
}
```

### 4.2 Clear Data Flow

Use predictable React data flow:

- Data goes down through props.
- User actions go up through callbacks.
- Keep state at the lowest component that needs to own it.
- Do not pass raw state setters deep into the component tree.
- Prefer domain callbacks over DOM callbacks.

Bad:

```jsx
<RunTable runs={runs} setRuns={setRuns} />
```

Good:

```jsx
<RunTable runs={runs} onOpenRun={handleOpenRun} onFilterRuns={handleFilterRuns} />
```

### 4.3 Mock Data Boundary

Because this is frontend-only, put mock data in one clear location:

```text
src/mockData.js
```

Components should not hardcode large data arrays inline. Route components may select mock data and pass it down.

Good:

```jsx
import { projects, runsByProjectId } from "../mockData";

export default function ProjectDetailPage() {
  const project = projects[0];
  const runs = runsByProjectId[project.id];

  return (
    <AppLayout title={project.name}>
      <ProjectRunsSection project={project} runs={runs} />
    </AppLayout>
  );
}
```

### 4.4 Minimal Duplication

Extract shared UI patterns when duplication is structural:

- status badges
- panel cards
- metric cards
- table shells
- toolbars
- empty states
- loading states
- error states
- tabs
- action menus

Do not extract just because two blocks look visually similar. Extract when they have the same role and composition shape.

### 4.5 Proper Layout Ownership

Use a shared `AppLayout` or `Layout` component for the application shell:

- top bar
- sidebar
- main content area
- common page spacing

Preferred page shape:

```jsx
export default function ProjectsPage() {
  return (
    <AppLayout breadcrumbs={["MiniTracker", "Projects"]}>
      <ProjectsHeader />
      <ProjectsSummary />
      <ProjectsTable />
    </AppLayout>
  );
}
```

Avoid duplicating top bar/sidebar markup across pages.

If using React Router, keep pages self-contained where practical. Do not make pages unreadable fragments that only make sense when hidden behind router-specific layout wrappers.

## 5. Visual Style Requirements

The UI should feel like:

- compact
- dense
- technical
- developer-oriented
- clean
- neutral
- fast
- internal-tool-like
- not playful
- not consumer-SaaS-like

Use:

- neutral background
- white panels/cards
- subtle borders
- compact spacing
- high-contrast text
- clear status badges
- readable dense tables
- large chart areas
- minimal visual noise

## 6. CSS Requirements

Use plain CSS files.

Use CSS variables for:

- colors
- spacing
- borders
- radii
- typography
- shadows if needed

Suggested variables:

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

CSS should be organized into clear files, for example:

```text
src/styles/
  base.css
  layout.css
  components.css
  tables.css
  charts.css
  forms.css
```

## 7. Application Routes

Implement these routes:

```text
/login
/projects
/projects/:projectId
/projects/:projectId/charts
/runs/:runId
/settings
```

Default behavior:

- Unauthenticated users should see `/login`.
- Fake login should store local frontend auth state.
- Authenticated users should land on `/projects`.

No real authentication backend is required.

## 8. Required Pages

### 8.1 Login Page

Route:

```text
/login
```

Purpose:

Fake authentication screen for visual validation.

Must include:

- centered login card
- product name
- short self-hosted product description
- username input
- password input
- submit button
- fake loading state
- fake error state

Copy example:

```text
MiniTracker
Self-hosted experiment and workflow tracking.
```

### 8.2 Projects Page

Route:

```text
/projects
```

Purpose:

Display tracked projects.

Must include:

- page title
- subtitle
- search input
- `New project` button
- summary cards
- project table or compact cards
- empty state variant

Summary cards:

- Total projects
- Running runs
- Failed runs
- Latest activity

Project table columns:

```text
Name | Description | Runs | Running | Latest run | Tags | Actions
```

Project examples:

```text
learnable-wavelets
jpeg2000-baselines
invoice-ocr-pipeline
nightly-data-preprocessing
```

### 8.3 Project Detail Page

Route:

```text
/projects/:projectId
```

Purpose:

Show project-level run list and saved chart preview.

Must include:

- project header
- description
- tags
- action buttons:
  - New run
  - Open charts
  - Settings
- run status summary cards
- filters toolbar
- runs table
- saved charts preview section

Run table columns:

```text
Status | Run name | Created | Duration | Best PSNR | Final loss | Tags | Worker | Actions
```

Required filters:

- status
- tag
- name search
- metric search placeholder
- date range placeholder

Run name examples:

```text
dulcet-snowflake-18
baseline-resnet
polyphase-rotation-search
jpeg2000-quality-sweep
compression-ablation-v3
mask-threshold-search
```

Run statuses:

```text
created
running
finished
failed
cancelled
```

### 8.4 Run Detail Page

Route:

```text
/runs/:runId
```

Purpose:

This is the main run workspace. It should feel closest to a WandB-style run page while staying simpler and self-hosted.

Must include:

- run header
- status badge
- project breadcrumb
- start/end/duration metadata
- worker metadata
- tabs
- charts workspace
- overview
- logs
- tables
- images
- artifacts
- events

Run header example:

```text
← dulcet-snowflake-18    Finished
Project: learnable-wavelets
Started: 12:02:18    Duration: 14m 32s    Worker: gpu-worker-01
```

Tabs:

```text
Charts | Overview | Logs | Tables | Images | Artifacts | Events
```

Default tab:

```text
Charts
```

## 9. Run Detail Sections

### 9.1 Charts Tab

This is the most important screen for visual validation.

It should look like a dense run workspace with a chart panel grid.

Toolbar:

- search input: `Search panels with regex`
- more button
- settings button
- new report button
- add panels button

Chart grid:

- 3 columns on large screens
- 2 columns on medium screens
- 1 column on small screens
- panel cards with subtle borders
- each panel has a title and optional action menu
- charts use Apache ECharts directly

Default chart panels:

```text
val.psnr
val.loss
val.best_psnr
train.loss
epoch
learning_rate
gpu.memory_mb
throughput.samples_per_sec
```

Charts should have:

- clean axes
- compact labels
- subtle grid lines
- minimal decoration
- loading state
- error state
- empty state

### 9.2 Overview Tab

Show a compact summary of the run.

Sections:

- run summary cards
- parameters
- metric summary
- tags
- notes
- worker metadata

Parameter examples:

```text
learning_rate    0.001
batch_size       32
model            learnable-wavelet-v2
optimizer        adamw
epochs           3
```

Metric summary examples:

```text
Metric          Latest      Min       Max       Count
val.psnr        30.07       28.88     30.07     12
val.loss        0.0039      0.0039    0.0051    12
train.loss      0.0041      0.0041    0.0171    80
```

### 9.3 Logs Tab

Must include:

- search logs input
- level filter
- auto-scroll toggle
- clear button placeholder
- dense monospace log viewer

Log row format:

```text
12:02:18 INFO  Run started on worker gpu-worker-01
12:02:21 INFO  Loaded dataset CelebA validation split
12:03:44 INFO  Epoch 1 completed: val.psnr=29.42
12:06:12 WARN  Artifact upload took 4.2s
12:08:10 INFO  New best checkpoint saved
```

### 9.4 Tables Tab

Must include:

- table selector
- selected table metadata
- paginated data table
- sticky header
- compact cells
- long text truncation
- JSON preview cell
- fake CSV download button

Table examples:

```text
validation_predictions
compression_summary
image_quality_metrics
```

Column examples:

```text
image_id | psnr | bpp | codec | split | metadata
```

### 9.5 Images Tab

Must include:

- filter toolbar
- gallery grid
- thumbnail cards
- image detail drawer or modal
- placeholder thumbnails if no real images are included

Filters:

- image name
- group
- step
- split

Image group examples:

```text
input
reconstruction
error_map
wavelet_subband
```

### 9.6 Artifacts Tab

Must include:

- search input
- file list or simple tree
- artifact metadata
- fake download action

Columns:

```text
Name | Path | Size | Content type | Created | Metadata | Actions
```

Artifact examples:

```text
model.pt
config.yaml
metrics.csv
visual_comparison.zip
report.json
```

### 9.7 Events Tab

Must include:

- vertical event timeline
- event type badge
- timestamp
- payload preview

Event examples:

```text
run.created
run.started
metric.logged
image.uploaded
artifact.uploaded
log.appended
run.finished
```

## 10. Project Charts Page

Route:

```text
/projects/:projectId/charts
```

Purpose:

Saved charts and chart builder.

Layout:

- page header
- left configuration panel
- right preview panel

Chart builder controls:

- chart type selector:
  - line
  - scatter
  - bar
  - area
- run selector
- data source selector:
  - metrics
  - parameters
  - run metadata
  - table columns
  - events
- x-axis selector
- y-axis selector
- group by selector
- filters section
- advanced ECharts JSON override textarea
- preview button
- save button

The preview should render a mock ECharts chart.

## 11. Settings Page

Route:

```text
/settings
```

Purpose:

Visual-only settings page.

Sections:

- General
- Authentication
- Worker API key
- Artifact storage
- Appearance
- About

Use disabled or fake forms. The page should communicate that this is a self-hosted application.

## 12. Component Inventory

Implement or preserve these components where appropriate:

```text
App
AppLayout
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

Suggested folders:

```text
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
      AppLayout.jsx
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
      JsonPreview.jsx
    projects/
      ProjectTable.jsx
      ProjectSummaryCards.jsx
    runs/
      RunHeader.jsx
      RunTable.jsx
      RunOverview.jsx
      RunWorkspace.jsx
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

## 13. Mock Data Requirements

Create realistic mock data for:

- 3-4 projects
- 8-12 runs
- several run statuses
- metric series over steps
- parameters
- tags
- logs
- tables
- images
- artifacts
- events
- notifications

Project examples:

```text
learnable-wavelets
jpeg2000-baselines
invoice-ocr-pipeline
nightly-data-preprocessing
```

Metric examples:

```text
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
gpu.memory_mb
```

Use realistic values. For example, PSNR should gradually increase, loss should decrease, and epoch should step upward.

## 14. Frontend Interactions

Implement local-only interactions:

- fake login
- navigation between pages
- switching tabs
- searching projects
- filtering runs by status
- opening run detail
- switching run detail tabs
- adding a fake chart panel
- removing a fake chart panel
- showing a fake toast
- opening an image preview
- paginating a fake table
- expanding JSON preview
- editing chart builder controls locally

Do not connect these interactions to a backend.

## 15. ECharts Requirements

Use Apache ECharts directly.

A chart component should:

- create the chart instance in `useEffect`
- call `setOption`
- resize when the container changes
- dispose the instance on unmount
- handle invalid/missing data with a readable error or empty state

Conceptual pattern:

```jsx
import { useEffect, useRef } from "react";
import * as echarts from "echarts";

export default function MetricChart({ title, series }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    chart.setOption({
      title: { text: title, left: "center", textStyle: { fontSize: 12 } },
      xAxis: { type: "category", data: series.map((point) => point.step) },
      yAxis: { type: "value" },
      series: [{ type: "line", data: series.map((point) => point.value), smooth: true }],
      grid: { left: 42, right: 16, top: 36, bottom: 32 },
    });

    const resize = () => chart.resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [title, series]);

  return <div ref={chartRef} className="metric-chart" />;
}
```

Adapt the styling and chart options to the actual UI, but keep the lifecycle correct.

## 16. UX States

Implement visual states for:

- loading
- empty
- error
- success
- disconnected backend placeholder
- no metrics
- no logs
- no artifacts
- invalid chart config

Empty states should tell the user what to do next.

Examples:

```text
No metrics logged yet.
Start a worker run or log metrics through the Python client.
```

```text
No artifacts uploaded.
Artifacts such as checkpoints, reports, or ZIP bundles will appear here.
```

## 17. Responsive Behavior

Primary targets:

- desktop
- laptop
- medium screens

Mobile support may be basic.

Responsive requirements:

- sidebar can collapse or become narrow
- chart grid changes from 3 columns to 2 to 1
- tables horizontally scroll
- page header actions wrap
- chart cards remain readable

## 18. Implementation Workflow

Follow this workflow when building or refactoring the frontend.

### Step 1: Inspect the project

Check:

- package manager
- Vite setup
- existing `src/` structure
- existing CSS structure
- existing routing
- installed dependencies
- whether ECharts is already installed

### Step 2: Set up routing and layout

Implement:

- `App.jsx`
- React Router routes
- fake auth state
- `AppLayout`
- `TopBar`
- `SidebarNav`
- `Breadcrumbs`

### Step 3: Create mock data

Implement:

```text
src/mockData.js
```

It should contain enough data for all pages and states.

### Step 4: Build shared UI components

Implement common components before page-specific components:

- buttons
- status badges
- tabs
- toolbars
- cards
- empty states
- tables
- JSON preview
- action menu

### Step 5: Build pages

Implement pages in this order:

1. Login
2. Projects
3. Project Detail
4. Run Detail
5. Project Charts / Chart Builder
6. Settings

### Step 6: Build run workspace

Prioritize the run detail page:

- charts tab
- overview tab
- logs tab
- tables tab
- images tab
- artifacts tab
- events tab

### Step 7: Polish CSS

Ensure:

- dense spacing
- consistent borders
- consistent status colors
- readable tables
- chart cards align cleanly
- top bar/sidebar feel like one product shell

### Step 8: Validate manually

Check:

- all routes render
- tabs switch
- chart cards render
- no console errors
- no broken layout at medium width
- no TypeScript files were introduced
- no forbidden libraries were used
- app can run with Vite

## 19. Output Expectations

When implementing, produce actual frontend code, not a review report.

Expected output is a working frontend prototype with files such as:

```text
src/main.jsx
src/App.jsx
src/mockData.js
src/routes/*.jsx
src/components/**/*.jsx
src/styles/*.css
```

If creating a new app from scratch, include:

```text
package.json
index.html
vite.config.js
src/
```

Also include or update a short README section explaining:

- how to install dependencies
- how to run the frontend
- that the app uses mock data only
- that there is no backend integration yet

## 20. Acceptance Criteria

The frontend implementation is acceptable when:

- The app runs locally through Vite.
- The app uses React with plain JavaScript.
- The app uses React Router.
- The app uses Apache ECharts directly.
- The app uses plain CSS.
- No TypeScript is introduced.
- No Tailwind is introduced.
- No component/CSS framework is introduced.
- No real backend calls are made.
- `/login` works as fake login.
- `/projects` shows projects.
- `/projects/:projectId` shows project runs.
- `/runs/:runId` shows the run workspace.
- The run workspace has Charts, Overview, Logs, Tables, Images, Artifacts, and Events tabs.
- Chart panels render realistic mock metric data.
- Tables, logs, images, artifacts, and events have realistic mock content.
- Empty, loading, and error states exist visually.
- The UI feels like a compact self-hosted ML experiment tracking dashboard.

## 21. Things to Avoid

Do not:

- write an architecture review report
- create `ARCHITECTURE_REVIEW_RESULTS.md`
- implement backend code
- add FastAPI code
- add database code
- add real auth
- add real API calls
- add WebSocket code
- add TypeScript
- add Tailwind
- add a component framework
- copy MLflow code
- copy WandB UI exactly
- over-engineer the prototype
- hide large JSX blocks in route files
- hardcode large mock arrays inside components

## 22. Final Quality Bar

The result should make it easy for the team to visually answer:

1. Does this feel like a useful ML experiment tracking tool?
2. Is the run workspace readable and chart-first?
3. Is navigation between projects, runs, charts, logs, images, artifacts, and events clear?
4. Does the product feel like a lightweight self-hosted MLflow/WandB hybrid?
5. Can this frontend structure later connect to a real backend without being rewritten?
