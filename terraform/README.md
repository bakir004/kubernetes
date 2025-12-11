# Terraform - Hetzner Cloud k3s Setup

This Terraform configuration creates a k3s cluster on Hetzner Cloud.

## Prerequisites

1. **Hetzner Cloud Account**

   - Sign up at https://www.hetzner.com/cloud
   - Create an API token

2. **Terraform installed**

   ```bash
   # macOS
   brew install terraform

   # Or download from https://www.terraform.io/downloads
   ```

3. **SSH Key**
   - Have an SSH key at `~/.ssh/id_rsa.pub`
   - Or update the path in `main.tf`

## Setup

1. **Initialize Terraform:**

   ```bash
   cd terraform
   terraform init
   ```

2. **Create terraform.tfvars:**

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars and add your Hetzner Cloud token
   ```

3. **Plan the deployment:**

   ```bash
   terraform plan
   ```

4. **Apply (creates the cluster):**

   ```bash
   terraform apply
   ```

5. **Get kubeconfig:**

   ```bash
   # Get master IP
   terraform output master_ip

   # Copy kubeconfig
   ssh root@$(terraform output -raw master_ip) 'cat /etc/rancher/k3s/k3s.yaml' > ~/.kube/k3s-config

   # Update server IP in kubeconfig
   export KUBECONFIG=~/.kube/k3s-config
   kubectl config set-cluster default --server https://$(terraform output -raw master_ip):6443
   ```

## What Gets Created

- **1 Master node** (k3s-master)
- **N Worker nodes** (default: 2, configurable)
- **Private network** (10.0.0.0/16)
- **Firewall rules** (SSH, k3s, HTTP/HTTPS)
- **Automatic k3s installation** on all nodes

## Configuration

Edit `terraform.tfvars`:

- `worker_count`: Number of worker nodes
- `server_type`: Hetzner server size (cx21 = 2 vCPU, 4GB RAM)
- `location`: Datacenter location

## Costs

**Example (cx21 servers):**

- Master: ~€4.15/month
- 2 Workers: ~€8.30/month
- **Total: ~€12.45/month**

## Destroying

```bash
terraform destroy
```

This will delete all created resources.

## Adding More Workers Later

1. Update `worker_count` in `terraform.tfvars`
2. Run `terraform apply`

## Troubleshooting

**Check master status:**

```bash
ssh root@$(terraform output -raw master_ip) 'systemctl status k3s'
```

**Check workers:**

```bash
ssh root@$(terraform output -raw worker_ips[0]) 'systemctl status k3s-agent'
```

**View k3s logs:**

```bash
ssh root@$(terraform output -raw master_ip) 'journalctl -u k3s -f'
```
