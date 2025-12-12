#!/bin/bash
# Script to access PostgreSQL database directly
# Usage: ./access-db.sh [preprod|prod]

set -e

ENV=${1:-preprod}
NAMESPACE=$ENV

if [ "$ENV" != "preprod" ] && [ "$ENV" != "prod" ]; then
  echo "Error: Environment must be 'preprod' or 'prod'"
  echo "Usage: ./access-db.sh [preprod|prod]"
  exit 1
fi

CLUSTER_NAME="postgresql-${ENV}"
SERVICE_NAME="${CLUSTER_NAME}-rw"

echo "🔍 Finding PostgreSQL pods in namespace: $NAMESPACE"
PODS=$(kubectl get pods -n $NAMESPACE -l cnpg.io/cluster=$CLUSTER_NAME -o jsonpath='{.items[*].metadata.name}')

if [ -z "$PODS" ]; then
  echo "❌ No PostgreSQL pods found for cluster $CLUSTER_NAME"
  exit 1
fi

# Get the first pod (usually the primary)
PRIMARY_POD=$(echo $PODS | awk '{print $1}')
echo "✅ Found pod: $PRIMARY_POD"

# Get database credentials from secret
echo "🔐 Getting database credentials..."
DB_USER=$(kubectl get secret postgres-${ENV}-credentials -n $NAMESPACE -o jsonpath='{.data.username}' | base64 -d)
DB_PASSWORD=$(kubectl get secret postgres-${ENV}-credentials -n $NAMESPACE -o jsonpath='{.data.password}' | base64 -d)

echo ""
echo "📊 Connecting to database..."
echo "   Cluster: $CLUSTER_NAME"
echo "   Namespace: $NAMESPACE"
echo "   Pod: $PRIMARY_POD"
echo "   Database: appdb"
echo "   User: $DB_USER"
echo ""
echo "💡 Tip: Use SQL commands like:"
echo "   SELECT * FROM todos;"
echo "   SELECT COUNT(*) FROM todos;"
echo "   \\dt  (list tables)"
echo "   \\q   (quit)"
echo ""

# Connect to database using psql (use -h localhost to force TCP/IP instead of Unix socket)
kubectl exec -it $PRIMARY_POD -n $NAMESPACE -- \
  psql -h localhost -U $DB_USER -d appdb -c "SELECT * FROM todos;"

echo ""
echo "✅ To open an interactive psql session, run:"
echo "kubectl exec -it $PRIMARY_POD -n $NAMESPACE -- psql -h localhost -U $DB_USER -d appdb"
