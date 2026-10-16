# ECS-level observability (legacy path — #1127)

## Read this before anything else

Per `infra/README.md` and `docs/adr/003-kubernetes-deployment-target.md`:
**production runs on Kubernetes.** The Prometheus/Grafana/Loki stack in
`infra/monitoring/` scrapes the cluster. This directory documents the *other*
path, the one the `ecs_execution` and `ecs_task` IAM roles in
`infra/terraform/modules/iam/` were built for.

Nothing in this repository runs on ECS today. There is no committed task
definition, no service, and no Terraform root that instantiates ECS resources.
The IAM roles exist; the workload does not. That gap is exactly what made this
audit ambiguous, and it is the evidence cited by #1128 for declaring ECS legacy.

## What ECS-level observability would require

The app-level metrics the Prometheus stack already scrapes (HTTP request rate,
latency, error ratio) are not ECS metrics. Container Insights is the only
supported way to get task-level CPU, memory, network and storage metrics for
ECS, and it is a separate enablement from the Prometheus stack — enabling one
does not enable the other.

### 1. Enable Container Insights on the cluster

```bash
aws ecs update-cluster-settings \
  --cluster <cluster-name> \
  --settings name=containerInsights,value=enabled
```

Use `enhanced` (the container-aware variant, billed higher) rather than `enabled`
if per-task visibility matters; `enabled` gives basic EC2-level metrics only.

The task definition must also opt in, otherwise the task reports nothing:

```json
"containerInsights": true
```

On an EC2 launch type that additionally requires the ECS-optimized AMI or the
Container Insights agent on the instance. On Fargate there is no agent to
install and `containerInsights: true` on the task definition is sufficient.

### 2. Logs

CloudWatch Logs driver (`awslogs`), one log group per task definition:

```hcl
log_configuration {
  log_driver = "awslogs"
  options = {
    "awslogs-group"         = "/aws/ecs/esustellar"
    "awslogs-region"        = "us-east-1"
    "awslogs-stream-prefix" = "web"
    "mode"                  = "non-blocking"   # do not block the container on log delivery
  }
}
```

`mode = non-blocking` matters: the default `blocking` makes a CloudWatch API
throttle stall the application container itself.

The task execution role needs `logs:CreateLogStream` and `logs:PutLogEvents`
against that log group. The managed `AmazonECSTaskExecutionRolePolicy` grants
these on `resources = ["*"]`; `infra/terraform/modules/iam/` now exposes a
scoped alternative via the `ssm_parameter_arns` / `secretsmanager_secret_arns`
inputs so an ECS deployment does not have to inherit account-wide log access.

### 3. Application metrics

`awslogs` carries log lines, not metrics. Prometheus-format metrics need either:

- CloudWatch Embedded Metric Format (`aws-embedded-metric-format`) from the app,
  plus `PutMetricData` on the task role, or
- a CloudWatch agent sidecar that scrapes the app and republishes.

This is the same `GET /metrics` endpoint (`9464`) the Kubernetes path scrapes
today, so the app-side work is already done for the ECS case.

### 4. Alerting

Container Insights metrics are CloudWatch metrics, not Prometheus metrics, so
`infra/monitoring/prometheus/alert-rules.yaml` does **not** cover them. The
ECS path needs CloudWatch metric alarms and/or an Alertmanager target fed from
CloudWatch, in addition to — not instead of — the Prometheus alert rules.

## Summary of the gap

| Concern | Kubernetes (live) | ECS (legacy) |
| --- | --- | --- |
| Container CPU / memory / restarts | Prometheus + Grafana | Container Insights — not enabled |
| Task-level metrics | n/a | Container Insights — not enabled |
| Logs | Promtail → Loki | `awslogs` driver — no log groups defined |
| Alerting | `alert-rules.yaml` | CloudWatch alarms — none defined |
| Dashboards | `infra/monitoring/grafana/dashboards/` | none |
| IAM | n/a | `ecs_execution` / `ecs_task` roles exist, no workload |

## If ECS is ever revived

1. Confirm the decision in an ADR first — reviving it contradicts ADR 003 and
   needs a superseding record, not a stray task definition.
2. Update `infra/README.md`'s authoritative statement and `infra/monitoring/ecs/`
   with what was actually enabled.
3. Treat steps 1–4 above as the minimum, not a menu.