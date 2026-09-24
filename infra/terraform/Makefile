.PHONY: init validate plan apply fmt docs plan-testnet plan-staging plan-mainnet apply-testnet apply-staging apply-mainnet

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
