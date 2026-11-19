variable "project_name" {
  description = "Project name prefix for ECR resources"
  type        = string
  default     = "esustellar"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "image_tag_mutability" {
  description = <<-EOT
    Whether image tags are mutable or immutable. Must be "MUTABLE" or "IMMUTABLE".

    Recommended/enforced per environment:
      - production / staging: "IMMUTABLE" — prevents an already-deployed tag
        (e.g. a release tag or a digest pinned in a k8s manifest) from being
        silently overwritten by a later push.
      - development / preview: "MUTABLE" is acceptable for fast-moving
        `:latest`-style workflows, but "IMMUTABLE" remains the default and
        should only be relaxed deliberately per module instantiation.
  EOT
  type        = string
  default     = "IMMUTABLE"

  validation {
    condition     = contains(["MUTABLE", "IMMUTABLE"], var.image_tag_mutability)
    error_message = "image_tag_mutability must be either \"MUTABLE\" or \"IMMUTABLE\"."
  }

  # #1301: MUTABLE would allow a tag already referenced by a k8s manifest to be
  # overwritten, defeating the point of pinning tags. Non-production may opt in
  # explicitly; production-facing environments may not.
  validation {
    condition = (
      var.image_tag_mutability == "IMMUTABLE" ||
      !contains(["mainnet", "production", "prod", "staging"], lower(var.environment))
    )
    error_message = "image_tag_mutability must be IMMUTABLE in mainnet/production/staging environments."
  }
}

variable "max_image_count" {
  description = "Maximum number of images to retain per repository"
  type        = number
  default     = 30
}

variable "scan_on_push" {
  description = <<-EOT
    Enable vulnerability scanning on image push.

    Recommended/enforced per environment: "true" in every environment,
    including development and preview. Vulnerability scanning has no
    deploy-time cost and disabling it in non-production environments only
    hides findings that would otherwise surface before an image is promoted
    to staging/production. There is no environment for which "false" is
    the recommended value.
  EOT
  type        = bool
  default     = true

  # #1301: enforced in every environment, not just the default. Scanning has no
  # deploy-time cost and disabling it would hide findings until promotion.
  validation {
    condition     = var.scan_on_push
    error_message = "scan_on_push must be true in every environment."
  }
}
