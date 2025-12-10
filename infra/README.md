# Multi-Environment Setup

This directory contains Kubernetes manifests for 3 environments: **test**, **preprod**, and **prod**.

## Structure

```
infra/
├── base/                    # Base manifests (shared across all environments)
│   ├── backend.yaml
│   ├── frontend.yaml
│   └── kustomization.yaml
└── overlays/                # Environment-specific configurations
    ├── test/               # Test environment
    ├── preprod/            # Pre-production environment
    └── prod/               # Production environment
```

## Environments

### Test

- **Namespace**: `test`
- **Replicas**: 1 backend, 1 frontend
- **Hostnames**:
  - Frontend: `frontend.local`
  - Backend: `backend.local`

### Preprod

- **Namespace**: `preprod`
- **Replicas**: 2 backend, 2 frontend
- **Hostnames**:
  - Frontend: `frontend.preprod.local`
  - Backend: `backend.preprod.local`

### Prod

- **Namespace**: `prod`
- **Replicas**: 3 backend, 3 frontend
- **Hostnames** (with TLS):
  - Frontend: `cluster.bakircinjarevic.com` (HTTPS)
  - Backend: `api.cluster.bakircinjarevic.com` (HTTPS)
- **TLS**: Automatic certificates via cert-manager + Let's Encrypt

## Usage

### Apply with Kustomize

**Test:**

```bash
kubectl apply -k infra/overlays/test
```

**Preprod:**

```bash
kubectl apply -k infra/overlays/preprod
```

**Prod:**

```bash
kubectl apply -k infra/overlays/prod
```

### View generated manifests

```bash
# Test
kubectl kustomize infra/overlays/test

# Preprod
kubectl kustomize infra/overlays/preprod

# Prod
kubectl kustomize infra/overlays/prod
```

## ArgoCD Integration

ArgoCD applications are configured in the `argo/` directory:

- `test-app.yaml` - Watches `infra/overlays/test`
- `preprod-app.yaml` - Watches `infra/overlays/preprod`
- `prod-app.yaml` - Watches `infra/overlays/prod`

Apply ArgoCD applications:

```bash
kubectl apply -f argo/test-app.yaml
kubectl apply -f argo/preprod-app.yaml
kubectl apply -f argo/prod-app.yaml
```

## Customizing Environments

To change environment-specific settings, edit the `kustomization.yaml` in each overlay:

- **Replicas**: Change `replicas` section
- **Image tags**: Change `images` section
- **Hostnames**: Edit `patchesStrategicMerge` section
- **Backend URLs**: Edit the ConfigMap patch in `patchesStrategicMerge`

## Adding New Environments

1. Create new overlay directory: `infra/overlays/new-env/`
2. Copy `kustomization.yaml` from another overlay
3. Modify namespace, replicas, hostnames, etc.
4. Create ArgoCD application in `argo/new-env-app.yaml`
