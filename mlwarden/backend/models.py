from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

JsonObject = dict[str, Any]


class FlexibleModel(BaseModel):
    model_config = ConfigDict(extra="ignore")


class LoginRequest(FlexibleModel):
    username: str
    password: str


class TokenResponse(FlexibleModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_at: str


class PrincipalResponse(FlexibleModel):
    username: str
    kind: str
    admin: bool = False


class ProjectCreate(FlexibleModel):
    name: str
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    metadata: JsonObject = Field(default_factory=dict)


class ProjectUpdate(FlexibleModel):
    name: str | None = None
    description: str | None = None
    tags: list[str] | None = None
    metadata: JsonObject | None = None


class RunCreate(FlexibleModel):
    name: str | None = None
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    params: JsonObject = Field(default_factory=dict)
    metadata: JsonObject = Field(default_factory=dict)


class RunUpdate(FlexibleModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    tags: list[str] | None = None
    metadata: JsonObject | None = None
    summary: JsonObject | None = None


class RunFinishRequest(FlexibleModel):
    summary: JsonObject = Field(default_factory=dict)


class RunFailRequest(FlexibleModel):
    error_message: str | None = None
    error_type: str | None = None
    traceback: str | None = None


class ParamsPutRequest(FlexibleModel):
    params: JsonObject = Field(default_factory=dict)


class MetricCreate(FlexibleModel):
    name: str
    value: Any
    step: int | None = None
    timestamp: str | None = None
    context: JsonObject = Field(default_factory=dict)


class MetricBatchCreate(FlexibleModel):
    metrics: list[MetricCreate]


class TableColumn(FlexibleModel):
    name: str
    type: str | None = None


class TableReplaceRequest(FlexibleModel):
    columns: list[TableColumn] = Field(default_factory=list)
    rows: list[JsonObject] = Field(default_factory=list)
    metadata: JsonObject = Field(default_factory=dict)


class TableRowsAppendRequest(FlexibleModel):
    rows: list[JsonObject] = Field(default_factory=list)


class LogCreate(FlexibleModel):
    level: str = "info"
    message: str
    timestamp: str | None = None
    context: JsonObject = Field(default_factory=dict)


class ChartCreate(FlexibleModel):
    name: str
    chart_type: str
    config: JsonObject = Field(default_factory=dict)


class ChartUpdate(FlexibleModel):
    name: str | None = None
    chart_type: str | None = None
    config: JsonObject | None = None


class RunComparisonCreate(FlexibleModel):
    name: str
    run_ids: list[str] = Field(default_factory=list)
    primary_metric: str | None = None
    x_axis: Literal["step", "epoch", "timestamp"] = "step"
    chart_settings: JsonObject = Field(default_factory=dict)


class RunComparisonUpdate(FlexibleModel):
    name: str | None = None
    run_ids: list[str] | None = None
    primary_metric: str | None = None
    x_axis: Literal["step", "epoch", "timestamp"] | None = None
    chart_settings: JsonObject | None = None


class RunCompareRequest(FlexibleModel):
    run_ids: list[str] = Field(default_factory=list)
    metrics: list[str] = Field(default_factory=list)
    x_axis: Literal["step", "epoch", "timestamp"] = "step"
    smoothing: float = 0
    aggregation: Literal["none", "mean", "median", "min", "max"] = "none"
    metric_direction: Literal["auto", "maximize", "minimize"] = "auto"
