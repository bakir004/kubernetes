#!/bin/bash
# Script to regenerate ArgoCD manifests from Helm chart
# Run this whenever you update values.yaml

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

CHART_VERSION="${1:-7.7.11}"  # Default to latest stable, or pass version as argument

echo "Updating Helm repos..."
helm repo add argo https://argoproj.github.io/argo-helm 2>/dev/null || true
helm repo update argo

echo "Templating ArgoCD chart version ${CHART_VERSION}..."
helm template argocd argo/argo-cd \
  --namespace argocd \
  --version "$CHART_VERSION" \
  --include-crds \
  -f values.yaml \
  > manifests.yaml

echo "Done! manifests.yaml has been updated."
echo "Lines: $(wc -l < manifests.yaml)"
echo ""
echo "Don't forget to commit and push your changes for GitOps sync!"

