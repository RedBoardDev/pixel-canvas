.PHONY: deploy deploy-backend deploy-frontend plan destroy init import clean outputs build

# Deploy everything (backend + trigger frontend rebuild)
deploy: deploy-backend deploy-frontend

# Deploy backend infrastructure via Terraform
deploy-backend: build
	cd infra && terraform apply -auto-approve

# Trigger Amplify frontend build
deploy-frontend:
	@APP_ID=$$(cd infra && terraform output -raw amplify_app_id 2>/dev/null); \
	if [ -z "$$APP_ID" ]; then \
		echo "Error: amplify_app_id not found. Run 'make deploy-backend' first."; \
		exit 1; \
	fi; \
	REGION=$$(grep 'aws_region' infra/terraform.tfvars 2>/dev/null | sed 's/.*"\(.*\)".*/\1/' || echo "eu-west-3"); \
	echo "Triggering Amplify build for app $$APP_ID (branch: main)..."; \
	aws amplify start-job --app-id "$$APP_ID" --branch-name main --job-type RELEASE --region "$$REGION" --output json; \
	echo "Build triggered. Monitor in the Amplify console."

# Build Go Lambda binaries
build:
	bash infra/scripts/build-lambdas.sh

# Show Terraform plan (builds first to avoid archive errors)
plan: build
	cd infra && terraform plan

# Initialize Terraform (run once, or after adding providers)
init:
	cd infra && terraform init -upgrade

# Import existing AWS resources into Terraform state
import: build
	bash infra/scripts/import-existing.sh

# Show deployment outputs
outputs:
	cd infra && terraform output

# Destroy ALL infrastructure (backend + frontend)
destroy:
	cd infra && terraform destroy

# Clean build artifacts (does NOT destroy AWS resources)
clean:
	rm -rf infra/.build
	@echo "Build artifacts cleaned."
