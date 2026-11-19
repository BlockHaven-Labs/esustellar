.PHONY: init validate plan apply fmt docs destroy plan-testnet plan-staging plan-mainnet apply-testnet apply-staging apply-mainnet drift-check verify-state-lock

# Which environment the shared root's remote state is for (testnet/staging/mainnet).
# The per-environment backend config lives in backend/$(ENV).hcl.
ENV ?= testnet

validate:
	@echo "Running Terraform validation..."
	terraform fmt -check -recursive
	terraform init -backend=false -input=false
	terraform validate

plan:
	$(MAKE) plan-$(ENV)

plan-testnet:
	@echo "Planning Terraform changes for testnet..."
	terraform init -input=false -reconfigure -backend-config=backend/testnet.hcl
	terraform plan -input=false -var-file=../../environments/testnet.tfvars -out=tfplan-testnet

plan-staging:
	@echo "Planning Terraform changes for staging..."
	terraform init -input=false -reconfigure -backend-config=backend/staging.hcl
	terraform plan -input=false -var-file=../../environments/staging.tfvars -out=tfplan-staging

plan-mainnet:
	@echo "Planning Terraform changes for mainnet..."
	terraform init -input=false -reconfigure -backend-config=backend/mainnet.hcl
	terraform plan -input=false -var-file=../../environments/mainnet.tfvars -out=tfplan-mainnet

apply:
	$(MAKE) apply-$(ENV)

apply-testnet:
	@test -f tfplan-testnet || { echo "No testnet plan found; run 'make plan-testnet' and review it first."; exit 1; }
	@echo "Applying Terraform changes for testnet..."
	terraform apply -input=false -auto-approve tfplan-testnet

apply-staging:
	@test -f tfplan-staging || { echo "No staging plan found; run 'make plan-staging' and review it first."; exit 1; }
	@echo "Applying Terraform changes for staging..."
	terraform apply -input=false -auto-approve tfplan-staging

apply-mainnet:
	@test -f tfplan-mainnet || { echo "No mainnet plan found; run 'make plan-mainnet' and review it first."; exit 1; }
	@echo "Applying Terraform changes for mainnet..."
	terraform apply -input=false -auto-approve tfplan-mainnet

fmt:
	terraform fmt -recursive

destroy:
	terraform init -backend=false -input=false
	terraform destroy -auto-approve

# #998: Fail when the live state has drifted from this configuration.
# Requires AWS credentials; expects the S3 backend to already be bootstrapped.
# ENV selects which environment's remote state (and backend/*.hcl) to check.
drift-check:
	terraform init -input=false -backend=true -reconfigure -backend-config=backend/$(ENV).hcl
	terraform plan -detailed-exitcode -input=false -no-color || (code=$$?; \
		if [ $$code -eq 2 ]; then echo "DRIFT DETECTED ($(ENV))"; exit 1; fi; \
		exit $$code)

# #998: Verify the DynamoDB lock table blocks concurrent operations.
# Requires AWS credentials; expects the S3 backend to already be bootstrapped.
# The simulated lock's table/key must match backend/$(ENV).hcl.
verify-state-lock:
	BACKEND_CONFIG=backend/$(ENV).hcl \
	LOCK_TABLE_NAME=esustellar-terraform-locks \
	STATE_BUCKET_NAME=esustellar-terraform-state \
	STATE_KEY=infra/terraform/$(ENV)/terraform.tfstate \
	./scripts/verify-state-lock.sh
