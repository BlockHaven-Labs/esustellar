# #1112 — outputs are shaped for downstream consumers, not just for humans.
#
# There is no RDS/database module yet even though DATABASE_URL is a documented
# secret. These outputs exist so that adding one does NOT require reopening this
# module: an `aws_db_subnet_group` needs subnet IDs *and* their availability
# zones (RDS refuses a subnet group that does not span at least two AZs), and an
# `aws_db_instance` needs a security group ID it can attach and reference from
# its ingress rules.
#
# The per-AZ shapes below are the ones RDS consumes; `private_subnet_ids` alone
# is not enough, because its ordering is `for_each`/count order, not AZ order.

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.this.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "public_subnet_availability_zones" {
  description = "Availability zones of the public subnets, index-aligned with public_subnet_ids"
  value       = aws_subnet.public[*].availability_zone
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "private_subnet_availability_zones" {
  description = "Availability zones of the private subnets, index-aligned with private_subnet_ids. Feed this together with private_subnet_ids into an aws_db_subnet_group — RDS rejects a group covering fewer than two AZs."
  value       = aws_subnet.private[*].availability_zone
}

output "private_subnets_by_az" {
  description = "Private subnets keyed by availability zone ({ \"us-east-1a\" = \"subnet-…\" }). The shape aws_db_subnet_group wants once converted to a list of maps."
  value = {
    for idx, subnet in aws_subnet.private : subnet.availability_zone => subnet.id
  }
}

output "nat_gateway_ips" {
  description = "Public IPs of the NAT gateways"
  value       = aws_eip.nat[*].public_ip
}

output "nat_gateway_ids" {
  description = "IDs of the NAT gateways. Exported so a database module can build an egress-only route table association without reopening this module."
  value       = aws_nat_gateway.this[*].id
}

output "internet_gateway_id" {
  description = "ID of the internet gateway"
  value       = aws_internet_gateway.this.id
}

# --- Security groups (#1112) ---

output "alb_security_group_id" {
  description = "ID of the ALB security group (ingress 80/443 from allowed_ingress_cidrs; egress to the workload group only). Use as the source of any new public-facing security group rule."
  value       = aws_security_group.alb.id
}

output "workload_security_group_id" {
  description = "ID of the workload security group for application workloads in the private subnets. A future RDS module should attach this same group (or reference it from its ingress rule) rather than creating an unconnected group."
  value       = aws_security_group.workload.id
}

output "security_group_ids" {
  description = "All security group IDs created by this module, keyed by logical name. Convenient for callers that want to attach several at once."
  value = {
    alb      = aws_security_group.alb.id
    workload = aws_security_group.workload.id
  }
}

output "flow_log_group_name" {
  description = "Name of the CloudWatch log group receiving VPC flow logs. Empty string when enable_flow_logs is false. Useful for IAM policies that need logs:CreateLogStream access without parsing the ARN."
  value       = length(aws_cloudwatch_log_group.flow_log) > 0 ? aws_cloudwatch_log_group.flow_log[0].name : ""
}