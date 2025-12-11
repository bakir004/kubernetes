#!/bin/bash
set -e

MASTER_IP="${master_public_ip}"
TOKEN="${token}"

# Update system
apt-get update
apt-get upgrade -y

# Wait for master k3s to be ready (retry logic)
echo "Waiting for master k3s to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -k -s https://${MASTER_IP}:6443 > /dev/null 2>&1; then
    echo "Master k3s is ready!"
    break
  fi
  echo "Master not ready yet, waiting... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 10
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "ERROR: Master k3s did not become ready in time"
  exit 1
fi

# Install k3s as worker
echo "Installing k3s worker..."
curl -sfL https://get.k3s.io | K3S_URL=https://${MASTER_IP}:6443 K3S_TOKEN=${TOKEN} sh -

echo "K3s worker installed and joined to cluster!"

