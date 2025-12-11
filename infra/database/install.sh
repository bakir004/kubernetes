#!/bin/bash
# Installation script for CloudNativePG operator and PostgreSQL clusters

set -e

echo "🚀 Installing CloudNativePG Operator and PostgreSQL Clusters"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Add Helm repository
echo -e "${YELLOW}📦 Adding CloudNativePG Helm repository...${NC}"
helm repo add cloudnative-pg https://cloudnative-pg.github.io/charts
helm repo update

# Step 2: Install operator
echo -e "${YELLOW}⚙️  Installing CloudNativePG operator...${NC}"
helm install cnpg cloudnative-pg/cloudnative-pg \
  --namespace cnpg-system \
  --create-namespace \
  -f operator-values.yaml

echo -e "${GREEN}✅ Waiting for operator to be ready...${NC}"
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=cloudnative-pg \
  -n cnpg-system \
  --timeout=300s

# Step 3: Create namespaces if they don't exist
echo -e "${YELLOW}📁 Creating namespaces...${NC}"
kubectl create namespace preprod --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace prod --dry-run=client -o yaml | kubectl apply -f -

# Step 4: Create secrets for database credentials
echo -e "${YELLOW}🔐 Creating database credentials secrets...${NC}"

# Preprod secret
if ! kubectl get secret postgres-preprod-credentials -n preprod &>/dev/null; then
  PREPROD_PASSWORD=$(openssl rand -base64 32)
  kubectl create secret generic postgres-preprod-credentials \
    --namespace preprod \
    --from-literal=username=appuser \
    --from-literal=password="${PREPROD_PASSWORD}"
  echo -e "${GREEN}✅ Created preprod credentials (password saved in secret)${NC}"
else
  echo -e "${YELLOW}⚠️  Preprod credentials secret already exists${NC}"
fi

# Prod secret
if ! kubectl get secret postgres-prod-credentials -n prod &>/dev/null; then
  PROD_PASSWORD=$(openssl rand -base64 32)
  kubectl create secret generic postgres-prod-credentials \
    --namespace prod \
    --from-literal=username=appuser \
    --from-literal=password="${PROD_PASSWORD}"
  echo -e "${GREEN}✅ Created prod credentials (password saved in secret)${NC}"
else
  echo -e "${YELLOW}⚠️  Prod credentials secret already exists${NC}"
fi

# Step 5: Deploy PostgreSQL clusters
echo -e "${YELLOW}🗄️  Deploying PostgreSQL clusters...${NC}"

# Preprod cluster
if ! kubectl get cluster postgresql-preprod -n preprod &>/dev/null; then
  kubectl apply -f cluster-preprod.yaml
  echo -e "${GREEN}✅ Deployed preprod cluster${NC}"
else
  echo -e "${YELLOW}⚠️  Preprod cluster already exists${NC}"
fi

# Prod cluster
if ! kubectl get cluster postgresql-prod -n prod &>/dev/null; then
  kubectl apply -f cluster-prod.yaml
  echo -e "${GREEN}✅ Deployed prod cluster${NC}"
else
  echo -e "${YELLOW}⚠️  Prod cluster already exists${NC}"
fi

# Step 6: Deploy PodMonitors for monitoring (if Prometheus Operator is installed)
echo -e "${YELLOW}📊 Deploying PodMonitors for monitoring...${NC}"

if kubectl get crd podmonitors.monitoring.coreos.com &>/dev/null; then
  kubectl apply -f podmonitor-preprod.yaml
  kubectl apply -f podmonitor-prod.yaml
  echo -e "${GREEN}✅ Deployed PodMonitors${NC}"
else
  echo -e "${YELLOW}⚠️  Prometheus Operator not detected, skipping PodMonitor deployment${NC}"
fi

# Step 7: Wait for clusters to be ready
echo -e "${YELLOW}⏳ Waiting for clusters to be ready (this may take a few minutes)...${NC}"

echo -e "${YELLOW}   Waiting for preprod cluster...${NC}"
kubectl wait --for=condition=ready cluster postgresql-preprod -n preprod --timeout=600s || true

echo -e "${YELLOW}   Waiting for prod cluster...${NC}"
kubectl wait --for=condition=ready cluster postgresql-prod -n prod --timeout=600s || true

# Step 8: Display status
echo -e "\n${GREEN}📊 Cluster Status:${NC}"
echo -e "\n${YELLOW}Preprod:${NC}"
kubectl get cluster postgresql-preprod -n preprod
kubectl get pods -n preprod -l cnpg.io/cluster=postgresql-preprod

echo -e "\n${YELLOW}Prod:${NC}"
kubectl get cluster postgresql-prod -n prod
kubectl get pods -n prod -l cnpg.io/cluster=postgresql-prod

echo -e "\n${GREEN}✅ Installation complete!${NC}"
echo -e "\n${YELLOW}Connection details:${NC}"
echo -e "Preprod RW: postgresql-preprod-rw.preprod.svc.cluster.local:5432"
echo -e "Preprod RO: postgresql-preprod-ro.preprod.svc.cluster.local:5432"
echo -e "Prod RW: postgresql-prod-rw.prod.svc.cluster.local:5432"
echo -e "Prod RO: postgresql-prod-ro.prod.svc.cluster.local:5432"
echo -e "\nTo get passwords:"
echo -e "  kubectl get secret postgres-preprod-credentials -n preprod -o jsonpath='{.data.password}' | base64 -d"
echo -e "  kubectl get secret postgres-prod-credentials -n prod -o jsonpath='{.data.password}' | base64 -d"
