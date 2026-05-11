# Architecture Review Results

> Analyzed on: 2026-05-11
> Project: `mlwarden/frontend`
> Total components analyzed: 51
> Issues found: 3 fixed

## Summary

The frontend already has a clear page/layout/component split, with each protected page composing `AppLayout` directly. The main architecture gaps were that mock backend access leaked into page and presentational components, one layout component still carried a router-coupled `<Outlet />` fallback, and `ProjectDetailPage` mixed page composition with several unnamed UI sections.

## Issues

### FE-ARCH-001: Mock Data Access Bypassed The API Boundary

**Severity**: High
**Principle**: Missing API Abstraction
**Location**: `mlwarden/frontend/src/routes/ProjectsPage.jsx`, `mlwarden/frontend/src/routes/RunDetailPage.jsx`, `mlwarden/frontend/src/components/projects/ProjectTable.jsx`

Several pages and project components imported `mockData.js` directly, so data retrieval, aggregation, and rendering were coupled. That makes the eventual REST/WebSocket API swap harder because mock-data details would need to be removed from multiple rendering components.

#### Current (Bad)

```jsx
import { projects } from '../mockData.js'
import { getProjectStats } from '../../mockData.js'

const filteredProjects = projects.filter((project) => matchesQuery(project))
const stats = getProjectStats(project.id)
```

#### Fixed (Good)

```jsx
import { trackerApi } from '../api/TrackerApi.js'

const projects = useMemo(() => trackerApi.listProjects(), [])
const summary = useMemo(() => trackerApi.getProjectSummary(), [])

<ProjectTable projects={filteredProjects} />
```

**Why this is better**: `TrackerApi` is now the single mock API boundary, so components receive prepared props and do not know where project/run data comes from.

---

### FE-ARCH-002: `AppLayout` Had A Router-Coupled Fallback

**Severity**: Medium
**Principle**: Missing Layout
**Location**: `mlwarden/frontend/src/components/layout/AppLayout.jsx`

The app correctly composes `AppLayout` inside pages, but `AppLayout` still imported `Outlet` and rendered it as a fallback. That leaves the layout component partially coupled to React Router and weakens the self-contained page pattern required by the review guide.

#### Current (Bad)

```jsx
import { Outlet } from 'react-router-dom'

<main className="workspace">
  {children || <Outlet />}
</main>
```

#### Fixed (Good)

```jsx
<main className="workspace">
  {children}
</main>
```

**Why this is better**: `AppLayout` is now a framework-agnostic shell composed by each page, while routing remains isolated in the router and `ProtectedRoute`.

---

### FE-ARCH-003: `ProjectDetailPage` Mixed Page Composition With Inline Sections

**Severity**: Medium
**Principle**: SLA Violation
**Location**: `mlwarden/frontend/src/routes/ProjectDetailPage.jsx`

`ProjectDetailPage` mixed high-level domain components with raw tag markup, metric cards, filter controls, and saved chart card rendering. That made the page harder to scan and pushed section-specific structure into the page body.

#### Current (Bad)

```jsx
<div className="tag-row">
  {project.tags.map((item) => <span className="tag" key={item}>{item}</span>)}
</div>
<div className="metric-grid">
  <MetricCard label="Runs" value={stats.runs} detail="total" />
</div>
<Toolbar>{/* filter controls */}</Toolbar>
<section className="saved-charts">{/* chart card map */}</section>
```

#### Fixed (Good)

```jsx
<ProjectTags tags={project.tags} />
<ProjectMetricSummary stats={project.stats} />
<ProjectRunFilters {...filterProps} />
<RunTable runs={filteredRuns} />
<SavedChartsSection project={project} savedCharts={savedCharts} previewSeries={previewSeries} />
```

**Why this is better**: The page now reads as a composition of named project-detail sections, and each section owns its local markup.

## Recommendations Summary

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Mock data access bypassed the API boundary | Medium | High |
| 2 | `ProjectDetailPage` mixed page composition with inline sections | Medium | Medium |
| 3 | `AppLayout` had a router-coupled fallback | Low | Medium |

## Architecture Health Score

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Single Level of Abstraction | 4 | Page composition is clearer after extracting `ProjectDetailPage` sections. |
| Component API Design | 4 | Project table and summary cards now receive prepared props. |
| Data Flow Clarity | 4 | Pages/providers consume the API boundary; presentational components no longer import project mock data. |
| API Abstraction Layer | 4 | `TrackerApi` centralizes the prototype data source and can be replaced by REST calls later. |
| App Layout / Shell | 5 | Pages compose `AppLayout` directly; no layout-level `<Outlet />` remains. |
| Code Duplication | 4 | Some small repeated table/tag patterns remain acceptable for the current prototype. |
| Composition Patterns | 4 | Existing components use simple props/callbacks without wrapper-heavy patterns. |
| **Overall** | 4 | The frontend is in good architectural shape for a mock-data prototype and now has a cleaner migration path to the real API. |
