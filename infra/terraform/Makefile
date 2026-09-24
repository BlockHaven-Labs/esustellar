.PHONY: init validate plan apply fmt docs destroy plan-testnet plan-staging plan-mainnet apply-testnet apply-staging apply-mainnet drift-check verify-state-lock

validate:
	@echo "Running Terraform validation..."
	terraform fmt -check -recursive
	terraform init -backend=false -input=false
	terraform validate

plan:
	@echo "Planning Terraform changes..."
	terraform init -backend=false -input=false
	terraform plan -out=tfplan

plan-testnet:
	@echo "Planning Terraform changes for testnet..."
	terraform init -backend=false -input=false
	terraform plan -var-file=../../environments/testnet.tfvars -out=tfplan-testnet

plan-staging:
	@echo "Planning Terraform changes for staging..."
	terraform init -backend=false -input=false
	terraform plan -var-file=../../environments/staging.tfvars -out=tfplan-staging

plan-mainnet:
	@echo "Planning Terraform changes for mainnet..."
	terraform init -backend=false -input=false
	terraform plan -var-file=../../environments/mainnet.tfvars -out=tfplan-mainnet

apply:
	@echo "Applying Terraform changes..."
	terraform apply -auto-approve tfplan

apply-testnet: plan-testnet
	@echo "Applying Terraform changes for testnet..."
	terraform apply -auto-approve tfplan-testnet

apply-staging: plan-staging
	@echo "Applying Terraform changes for staging..."
	terraform apply -auto-approve tfplan-staging

apply-mainnet: plan-mainnet
	@echo "Applying Terraform changes for mainnet..."
	terraform apply -auto-approve tfplan-mainnet

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