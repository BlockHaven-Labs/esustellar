.PHONY: init validate plan apply fmt destroy drift-check verify-state-lock

validate:
	@echo "Running Terraform validation..."
	terraform fmt -check -recursive
	terraform init -backend=false -input=false
	terraform validate

plan:
	@echo "Planning Terraform changes..."
	terraform init -backend=false -input=false
	terraform plan -out=tfplan

apply:
	@echo "Applying Terraform changes..."
	terraform apply -auto-approve tfplan

fmt:
	terraform fmt -recursive

destroy:
	terraform init -backend=false -input=false
	terraform destroy -auto-approve

# #998: Fail when the live state has drifted from this configuration.
# Requires AWS credentials; expects the S3 backend to already be bootstrapped.
drift-check:
	terraform init -input=false -backend=true
	terraform plan -detailed-exitcode -input=false -no-color || (code=$$?; \
		if [ $$code -eq 2 ]; then echo "DRIFT DETECTED"; exit 1; fi; \
		exit $$code)

# #998: Verify the DynamoDB lock table blocks concurrent operations.
# Requires AWS credentials; expects the S3 backend to already be bootstrapped.
verify-state-lock:
	./scripts/verify-state-lock.sh