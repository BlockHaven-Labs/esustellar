output "ecs_execution_role_arn" {
  description = "ARN of the ECS execution role"
  value       = aws_iam_role.ecs_execution.arn
}

# #1124: surfaces exactly which secrets/parameters the ECS execution role can
# read, so the grant can be reviewed in `terraform plan` without diffing the
# whole policy document.
output "ecs_execution_secret_access" {
  description = "Secrets Manager secret ARNs and SSM parameter ARNs readable by the ECS execution role (empty lists when the ECS secret-injection path is unused)"
  value = {
    secretsmanager_secret_arns = var.secretsmanager_secret_arns
    ssm_parameter_arns         = var.ssm_parameter_arns
  }
  sensitive = true
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role for application workloads"
  value       = aws_iam_role.ecs_task.arn
}

output "cicd_role_arn" {
  description = "ARN of the CI/CD pipeline role"
  value       = aws_iam_role.cicd.arn
}

# #1302: workload roles are exported so each deployment can reference only its
# own role instead of falling back to the shared ecs_task role.
output "event_indexer_role_arn" {
  description = "ARN of the least-privilege event-indexer role (S3 + KMS)"
  value       = aws_iam_role.event_indexer.arn
}

output "balance_exporter_role_arn" {
  description = "ARN of the balance-exporter role; carries no AWS permissions"
  value       = aws_iam_role.balance_exporter.arn
}
