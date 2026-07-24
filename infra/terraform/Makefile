.PHONY: init validate plan apply fmt docs

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
