# Create namespace

kubectl create namespace monitoring

# Install Loki stack with Grafana

helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm install loki-stack grafana/loki-stack \
 --namespace monitoring \
 --set grafana.enabled=true \
 --set promtail.enabled=true \
 --set loki.enabled=true

# Apply Grafana Ingress

kubectl apply -f infra/grafana-ingress.yaml

# Access Grafana

# Add to /etc/hosts: <INGRESS_IP> grafana.local

# Then open: http://grafana.local

# Default user: admin

# Password: (get from secret)

kubectl get secret loki-stack-grafana -n monitoring -o jsonpath="{.data.admin-password}" | base64 -d && echo

=======================================

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
 --namespace monitoring \
 --set grafana.enabled=false \
 --set prometheus.enabled=true

# Add Prometheus as data source to Grafana

# Option 1: Via UI (recommended)

# 1. Go to http://grafana.local

# 2. Click Configuration (gear icon) → Data Sources

# 3. Click "Add data source"

# 4. Select "Prometheus"

# 5. Set URL: http://prometheus-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090

# 6. Click "Save & Test"

# Option 2: Via ConfigMap (if Grafana supports auto-discovery)

# kubectl apply -f infra/monitoring/prometheus-datasource.yaml
