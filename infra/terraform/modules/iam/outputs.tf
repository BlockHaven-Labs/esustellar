output "ecs_execution_role_arn" {
  description = "ARN of the ECS execution role"
  value       = aws_iam_role.ecs_execution.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role for application workloads"
  value       = aws_iam_role.ecs_task.arn
}

output "cicd_role_arn" {
  description = "ARN of the CI/CD pipeline role"
  value       = aws_iam_role.cicd.arn
}
