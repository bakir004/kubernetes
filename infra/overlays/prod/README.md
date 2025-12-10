# Production Environment - TLS Setup

## Domain Configuration

- **Frontend**: `cluster.bakircinjarevic.com`
- **Backend API**: `api.cluster.bakircinjarevic.com`

## DNS Setup Required

Point your domain DNS records to your Kubernetes ingress IP:

```bash
# Get your ingress IP
kubectl get ingress -n prod

# Add DNS A records:
# cluster.bakircinjarevic.com -> <INGRESS_IP>
# api.cluster.bakircinjarevic.com -> <INGRESS_IP>
```

## Cert-Manager Setup

This setup uses cert-manager with Let's Encrypt for automatic TLS certificates.

### Prerequisites

1. **Install cert-manager** (if not already installed):

   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
   ```

2. **Update email in ClusterIssuer** (already done):
   Email is set to: `bakir.cinjarevic@protonmail.com`

3. **Apply ClusterIssuer** (cluster-scoped, apply separately):
   ```bash
   kubectl apply -f infra/overlays/prod/cert-manager.yaml
   ```

### How It Works

1. Cert-manager watches for Ingress resources with `cert-manager.io/cluster-issuer` annotation
2. Creates a Certificate resource
3. Requests certificate from Let's Encrypt using HTTP-01 challenge
4. Automatically renews certificates before expiration

## Verification

After deployment, check certificate status:

```bash
# Check certificates
kubectl get certificates -n prod

# Check certificate requests
kubectl get certificaterequests -n prod

# Check ingress
kubectl get ingress -n prod
```

## Troubleshooting

If certificates aren't being issued:

1. Check cert-manager logs:

   ```bash
   kubectl logs -n cert-manager -l app=cert-manager
   ```

2. Verify DNS is pointing to ingress IP
3. Ensure ports 80 and 443 are accessible
4. Check certificate status:
   ```bash
   kubectl describe certificate -n prod
   ```
