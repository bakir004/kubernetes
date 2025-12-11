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
