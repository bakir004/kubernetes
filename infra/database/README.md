# Database Setup with CloudNativePG

This directory contains Helm-based configuration for deploying PostgreSQL using the CloudNativePG operator.

## Architecture

CloudNativePG creates PostgreSQL clusters with:

- **Primary instance**: Handles all writes
- **Replica instances**: Automatically replicate data from primary
- **Automatic failover**: If primary fails, a replica is promoted
- **Persistent Volumes**: Each instance gets its own PV for data storage

## Storage Considerations

### k3s Default (local-path)

- Uses local node storage
- **Pros**: Simple, no additional setup
- **Cons**: Data tied to specific nodes, not ideal for production

### Production Options

1. **Longhorn** (Recommended for k3s)

   - Distributed block storage
   - Replicates data across nodes
   - Easy to set up on k3s
   - Install: `kubectl apply -f https://raw.githubusercontent.com/longhorn/longhorn/v1.5.3/deploy/longhorn.yaml`

2. **Hetzner Cloud Volumes** (If using Hetzner)

   - Network-attached storage
   - Requires Hetzner CSI driver
   - Persistent across node failures

3. **NFS**
   - Network file system
   - Requires NFS server

## Installation

### 1. Add CloudNativePG Helm Repository

```bash
helm repo add cloudnative-pg https://cloudnative-pg.github.io/charts
helm repo update
```

### 2. Install CloudNativePG Operator

The operator is cluster-scoped and should be installed once:

```bash
helm install cnpg cloudnative-pg/cloudnative-pg \
  --namespace cnpg-system \
  --create-namespace \
  -f operator-values.yaml
```

Verify installation:

```bash
kubectl get pods -n cnpg-system
kubectl get crds | grep postgresql
```

### 3. Create Database Credentials Secret

Before creating the cluster, create secrets with database credentials:

**Preprod:**

```bash
kubectl create secret generic postgres-preprod-credentials \
  --namespace preprod \
  --from-literal=username=appuser \
  --from-literal=password=$(openssl rand -base64 32)
```

**Prod:**

```bash
kubectl create secret generic postgres-prod-credentials \
  --namespace prod \
  --from-literal=username=appuser \
  --from-literal=password=$(openssl rand -base64 32)
```

### 4. Deploy PostgreSQL Cluster

Since CloudNativePG uses CRDs, we'll create the cluster using `kubectl` with manifests generated from Helm values, or directly apply Cluster manifests.

#### Option A: Using Helm Template (Recommended)

Create a Cluster manifest from values:

**Preprod:**

```bash
# Create the cluster manifest
cat > cluster-preprod.yaml <<EOF
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgresql-preprod
  namespace: preprod
spec:
  instances: 2
  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "512MB"
      effective_cache_size: "2GB"
  storage:
    size: 20Gi
    storageClass: local-path
  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "1Gi"
      cpu: "1000m"
  bootstrap:
    initdb:
      database: appdb
      owner: appuser
      secret:
        name: postgres-preprod-credentials
EOF

kubectl apply -f cluster-preprod.yaml
```

**Prod:**

```bash
# Create the cluster manifest
cat > cluster-prod.yaml <<EOF
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgresql-prod
  namespace: prod
spec:
  instances: 3
  postgresql:
    parameters:
      max_connections: "300"
      shared_buffers: "1GB"
      effective_cache_size: "3GB"
      maintenance_work_mem: "128MB"
      work_mem: "8MB"
      max_wal_size: "8GB"
  storage:
    size: 50Gi
    storageClass: local-path  # Change to longhorn or hcloud-volume for production
  resources:
    requests:
      memory: "1Gi"
      cpu: "1000m"
    limits:
      memory: "2Gi"
      cpu: "2000m"
  bootstrap:
    initdb:
      database: appdb
      owner: appuser
      secret:
        name: postgres-prod-credentials
EOF

kubectl apply -f cluster-prod.yaml
```

### 5. Wait for Cluster to be Ready

```bash
# Check cluster status
kubectl get cluster -n preprod
kubectl get cluster -n prod

# Watch pods
kubectl get pods -n preprod -w
kubectl get pods -n prod -w

# Check cluster details
kubectl describe cluster postgresql-preprod -n preprod
kubectl describe cluster postgresql-prod -n prod
```

### 6. Get Connection Details

```bash
# Get service endpoint
kubectl get svc -n preprod | grep postgresql-preprod
kubectl get svc -n prod | grep postgresql-prod

# Get credentials
kubectl get secret postgres-preprod-credentials -n preprod -o jsonpath='{.data.password}' | base64 -d
kubectl get secret postgres-prod-credentials -n prod -o jsonpath='{.data.password}' | base64 -d
```

## Connection String

The cluster creates a service named `{cluster-name}-rw` (read-write) and `{cluster-name}-ro` (read-only).

**Preprod:**

- Read-Write: `postgresql-preprod-rw.preprod.svc.cluster.local:5432`
- Read-Only: `postgresql-preprod-ro.preprod.svc.cluster.local:5432`

**Prod:**

- Read-Write: `postgresql-prod-rw.prod.svc.cluster.local:5432`
- Read-Only: `postgresql-prod-ro.prod.svc.cluster.local:5432`

**Connection string format:**

```
postgresql://appuser:PASSWORD@postgresql-preprod-rw.preprod.svc.cluster.local:5432/appdb
```

## Monitoring

If Prometheus Operator is installed, you can deploy PodMonitors to scrape metrics from the PostgreSQL clusters. The PodMonitor manifests are included:

**Preprod:**

```bash
kubectl apply -f podmonitor-preprod.yaml
```

**Prod:**

```bash
kubectl apply -f podmonitor-prod.yaml
```

The PodMonitors will automatically discover all pods with the label `cnpg.io/cluster=<cluster-name>` and scrape metrics from the `metrics` port.

## Backup Configuration

For production, configure backups using Barman. See the `cluster-values-prod.yaml` for backup configuration options.

## Troubleshooting

### Check cluster status

```bash
kubectl get cluster -A
kubectl describe cluster <cluster-name> -n <namespace>
```

### Check pods

```bash
kubectl get pods -n <namespace> -l cnpg.io/cluster=<cluster-name>
kubectl logs <pod-name> -n <namespace>
```

### Check persistent volumes

```bash
kubectl get pvc -n <namespace>
kubectl describe pvc <pvc-name> -n <namespace>
```

### Storage issues

If PVCs are pending, check:

1. Storage class exists: `kubectl get storageclass`
2. Node has available storage
3. For production, ensure network storage is properly configured

## Upgrading

To upgrade the operator:

```bash
helm upgrade cnpg cloudnative-pg/cloudnative-pg \
  --namespace cnpg-system \
  -f operator-values.yaml
```

To upgrade PostgreSQL version, edit the Cluster manifest and change the image tag.

## Uninstalling

**Warning**: This will delete all data!

```bash
# Delete clusters first
kubectl delete cluster postgresql-preprod -n preprod
kubectl delete cluster postgresql-prod -n prod

# Delete operator
helm uninstall cnpg -n cnpg-system
```
