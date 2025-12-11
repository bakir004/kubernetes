#!/bin/bash
set -e

MASTER_IP="${master_ip}"
TOKEN="${token}"

# Update system
apt-get update
apt-get upgrade -y

# Install k3s as master with custom token
curl -sfL https://get.k3s.io | K3S_TOKEN=${TOKEN} INSTALL_K3S_EXEC="--cluster-init --tls-san ${MASTER_IP}" sh -

# Wait for k3s to be ready
sleep 30

# Install kubectl
mkdir -p /usr/local/bin
cp /usr/local/bin/k3s /usr/local/bin/kubectl

# Make kubeconfig readable
chmod 644 /etc/rancher/k3s/k3s.yaml

echo "K3s master installed successfully!"

